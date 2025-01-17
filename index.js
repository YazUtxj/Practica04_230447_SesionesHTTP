import express from "express";
import session from "express-session";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

//middleware de sesiones
app.use(
    session({
        secret: 'p4-YGH#@UTXJ-sesioneshttp',
        resave: false, // No guardar la sesión si no ha sido modificada
        saveUninitialized: false, // No guardar sesiones vacías
        cookie: { maxAge: 2 * 60 * 1000 }, // 2 minutos de duración
    })
);

// iniciar sesión
app.get('/login/:name/:email', (req, res) => {
    if (!req.session.inicio) {
        const sessionID = uuidv4();
        req.session.inicio = new Date();
        req.session.ultimoAcceso = new Date();
        req.session.nombre = req.params.name;
        req.session.idSesion = sessionID;
        req.session.email = req.params.email; 
        res.json({ mensaje: "Sesión iniciada", idSesion: sessionID });
    } else {
        res.send("La sesión ya está activa");
    }
});

// actualizar la sesión
app.get('/update-status', (req, res) => {
    if (req.session.inicio) {
        req.session.ultimoAcceso = new Date();
        res.send("Sesión actualizada");
    } else {
        res.send("No hay sesión activa o la sesión ya caducó");
    }
});

// estado de la sesión
app.get('/listCurrentSessions', (req, res) => {
    if (req.session.inicio) {
        const inicio = moment(req.session.inicio).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
        const ultimoAcceso = moment(req.session.ultimoAcceso).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
        const momentoActual = new Date();
        const tiempoInactividad = Math.floor((momentoActual - new Date(req.session.ultimoAcceso)) / 1000);

        res.json({
            mensaje: "Estado de la sesión",
            idSesion: req.session.idSesion,
            nombre: req.session.nombre,
            inicio,
            ultimoAcceso,
            tiempoInactividad: `${tiempoInactividad} segundos`,
        });
    } else {
        res.send("No hay sesión activa");
    }
});

//  cerrar sesión
app.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).send("Error al cerrar sesión");
            }
            res.send("Sesión cerrada correctamente");
        });
    } else {
        res.send("No hay sesión activa para cerrar");
    }
});

// Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
