import express from "express";
import sessions from "express-session";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import { v4 as uuidv4 } from 'uuid';
import os from "os";


const app = express();
const PORT = 3500;

app.use(express.json());  // Asegúrate de usar este middleware
app.use(express.urlencoded({ extended: true }));

// Configuración del middleware de sesión
app.use(sessions({
    secret: "p04-YGH#yghyjdjhc-SesionesHTTPS",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 5 * 60 * 1000 }
}));
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
// Función de utilidad que permitirá acceder a la información de la interfaz de red en este caso (LAN)
const getClienteIP = (req) => {
    return (
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket?.remoteAddress
    );
};

// Login Endpoint
app.post("/login", (req, res) => {
 //   console.log(req.body);  // Añadir esta línea para verificar los datos que llegan

    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Se esperan campos requeridos" });
    }

    // Generar un ID de sesión único
    const sessionId = uuidv4();
    const now = new Date();

    // Guardar los datos de la sesión en req.session
    req.session.sessionId = sessionId;
    req.session.email = email;
    req.session.nickname = nickname;
    req.session.macAddress = macAddress;
    req.session.ip = getServerNetworkInfo();
    req.session.createdAt = now;
    req.session.lastAccessed = now;

    res.status(200).json({
        message: "Se ha logeado de manera exitosa !!!",
        sessionId
    });
});


// Logout Endpoint
app.post("/logout", (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !req.session.sessionId) {
        return res.status(404).json({ message: "No se encuentra una sesión activa" });
    }

    // Eliminar la sesión de la memoria
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
    });

    res.status(200).json({ message: "Logout successful" });
});

// Actualización de la sesión
app.post("/update", (req, res) => {
    const { sessionId, email, nickname } = req.body;

    if (!sessionId || req.session.sessionId !== sessionId) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    if (email) req.session.email = email;
    if (nickname) req.session.nickname = nickname;

    req.session.lastAccessed = new Date();

    res.status(200).json({
        message: "Sesión ha sido actualizada",
        session: req.session
    });
});

// Endpoint para verificar el estado de la sesión
app.get("/status", (req, res) => {
    const sessionId = req.query.sessionId;

    if (!sessionId || req.session.sessionId !== sessionId) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    res.status(200).json({
        message: "Sesión activa",
        session: req.session
    });
});

// Endpoint para mensaje de bienvenida
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "Bienvenida al API de Control de Sesiones",
        author: "Yazmin Gutierrez Hernandez"
    });
});

// Función de utilidad que permitirá acceder a la información de la interfaz de red


// Inicializamos el servicio
app.listen(PORT, () => {
    console.log(`Servicio iniciando en http://localhost:${PORT}`);
});
