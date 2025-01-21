import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import moment from 'moment-timezone';

const app = express();

// Configuración de CORS
app.use(cors({
    origin: '*', // Cambia esto por el dominio permitido si no deseas acceso público
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());
app.use(
    session({
        secret: 'P4-YGH#yyjdch-VariablesDeSesion',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 1 día
            secure: false, // Cambiar a true si usas HTTPS
        },
    })
);

let serverMAC;
try {
    serverMAC = await macaddress.one();
} catch (error) {
    serverMAC = 'unknown';
}

const networkInterfaces = Object.values(os.networkInterfaces()).flat();
const serverIP = networkInterfaces.find((iface) => iface.family === 'IPv4' && !iface.internal)?.address || 'unknown';
const serverIPv6 = networkInterfaces.find((iface) => iface.family === 'IPv6' && !iface.internal)?.address || 'unknown';

let sesionesActivas = [];

app.get('/iniciar-sesion', (req, res) => {
    const { fullName, email } = req.query;
    if (!req.session.data) {
        const nuevaSesion = {
            fullName: fullName || 'Usuario Anónimo',
            email: email || 'Correo no proporcionado',
            inicio: new Date(),
            ultimoAcceso: new Date(),
            id: uuidv4(),
            clientIP: req.ip,
            clientMAC: req.headers['x-client-mac'] || 'unknown',
            serverIP,
            serverIPv6,
            serverMAC,
        };
        req.session.data = nuevaSesion;
        sesionesActivas.push(nuevaSesion);

        res.send('Sesión Iniciada');
    } else {
        res.send('La sesión ya está iniciada (ACTIVA)');
    }
});

app.get('/actualizar', (req, res) => {
    if (req.session.data) {
        req.session.data.ultimoAcceso = new Date();
        res.send('Fecha de última consulta actualizada');
    } else {
        res.send('No hay una sesión activa');
    }
});

app.get('/estado-sesion', (req, res) => {
    if (req.session.data) {
        const { inicio, ultimoAcceso, fullName, email } = req.session.data;
        const ahora = new Date();
        const antiguedadMs = ahora - new Date(inicio);
        const horas = Math.floor(antiguedadMs / (1000 * 60 * 60));
        const minutos = Math.floor((antiguedadMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((antiguedadMs % (1000 * 60)) / 1000);

        const tiempoInactividadMs = ahora - new Date(ultimoAcceso);
        const inactividadHoras = Math.floor(tiempoInactividadMs / (1000 * 60 * 60));
        const inactividadMinutos = Math.floor((tiempoInactividadMs % (1000 * 60 * 60)) / (1000 * 60));
        const inactividadSegundos = Math.floor((tiempoInactividadMs % (1000 * 60)) / 1000);

        const inicioCDMX = moment(inicio).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
        const ultimoAccesoCDMX = moment(ultimoAcceso).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');

        res.json({
            mensaje: 'Estado de la sesión',
            sessionID: req.session.data.id,
            fullName,
            email,
            inicio: inicioCDMX,
            ultimoAcceso: ultimoAccesoCDMX,
            antiguedad: `${horas} horas, ${minutos} minutos, ${segundos} segundos`,
            tiempoInactividad: `${inactividadHoras} horas, ${inactividadMinutos} minutos, ${inactividadSegundos} segundos`,
            clientIP: req.session.data.clientIP,
            clientMAC: req.session.data.clientMAC,
            serverIP: req.session.data.serverIP,
            serverIPv6: req.session.data.serverIPv6,
            serverMAC: req.session.data.serverMAC,
        });
    } else {
        res.json({ mensaje: 'No hay una sesión activa' });
    }
});

app.get('/listaSesionesActivas', (req, res) => {
    const sesionesResumidas = sesionesActivas.map((sesion) => ({
        sessionID: sesion.id,
        fullName: sesion.fullName,
        email: sesion.email,
        inicio: moment(sesion.inicio).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        ultimoAcceso: moment(sesion.ultimoAcceso).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
    }));
    res.json(sesionesResumidas);
});

app.get('/cerrar-sesion', (req, res) => {
    if (req.session) {
        const sessionID = req.session.data?.id;
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Error al cerrar la sesión');
            }
            sesionesActivas = sesionesActivas.filter((sesion) => sesion.id !== sessionID);
            res.send('Sesión cerrada correctamente');
        });
    } else {
        res.send('No hay sesión activa para cerrar');
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
