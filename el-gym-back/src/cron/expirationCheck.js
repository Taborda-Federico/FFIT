const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const transporter = require('../config/mailer');
const Plan = require('../models/Plan');

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
            // Antes, el try/catch de afuera envolvía TODO el callback: si un
            // solo alumno tenía un email inválido (o el proveedor de mail
            // rechazaba justo esa dirección), sendMail tiraba, el catch de
            // afuera atrapaba el error UNA vez, y el `for` se cortaba ahí —
            // todos los alumnos que venían después en el mismo batch se
            // quedaban sin Notification y sin email, aunque no tuvieran nada
            // de malo. Con un try/catch propio POR ALUMNO, una falla queda
            // contenida a ese alumno y el resto del batch sigue procesándose.
            try {
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
            } catch (errorAlumno) {
                console.error(`❌ No se pudo avisar a ${user.email} (id ${user._id}):`, errorAlumno.message);
            }
        }
    } catch (error) {
        console.error("Error en el robot de vencimientos:", error);
    }
});


cron.schedule('59 23 * * 0', async () => {
    console.log("🔄 Iniciando proceso de actualización semanal de planes...");

    try {
        const planesActivos = await Plan.find({
            esPlantilla: false,
            activo: true,
            vencimiento: { $gt: 0 }
        });

        for (let plan of planesActivos) {
            plan.vencimiento -= 1;

            if (plan.vencimiento <= 0) {
                plan.vencimiento = 0;
                plan.activo = false;
                plan.notasGlobales = (plan.notasGlobales || "") + " [PLAN FINALIZADO]";
            } else if (plan.vencimiento === 1 && !plan.avisoVencimientoEnviado) {
                // Este aviso ("te queda ~1 semana") antes lo disparaba
                // getStudentDashboard en cada carga de pantalla del alumno —
                // ver docs/CAMBIOS.md #5 sobre por qué eso además duplicaba
                // el aviso si dos pedidos llegaban al mismo tiempo. Ahora lo
                // maneja el mismo lugar que decrementa vencimiento, una sola
                // vez por semana, sin condición de carrera posible.
                await Notification.create({
                    alumnoId: plan.alumnoId,
                    titulo: '¡Tu plan está por vencer! ⚠️',
                    mensaje: `Te queda ${plan.vencimiento === 1 ? '1 semana' : `${plan.vencimiento} semanas`} de tu plan "${plan.titulo}". ¡Hablá con tu profe para renovarlo antes de quedarte sin rutina!`,
                    tipo: 'PLAN'
                });
                plan.avisoVencimientoEnviado = true;
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