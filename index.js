import express from "express";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { v4 as uuidv4 } from 'uuid';
import os from "os";
import cors from 'cors';

const app = express();
const PORT = 3500;

mongoose.connect("mongodb+srv://12345:12345@yazmincloster.hkvat.mongodb.net/API-AWOS_40_230447?retryWrites=true&w=majority")
  .then(() => console.log("Conectado a MongoDB Atlas"))
  .catch(err => console.error("Error al conectar a MongoDB Atlas:", err));

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    macAddress: { type: String, required: true },
    ip: { type: Object, required: true },
    createdAt: { type: Date, required: true },
    lastAccessed: { type: Date, required: true },
    status: { type: String, required: true, default: "active" }
});
const Session = mongoose.model("Session", sessionSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_TIMEOUT = 2 * 60 * 1000;

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
        status: "active"
    });
    try {
        await session.save();
        res.status(200).json({ message: "Se ha logeado de manera exitosa ", sessionId });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar la sesión", error });
    }
});

app.post("/logout", async (req, res) => {
    const { sessionId } = req.body;
    try {
        const result = await Session.findOneAndDelete({ sessionId });
        if (!result) {
            return res.status(404).json({ message: "No se encuentra una sesión activa" });
        }
        res.status(200).json({ message: "Exito al cerrar sesion" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la sesión", error });
    }
});

app.put("/update", async (req, res) => {
    const { sessionId, email, nickname } = req.body;
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ message: "No existe una sesión activa" });
        }
        const now = moment.tz("America/Mexico_City");
        if (email) session.email = email;
        if (nickname) session.nickname = nickname;
        session.lastAccessed = now.toDate();
        await session.save();

        const connectionTime = moment(session.createdAt).fromNow();
        const inactivityTime = "0 segundos (se acaba de actualizar)";

        res.status(200).json({ 
            message: "La sesión ha sido actualizada", 
            session,
            connectionTime,
            inactivityTime
        });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la sesión", error });
    }
});

app.get("/status", async (req, res) => {
    try {
        const now = moment.tz("America/Mexico_City");
        const sessions = await Session.find();
        const formattedSessions = sessions.map(session => {
            const connectionTime = moment(session.createdAt).fromNow();
            const inactivityTime = moment(session.lastAccessed).fromNow();
            return { ...session.toObject(), connectionTime, inactivityTime };
        });
        res.status(200).json({ message: "Estado de las sesiones", sessions: formattedSessions });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el estado de las sesiones", error });
    }
});

app.get("/listCurrentSessions", async (req, res) => {
    try {
        const sessions = await Session.find({ status: "active" });
        if (sessions.length === 0) {
            return res.status(200).json({ message: "No hay sesiones activas" });
        }
        res.status(200).json({ message: "Todas las sesiones activas", sessions });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener todas las sesiones", error });
    }
});

const cleanInactiveSessions = async () => {
    try {
        const now = moment.tz("America/Mexico_City");
        await Session.deleteMany({ lastAccessed: { $lt: now.subtract(2, 'minutes').toDate() } });
    } catch (error) {
        console.error("Error al limpiar sesiones inactivas:", error);
    }
};
setInterval(cleanInactiveSessions, 60 * 1000);

app.listen(PORT, () => {
    console.log(`Servicio iniciando en http://localhost:${PORT}`);
});
