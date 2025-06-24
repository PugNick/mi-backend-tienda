const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            productName: { // Nuevo campo para almacenar el nombre del producto
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            size: {
                type: String,
                required: false
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingMethod: {
        type: String,
        enum: ["retiro_en_local", "envio_domicilio", "punto_retiro"],
        required: true
    },
    shippingDetails: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ["pendiente", "pagado", "enviado", "entregado"],
        default: "pendiente"
    },
    paidAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
