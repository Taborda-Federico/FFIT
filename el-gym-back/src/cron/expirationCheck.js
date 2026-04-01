const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const transporter = require('../config/mailer');
const Plan = require('../models/Plan'); // 🚨 ¡IMPORTANTE! Faltaba importar el modelo Plan

// Se ejecuta todos los días a las 09:00 AM hora del servidor ("0 9 * * *")
cron.schedule('0 9 * * *', async () => {
    console.log("🤖 Ejecutando robot de revisión de membresías...");

    try {
        const hoy = new Date();
        const enCincoDias = new Date();
        enCincoDias.setDate(hoy.getDate() + 5);

        const usuariosPorVencer = await User.find({
            role: 'user',
            estado: 'Al día',
            fechaVencimiento: {
                $gte: new Date(enCincoDias.setHours(0, 0, 0, 0)),
                $lte: new Date(enCincoDias.setHours(23, 59, 59, 999))
            }
        });

        for (let user of usuariosPorVencer) {
            await Notification.create({
                alumnoId: user._id,
                titulo: 'Aviso de Vencimiento',
                mensaje: 'A tu cuota le quedan 5 días para vencer. Recuerda renovarla para no perder tu progreso.',
                tipo: 'ALERTA'
            });

            await transporter.sendMail({
                from: `"Administración FFIT+" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Aviso Importante: Tu membresía vence en 5 días ⚠️',
                html: `
                    <h2>Hola ${user.nombre},</h2>
                    <p>Te recordamos que tu plan de entrenamiento actual en FFIT+ vencerá en exactamente <strong>5 días</strong>.</p>
                    <p>Si deseas continuar con tus rutinas sin interrupciones, por favor contacta a administración o realiza el pago correspondiente.</p>
                    <p>¡Gracias por ser parte de nuestro equipo!</p>
                `
            });
            console.log(`📧 Alerta de vencimiento enviada a: ${user.email}`);
        }
    } catch (error) {
        console.error("Error en el robot de vencimientos:", error);
    }
});

// 🔄 Se ejecuta cada Domingo a las 23:59 ("59 23 * * 0")
cron.schedule('59 23 * * 0', async () => {
    console.log("🔄 Iniciando proceso de actualización semanal de planes...");

    try {
        // Buscamos planes que no sean plantillas, que estén ACTIVOS y tengan semanas
        const planesActivos = await Plan.find({
            esPlantilla: false,
            activo: true, // 🚨 Clave para no tocar los planes zombis/viejos
            vencimiento: { $gt: 0 } // 🚨 Corregido: Usamos 'vencimiento', no 'semanasRestantes'
        });

        for (let plan of planesActivos) {
            plan.vencimiento -= 1; // 🚨 Corregido a 'vencimiento'

            // Si el plan se quedó sin semanas (llegó a 0)
            if (plan.vencimiento <= 0) {
                plan.vencimiento = 0;
                plan.activo = false; // 🚨 Apagamos el plan para que el alumno no lo vea más
                plan.notasGlobales = (plan.notasGlobales || "") + " [PLAN FINALIZADO]";
            }

            await plan.save();
        }

        console.log(`✅ Se actualizaron ${planesActivos.length} planes con éxito.`);
    } catch (error) {
        console.error("❌ Error en el proceso semanal de planes:", error);
    }
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});