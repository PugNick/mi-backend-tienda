const express = require('express');
const axios = require('axios');
const router = express.Router();

// 🔹 Función para obtener la ciudad desde la localidad y provincia
async function getCityFromLocation(localidad, provincia) {
    try {
        const direccion = `${localidad}, ${provincia}, Argentina`;
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: direccion,
                key: process.env.GOOGLE_MAPS_API_KEY,
            }
        });

        console.log("Respuesta de la API de Google:", response.data); // Debugging

        if (!response.data.results || response.data.results.length === 0) {
            return null; // No se encontró ciudad
        }

        const resultado = response.data.results[0]; // Tomamos la mejor coincidencia
        return resultado.formatted_address; // Retornamos la dirección formateada
    } catch (error) {
        console.error("Error en la API de Google:", error.response ? error.response.data : error.message);
        return null;
    }
}
function normalizeText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


// 🔹 Ruta para obtener puntos de retiro
router.post('/retailers', async (req, res) => {
    const { localidad, provincia } = req.body;

    if (!localidad || !provincia) {
        return res.status(400).json({ message: "Debe proporcionar la localidad y la provincia." });
    }

    console.log("Localidad y Provincia recibidas:", localidad, provincia); // Debugging

    try {
        // 🔹 Obtenemos la ciudad basada en la localidad y provincia
        const ciudadObtenida = await getCityFromLocation(localidad, provincia);
        console.log("Ciudad obtenida:", ciudadObtenida); // Verificamos la ciudad obtenida

        if (!ciudadObtenida || !normalizeText(ciudadObtenida).includes(normalizeText(localidad))) {
            return res.status(404).json({ message: "No se encontró la ciudad ingresada." });
        }

        // 🔹 Buscamos puntos de retiro en esa ciudad con "Places API (New)"
        const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            {
                textQuery: `correo en ${ciudadObtenida}`,
            },
            {
                headers: {
                    'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
                }
            }
        );

        console.log("Respuesta de búsqueda de puntos de retiro:", response.data); // Debugging

        if (!response.data.places || response.data.places.length === 0) {
            return res.status(404).json({ message: "No se encontraron puntos de retiro en esta ciudad." });
        }

        // 🔹 Formateamos los resultados
        const retailers = response.data.places.map(place => ({
            name: place.displayName.text,
            address: place.formattedAddress,
            lat: place.location.latitude,
            lng: place.location.longitude,
        }));

        res.json(retailers);
    } catch (error) {
        console.error("Error al obtener puntos de retiro:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error al obtener puntos de retiro." });
    }

});



module.exports = router;
