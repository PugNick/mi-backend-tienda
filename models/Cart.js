const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    size: {
        type: String,
        required: false // Cambiar a false para que no sea obligatorio
    }
});

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    paid: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);
