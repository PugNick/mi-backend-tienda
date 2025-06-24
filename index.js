require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());


const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://n5jhvxqp-5173.brs.devtunnels.ms" // (opcional, si seguís probando desde ahí)
];

// Configurar CORS para permitir credenciales
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true
}));

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

// Conectar a MongoDB
mongoose
    .connect(MONGO_URL)
    .then(() => console.log("📡 Conectado a MongoDB"))
    .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));


// Ruta principal
app.get("/", (req, res) => {
    res.send("¡Bienvenido al backend de mi tienda!");
});

// Importar y usar rutas
const productRoutes = require("./Routes/products");
const authRoutes = require("./Routes/auth"); // Importar rutas de autenticación
const cartRoutes = require("./Routes/cart");
const orderRoutes = require("./Routes/orders");
const shippingRoutes = require("./Routes/shipping");

app.use("/products", productRoutes);
app.use("/auth", authRoutes); // Usar rutas de autenticación
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/api/shipping", shippingRoutes)

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
