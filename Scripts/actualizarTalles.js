// actualizarTalles.js
require('dotenv').config({ path: '../.env' }); // ← Carga correctamente desde backend

const mongoose = require('mongoose');
const Product = require('../models/Product'); // Ajustá según tu estructura real

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error("❌ No se encontró MONGO_URL en .env");
    process.exit(1);
}

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const letraSizes = ["S", "M", "L", "XL"];
const numeroSizes = ["38", "40", "42", "44"];
const numeroZapatillas = ["38", "39", "40", "41", "42", "43", "44"];

const categoriasLetra = ["Remeras", "Buzos", "Camperas", "Chombas"];
const categoriasNumero = ["Bermudas", "Pantalones", "Short de baño"];
const categoriaZapatillas = "Zapatillas";

const actualizarProductos = async () => {
    try {
        const productos = await Product.find();

        for (const producto of productos) {
            let hasSize = false;
            let sizeType = null;
            let availableSizes = [];

            const categoria = producto.category?.toLowerCase() || '';
            const nombre = producto.name?.toLowerCase() || '';

            if (categoriasLetra.map(c => c.toLowerCase()).includes(categoria)) {
                hasSize = true;
                sizeType = 'letra';
                availableSizes = letraSizes;
            } else if (categoriasNumero.map(c => c.toLowerCase()).includes(categoria)) {
                hasSize = true;
                sizeType = 'número';
                availableSizes = numeroSizes;
            } else if (categoria === categoriaZapatillas.toLowerCase()) {
                hasSize = true;
                sizeType = 'número';
                availableSizes = numeroZapatillas;
            } else if (categoria === 'accesorios' && nombre.includes('boxer')) {
                hasSize = true;
                sizeType = 'letra';
                availableSizes = letraSizes;
            }

            producto.hasSize = hasSize;
            producto.sizeType = sizeType;
            producto.availableSizes = availableSizes;

            await producto.save();
        }

        console.log("✅ Productos actualizados con talles correctamente.");
    } catch (error) {
        console.error("❌ Error actualizando productos:", error);
    } finally {
        mongoose.disconnect();
    }
};

actualizarProductos();
