const Landing = require('../models/Landing');

// @desc    Obtener la configuración de la Landing del Admin
// @route   GET /api/landing/my-site
const getMiLanding = async (req, res) => {
    try {
        let landing = await Landing.findOne({ adminId: req.user._id });
        
        // Si no existe, devolvemos arrays vacíos para que React no explote
        if (!landing) {
            return res.json({ heroBackgrounds: [], clases: [], coaches: [] });
        }
        res.json(landing);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar los datos de la web' });
    }
};

// @desc    Guardar o Actualizar toda la Landing Page
// @route   PUT /api/landing/my-site
const updateMiLanding = async (req, res) => {
    try {
        const { heroBackgrounds, clases, coaches } = req.body;

        // findOneAndUpdate con upsert: true significa "Si existe, actualízalo. Si no existe, créalo".
        const landingActualizada = await Landing.findOneAndUpdate(
            { adminId: req.user._id },
            { heroBackgrounds, clases, coaches },
            { new: true, upsert: true }
        );

        res.json({ message: 'Sitio web actualizado con éxito', landing: landingActualizada });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el sitio web', error: error.message });
    }
};

// @desc    Obtener la Landing pública (sin necesidad de login)
// @route   GET /api/landing/public
const getPublicLanding = async (req, res) => {
    try {
        // Como es tu gimnasio, traemos la primera configuración que encuentre
        const landing = await Landing.findOne();
        
        if (!landing) {
            return res.json({ heroBackgrounds: [], clases: [], coaches: [] });
        }
        res.json(landing);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar la web pública' });
    }
};

// ACUÉRDATE DE EXPORTARLA AQUÍ ABAJO:
module.exports = { getMiLanding, updateMiLanding, getPublicLanding };
