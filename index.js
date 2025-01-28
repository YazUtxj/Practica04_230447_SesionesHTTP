import express from "express";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { v4 as uuidv4 } from 'uuid';
import os from "os";
import cors from 'cors';

const app = express();
const PORT = 3500;
//asyc y await son para trabajar con promesas y con la base de datos, es decir espera  a que las consultas se completen para seguir 
// Configurar MongoDB
mongoose.connect("mongodb+srv://12345:12345@yazmincloster.hkvat.mongodb.net/API-AWOS_40_230447?retryWrites=true&w=majority")
  .then(() => console.log("Conectado a MongoDB Atlas"))
  .catch(err => console.error("Error al conectar a MongoDB Atlas:", err));
// Definir esquema y modelo para sesiones
const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    macAddress: { type: String, required: true },
    ip: { type: Object, required: true },
    createdAt: { type: Date, required: true },
    lastAccessed: { type: Date, required: true },
});
const Session = mongoose.model("Session", sessionSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración del intervalo de inactividad (2 minutos = 120,000 ms)
const SESSION_TIMEOUT = 2 * 60 * 1000;

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

// Endpoint para login
app.post("/login", async (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionId = uuidv4();
    const now = moment.tz("America/Mexico_City").toDate();

    const session = new Session({
        sessionId,
        email,
        nickname,
        macAddress,
        ip: getServerNetworkInfo(),
        createdAt: now,
        lastAccessed: now,
    });

    try {
        await session.save();
        res.status(200).json({
            message: "Se ha logeado de manera exitosa !!!",
            sessionId,
        });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar la sesión", error });
    }
});

// Endpoint para logout
app.post("/logout", async (req, res) => {
    const { sessionId } = req.body;

    try {
        const result = await Session.findOneAndDelete({ sessionId });//eliminando la sesion con el metodo

        if (!result) {
            return res.status(404).json({ message: "No se encuentra una sesión activa" });
        }

        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la sesión", error });
    }
});

// Endpoint para actualizar una sesión
app.put("/update", async (req, res) => {
    const { sessionId, email, nickname } = req.body;

    try {
        const session = await Session.findOne({ sessionId });//buscar y actualiza

        if (!session) {
            return res.status(404).json({ message: "No existe una sesión activa" });
        }

        const now = moment.tz("America/Mexico_City");

        // Actualizar campos de la sesión
        if (email) session.email = email;
        if (nickname) session.nickname = nickname;
        session.lastAccessed = now.toDate();

        const connectionTime = now.diff(moment(session.createdAt), 'seconds');
        const inactivityTime = now.diff(moment(session.lastAccessed), 'seconds');

        await session.save();

        res.status(200).json({
            message: "Sesión ha sido actualizada",
            session: {
                ...session._doc,
                connectionTime: `${connectionTime} seconds`,
                inactivityTime: `${inactivityTime} seconds`,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la sesión", error });
    }
});

// Endpoint para listar todas las sesiones
app.get("/listAllSessions", async (req, res) => {
    try {
        const sessions = await Session.find();//
        res.status(200).json({
            message: "Lista de todas las sesiones",
            sessions,
        });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las sesiones", error });
    }
});

// Endpoint para listar sesiones activas
app.get("/listCurrentSessions", async (req, res) => {
    try {
        const now = moment.tz("America/Mexico_City");
        const sessions = await Session.find();

        const activeSessions = sessions.filter(session => {
            const inactivityDuration = now.diff(moment(session.lastAccessed));
            return inactivityDuration <= SESSION_TIMEOUT;
        });

        res.status(200).json({
            message: "Sesiones activas",
            activeSessions,
        });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener sesiones activas", error });
    }
});

// Endpoint de bienvenida
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Bienvenida al API de Control de Sesiones",
        author: "Yazmin Gutierrez Hernandez",
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Servicio iniciando en http://localhost:${PORT}`);
});
