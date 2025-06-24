const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; // Leer el token desde la cookie

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado, no hay token" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Guardamos los datos del usuario en la petición
        next(); // Pasamos al siguiente middleware
    } catch (error) {
        console.error("Error al verificar el token:", error);
        res.status(403).json({ message: "Token inválido" });
    }
};

module.exports = authMiddleware;