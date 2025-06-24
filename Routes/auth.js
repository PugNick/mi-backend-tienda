const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const authMiddleware = require('../middlewares/authMiddleware')


const router = express.Router();

// Registro de usuario
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "El usuario ya existe" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: "Usuario registrado correctamente" });

    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// Inicio de sesión
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        // Verificar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Credenciales inválidas" });
        }

        // Generar token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        // Enviar token en una cookie segura
        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // 🔥 ahora obligatoriamente true (porque DevTunnel es HTTPS)
            sameSite: "None", // 🔥 necesario para compartir cookie entre dominios
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        res.json({ message: "Inicio de sesión exitoso", name: user.name });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// Cerrar sesión
router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Sesión cerrada" });
});

// 🔹 NUEVA RUTA: Obtener datos del usuario autenticado
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name email");
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// 🔹 Editar perfil del usuario autenticado
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        user.name = name;
        user.email = email;

        await user.save();
        res.json({ message: "Perfil actualizado", name: user.name, email: user.email });
    } catch (error) {
        console.error("Error al actualizar el perfil:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password"); // sin contraseña
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener usuario" });
    }
});



module.exports = router;
