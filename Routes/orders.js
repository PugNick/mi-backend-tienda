const express = require("express");
require('dotenv').config();
const authMiddleware = require("../middlewares/authMiddleware");
const Order = require("../models/Order");
const { MercadoPagoConfig, Preference } = require("mercadopago");
const axios = require("axios");
const Product = require("../models/Product");


const mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});

const preferenceClient = new Preference(mercadopago); // ← esta línea es importante

const router = express.Router();

// 🔹 Crear una nueva orden
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { items, totalAmount, shippingMethod, shippingAddress, pickupPoint } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Usuario no autenticado" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No hay productos en la orden" });
        }

        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({ message: `Producto con ID ${item.product} no encontrado` });
            }

            orderItems.push({
                product: item.product,
                productName: product.name, // Agregar el nombre del producto
                quantity: item.quantity,
                size: item.size || null
            });
        }

        //crear orden
        const newOrder = new Order({
            user: req.user.id,
            items: orderItems,
            totalAmount,
            shippingMethod,
            shippingDetails: {
                userInfo: shippingAddress,
                ...(shippingMethod === "envio_domicilio" && { address: shippingAddress }),
                ...(shippingMethod === "punto_retiro" && { pickupPoint }),
            },
            status: "pendiente",
        });

        await newOrder.save();
        res.status(201).json({ message: "Orden creada correctamente", order: newOrder });

    } catch (error) {
        console.error("Error al crear la orden:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// 🔹 Obtener todas las órdenes del usuario autenticado
router.get("/", authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 }) // Ordenar por fecha de creación
            .populate("items.product", "name price"); // Incluir nombre y precio del producto

        res.json(orders);
    } catch (error) {
        console.error("Error al obtener órdenes:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// 🔹 Obtener detalles de una orden específica
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user.id, // Asegurar que solo el dueño pueda acceder
        }).populate("items.product", "name price image"); // Incluir nombre y precio del producto

        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        res.json(order);
    } catch (error) {
        console.error("Error al obtener la orden:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// 🔹 Actualizar estado de una orden (opcional)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        order.status = status;
        await order.save();
        res.json({ message: "Orden actualizada", order });
    } catch (error) {
        console.error("Error al actualizar la orden:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});

// 🔹 Eliminar una orden (opcional, en caso de cancelación)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        // Validar que el usuario autenticado sea el dueño de la orden
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "No autorizado para eliminar esta orden" });
        }

        await order.deleteOne();
        res.json({ message: "Orden eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar la orden:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});





router.post("/:id/pagar", authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("items.product");
        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        if (order.status === "pagado") {
            return res.status(400).json({ message: "Esta orden ya fue pagada" });
        }

        console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
        console.log("success URL:", `${process.env.FRONTEND_URL}/success`);


        const preference = {
            external_reference: order._id.toString(),
            items: order.items.map(item => ({
                title: item.product.name,
                quantity: item.quantity,
                unit_price: item.product.price,
                currency_id: "ARS"
            })),
            payer: { email: req.user.email || "test_user@test.com" }, // fallback por si falta
            payment_methods: {
                excluded_payment_types: [{ id: "ticket" }],
                installments: 1,
            },
            back_urls: {
                success: `https://vestiree.netlify.app/success`,
                failure: `https://vestiree.netlify.app/failure`,
                pending: `https://vestiree.netlify.app/pending`,
            },
            auto_return: "approved",
        };

        console.log("Payload a MercadoPago:", preference);

        const response = await preferenceClient.create({ body: preference });

        res.status(200).json({
            order_id: order._id,
            init_point: response.init_point,
            message: "Preferencia de pago creada correctamente",
        });

    } catch (error) {
        console.error("Error al crear la preferencia de pago:", error);
        res.status(500).json({ message: "Error en el servidor" });
    }
});


// 🔹 Webhook para recibir notificaciones de Mercado Pago
router.post('/webhook', async (req, res) => {
    const webhookData = req.body;

    console.log('📩 Webhook recibido:', webhookData);

    if (webhookData.type === 'payment') {
        const paymentId = webhookData.data?.id;
        const liveMode = webhookData.live_mode;

        if (!paymentId) {
            console.log('❌ ID de pago no encontrado en el webhook');
            return res.sendStatus(400);
        }

        // 👉 Si es SANDBOX (modo prueba)
        if (!liveMode) {
            console.log('⚠️ Webhook en modo SANDBOX - Simulación.');

            try {
                // Simulamos que el paymentId es el _id de la orden
                const updatedOrder = await Order.findByIdAndUpdate(paymentId, { status: 'pagado' });

                if (updatedOrder) {
                    console.log(`✅ Orden ${paymentId} actualizada a "pagado" (simulación).`);
                } else {
                    console.log(`❌ Orden con ID ${paymentId} no encontrada.`);
                }

                return res.sendStatus(200);
            } catch (err) {
                console.error('🚨 Error al actualizar orden en simulación:', err);
                return res.sendStatus(500);
            }
        }

        // 👉 Si es modo REAL (liveMode === true)
        try {
            const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                },
            });

            const payment = response.data;

            console.log('✅ Pago real recibido:', payment);

            if (payment.status === 'approved') {
                await Order.findByIdAndUpdate(payment.external_reference, { status: 'pagado' });
                console.log('💰 Orden actualizada a "pagado".');
            }

            return res.sendStatus(200);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('❌ Pago no encontrado (puede ser simulado o expirado).');
                return res.sendStatus(200);
            }

            console.error('🚨 Error al consultar el pago real:', error);
            return res.sendStatus(500);
        }
    }

    console.log('📌 Tipo de webhook no manejado:', webhookData.type);
    return res.sendStatus(200);
});


module.exports = router;