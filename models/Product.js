const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    subCategory: String,
    image: String,
    additionalImages: { type: [String], default: [] },
    stock: Number,
    description: String,

    hasSize: { type: Boolean, default: false },
    sizeType: { type: String, enum: ['letra', 'número', null], default: null },
    availableSizes: { type: [String], default: [] },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
