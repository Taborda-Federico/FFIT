const Landing = require('../models/Landing');


const getMiLanding = async (req, res) => {
    try {
        let landing = await Landing.findOne({ adminId: req.user._id });

        if (!landing) {
            return res.json({ heroBackgrounds: [], clases: [], coaches: [] });
        }
        res.json(landing);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar los datos de la web' });
    }
};


const updateMiLanding = async (req, res) => {
    try {
        const { heroBackgrounds, clases, coaches } = req.body;

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


const getPublicLanding = async (req, res) => {
    try {
        const landing = await Landing.findOne();

        if (!landing) {
            return res.json({ heroBackgrounds: [], clases: [], coaches: [] });
        }
        res.json(landing);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar la web pública' });
    }
};

module.exports = { getMiLanding, updateMiLanding, getPublicLanding };
