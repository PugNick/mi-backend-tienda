const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Agregar un producto
router.post('/', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).send(newProduct);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los productos' });
    }
});


// Obtener productos para búsqueda
router.get('/search', async (req, res) => {
    const query = req.query.query;

    try {
        const products = await Product.find({
            name: { $regex: query, $options: 'i' } // Cambiar "nombre" por "name"
        }).limit(6);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error al buscar productos' });
    }
});

// Obtener productos con paginación
router.get('/paginated', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    try {
        const total = await Product.countDocuments();
        const skip = (page - 1) * limit;

        const products = await Product.find()
            .sort({ _id: 1 }) // o por cualquier otro campo
            .skip(skip)
            .limit(limit);

        res.json({
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            productsPerPage: limit,
            products
        });
    } catch (error) {
        console.error("Error en paginación:", error);
        res.status(500).json({ message: "Error al obtener productos paginados" });
    }
});

// Obtener productos por categoría con paginación
router.get('/category/:category', async (req, res) => {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    try {
        const filter = { category };
        const total = await Product.countDocuments(filter);
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .skip(skip)
            .limit(limit);

        res.json({
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            productsPerPage: limit,
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("Error al obtener productos por categoría:", error);
        res.status(500).json({ message: "Error al obtener productos por categoría" });
    }
});

// Obtener productos por subcategoría con paginación
router.get('/category/:category/subcategory/:subCategory', async (req, res) => {
    const { category, subCategory } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    try {
        const filter = { category, subCategory };
        const total = await Product.countDocuments(filter);
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .skip(skip)
            .limit(limit);

        res.json({
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            productsPerPage: limit,
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("Error al obtener productos por subcategoría:", error);
        res.status(500).json({ message: "Error al obtener productos por subcategoría" });
    }
});


// Obtener 20 productos aleatorios
router.get('/random', async (req, res) => {
    try {
        const products = await Product.aggregate([{ $sample: { size: 20 } }]);
        res.json(products);
    } catch (error) {
        console.error("Error en /products/random:", error); // <--- agrega esto
        res.status(500).json({ message: 'Error al obtener productos aleatorios' });
    }
});



// Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el producto" });
    }
});

// Obtener productos relacionados
router.get('/:id/related', async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener el producto actual
        const currentProduct = await Product.findById(id);
        if (!currentProduct) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // Buscar productos de la misma categoría, excluyendo el producto actual
        const relatedProducts = await Product.aggregate([
            { $match: { category: currentProduct.category, _id: { $ne: currentProduct._id } } },
            { $sample: { size: 4 } } // Seleccionar 4 productos aleatorios
        ]);

        res.json(relatedProducts);
    } catch (error) {
        console.error("Error al obtener productos relacionados:", error);
        res.status(500).json({ message: "Error al obtener productos relacionados" });
    }
});

// Obtener productos relacionados con el texto del input con paginación
router.get('/search/all', async (req, res) => {
    const query = req.query.query;
    const page = parseInt(req.query.page) || 1; // Página actual
    const limit = parseInt(req.query.limit) || 20; // Productos por página

    try {
        const filter = { name: { $regex: query, $options: 'i' } }; // Filtro de búsqueda
        const total = await Product.countDocuments(filter); // Total de productos que coinciden
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .skip(skip)
            .limit(limit);

        res.json({
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            productsPerPage: limit,
            totalProducts: total,
            products,
        });
    } catch (err) {
        console.error("Error al buscar productos:", err);
        res.status(500).json({ message: 'Error al buscar productos' });
    }
});





// Actualizar el precio de todos los productos
router.put('/update-prices', async (req, res) => {
    try {
        const updatedProducts = await Product.updateMany({}, { price: 1000 }); // Cambiar el precio a 1000
        res.json({ message: "Precios actualizados correctamente", updatedCount: updatedProducts.modifiedCount });
    } catch (error) {
        console.error("Error al actualizar los precios:", error);
        res.status(500).json({ message: "Error al actualizar los precios" });
    }
});


module.exports = router;
