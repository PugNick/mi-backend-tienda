const express = require("express");
const Cart = require("../models/Cart");
const authMiddleware = require("../middlewares/authMiddleware");
const Order = require('../models/Order');
const Product = require('../models/Product'); // Importar el modelo Product

const router = express.Router();

// Obtener el carrito del usuario autenticado
router.get("/", authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
            await cart.save();
        }
        res.json(cart);
    } catch (error) {
        console.error("Error al obtener el carrito:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// Agregar producto al carrito (ahora incluye talle y cantidad)
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { productId, size, quantity = 1 } = req.body;

        // Buscar el producto para verificar si requiere talle
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // Si el producto requiere talle y no se envió, devolver un error
        if (product.hasSize && !size) {
            return res.status(400).json({ message: "Este producto requiere un talle" });
        }

        // Si el producto no requiere talle, asignar un valor predeterminado
        const finalSize = product.hasSize ? size : null;

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        const existingItem = cart.items.find(
            item => item.product.toString() === productId && item.size === finalSize
        );

        if (existingItem) {
            existingItem.quantity += quantity; // Incrementar la cantidad
        } else {
            cart.items.push({ product: productId, quantity, size: finalSize }); // Agregar nuevo producto
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error("Error al agregar producto:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// Actualizar cantidad (incluye talle)
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { productId, size, quantity } = req.body;
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: "Carrito no encontrado" });

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (itemIndex === -1) return res.status(404).json({ message: "Producto no encontrado" });

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// Remover producto (incluye talle)
router.post("/remove", authMiddleware, async (req, res) => {
    try {
        const { productId, size } = req.body;
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: "Carrito no encontrado" });

        // Filtrar el producto a eliminar
        cart.items = cart.items.filter(
            item => !(item.product.toString() === productId && item.size === size)
        );

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error("Error al remover producto:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// Procesar el pago

router.post("/checkout", authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }
        if (cart.items.length === 0) {
            return res.status(400).json({ message: "El carrito está vacío" });
        }
        if (cart.paid) {
            return res.status(400).json({ message: "Este carrito ya fue pagado" });
        }

        // Calcular el total de la compra
        const totalAmount = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

        // Crear una nueva orden en el historial de compras
        const newOrder = new Order({
            user: cart.user,
            items: cart.items,
            totalAmount
        });
        await newOrder.save();

        // Vaciar el carrito
        cart.items = [];
        cart.paid = false; // Reiniciar el estado para futuras compras
        await cart.save();

        res.json({ message: "Pago exitoso y orden creada", order: newOrder });
    } catch (error) {
        console.error("Error en el pago:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// Aumentar cantidad (incluye talle)
router.post("/increase", authMiddleware, async (req, res) => {
    try {
        const { productId, size } = req.body;

        // Buscar el carrito del usuario
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: "Carrito no encontrado" });

        // Buscar el producto en el carrito
        const item = cart.items.find(
            item => item.product.toString() === productId && item.size === size
        );

        if (item) {
            item.quantity += 1; // Incrementar la cantidad
        } else {
            return res.status(404).json({ message: "Producto no encontrado en el carrito" });
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error("Error al aumentar cantidad:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// Disminuir cantidad (incluye talle)
router.post("/decrease", authMiddleware, async (req, res) => {
    try {
        const { productId, size } = req.body;
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: "Carrito no encontrado" });

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (itemIndex > -1) {
            if (cart.items[itemIndex].quantity > 1) {
                cart.items[itemIndex].quantity -= 1;
            } else {
                cart.items.splice(itemIndex, 1);
            }
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.error("Error al disminuir cantidad:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// Vaciar completamente el carrito del usuario
router.post("/clear", authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }

        // Vaciar el carrito
        cart.items = [];
        cart.paid = false;
        await cart.save({ optimisticConcurrency: false });

        res.json({ message: "Carrito vaciado con éxito" });
    } catch (error) {
        console.error("Error al vaciar el carrito:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

module.exports = router;