import express from "express";
import moment from "moment-timezone";
import { v4 as uuidv4 } from 'uuid';
import os from "os";
import cors from 'cors';

const app = express();
const PORT = 3500;

app.use(cors()); // CORS
app.use(express.json());  // Asegúrate de usar este middleware
app.use(express.urlencoded({ extended: true }));

// Configuración de sessionStore
const sessionStore = {};

// Función para obtener la IP del servidor
const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();

    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { serverIp: iface.address, serverMac: iface.mac };
            }
        }
    }
};

// Función de utilidad que permitirá acceder a la información de la IP del cliente
const getClienteIP = (req) => {
    return (
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress
    );
};

// Configuración del intervalo de inactividad (2 minutos = 120,000 ms)
const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutos en milisegundos

// Función para eliminar sesiones inactivas
const cleanupInactiveSessions = () => {
    const now = moment.tz("America/Mexico_City");
    for (const sessionId in sessionStore) {
        const session = sessionStore[sessionId];
        const lastAccessed = moment(session.lastAccessed);
        const inactivityDuration = now.diff(lastAccessed);

        if (inactivityDuration > SESSION_TIMEOUT) {
            // Si la sesión ha estado inactiva por más de 2 minutos, eliminarla
            delete sessionStore[sessionId];
            console.log(`Sesión ${sessionId} eliminada por inactividad.`);
        }
    }
};

// Intervalo para limpiar sesiones inactivas
setInterval(cleanupInactiveSessions, 60 * 1000); // Revisa cada minuto

// Login Endpoint
app.post("/login", (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Se esperan campos requeridos" });
    }

    // Generar un ID de sesión único
    const sessionId = uuidv4();
    const now = moment.tz("America/Mexico_City").format(); // Hora en CDMX

    // Guardar los datos de la sesión en sessionStore
    sessionStore[sessionId] = {
        sessionId: sessionId,
        email: email,
        nickname: nickname,
        macAddress: macAddress,
        ip: getServerNetworkInfo(), // Información del servidor
        createdAt: now,
        lastAccessed: now
    };

    // Fecha de inicio de la sesión
    res.status(200).json({
        message: "Se ha logeado de manera exitosa !!!",
        sessionId
    });
});

// Logout Endpoint
app.post("/logout", (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !sessionStore[sessionId]) {
        return res.status(404).json({ message: "No se encuentra una sesión activa" });
    }

    // Eliminar la sesión de la memoria
    delete sessionStore[sessionId];

    res.status(200).json({ message: "Logout successful" });
});

// Actualización de la sesión
app.put("/update", (req, res) => {
    const { sessionId, email, nickname } = req.body;
    if (!sessionId || !sessionStore[sessionId]) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }
    
    const session = sessionStore[sessionId];
    const now = moment.tz("America/Mexico_City");

    // Actualizamos los campos de la sesión
    if (email) session.email = email;
    if (nickname) session.nickname = nickname;
    session.lastAccessed = now.format(); // Actualiza la hora de acceso

    // Tiempo de conexión (diferencia entre createdAt y la hora actual)
    const connectionTime = now.diff(moment(session.createdAt), 'seconds');
    // Tiempo de inactividad (diferencia entre lastAccessed y la hora actual)
    const inactivityTime = now.diff(moment(session.lastAccessed), 'seconds');

    res.status(200).json({
        message: "Sesión ha sido actualizada",
        session: {
            ...session,
            connectionTime: `${connectionTime} seconds`, // Tiempo de conexión
            inactivityTime: `${inactivityTime} seconds`  // Tiempo de inactividad
        }
    });
});

// Endpoint para verificar el estado de la sesión
app.get("/status", (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId || !sessionStore[sessionId]) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    const session = sessionStore[sessionId];
    const now = moment.tz("America/Mexico_City");

    // Tiempo de conexión (diferencia entre createdAt y la hora actual)
    const connectionTime = now.diff(moment(session.createdAt), 'seconds');
    // Tiempo de inactividad (diferencia entre lastAccessed y la hora actual)
    const inactivityTime = now.diff(moment(session.lastAccessed), 'seconds');

    res.status(200).json({
        message: "Sesión activa",
        session: {
            ...session,
            connectionTime: `${connectionTime} seconds`, // Tiempo de conexión
            inactivityTime: `${inactivityTime} seconds`  // Tiempo de inactividad
        }
    });
});

// // Endpoint para obtener sesiones activas
// app.get("/active-sessions", (req, res) => {
//     res.status(200).json({
//         message: "Sesiones activas",
//         activeSessions: Object.values(sessionStore)
//     });
// });

// Endpoint para mensaje de bienvenida
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "Bienvenida al API de Control de Sesiones",
        author: "Yazmin Gutierrez Hernandez"
    });
});

// Inicializamos el servicio
app.listen(PORT, () => {
    console.log(`Servicio iniciando en http://localhost:${PORT}`);
});
