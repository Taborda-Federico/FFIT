import React, { useState, useEffect } from 'react';
import {
    FaTrash, FaPlus, FaCloudUploadAlt, FaSave, FaUserEdit,
    FaLink, FaInfoCircle, FaDumbbell, FaHistory, FaLayerGroup,
    FaClock, FaCalendarPlus, FaSearch, FaWhatsapp, FaCheckCircle, FaSpinner,
    FaClipboardList, FaPencilAlt, FaTimes
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { ConfirmModal } from '../../../Utils/ConfirmModal';
import { Toast } from '../../../Utils/Toast';
import { PlantillasModal } from './PlantillasModal';
import './AdminDashboard.css';

import { useAuth } from '../../../contex/AuthContext';
import { UserService } from '../../../service/user.service';
import { PlanService } from '../../../service/plan.service';

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

const planVacio = () => ({
    alumno: '',
    alumnoId: null,
    celular: '',
    titulo: '',
    sesiones: [{ id: generateId(), nombre: 'Día 1', bloques: [] }]
});

// Clave de localStorage donde se guarda el plan que se está armando, para no
// perderlo si el profe navega a otra pestaña del panel o recarga la página
// a mitad de camino (antes esto no se guardaba en ningún lado: alcanzaba con
// tocar "Alumnos" o "Seguimiento" un segundo para perder todo lo tipeado).
// Se separa por admin (según su _id) para que, en una compu compartida por
// varios profes, el borrador de uno no se mezcle con el de otro.
const claveDraft = (adminId) => `ffit_admin_plan_draft_${adminId || 'anon'}`;

function cargarDraft(adminId) {
    try {
        const guardado = localStorage.getItem(claveDraft(adminId));
        return guardado ? JSON.parse(guardado) : null;
    } catch {
        // JSON corrupto o localStorage no disponible: seguimos con un plan
        // en blanco en vez de romper la pantalla.
        return null;
    }
}

export function AdminDashboard() {
    const { user } = useAuth();

    const [plan, setPlan] = useState(() => cargarDraft(user?._id) || planVacio());

    const [showConfirm, setShowConfirm] = useState(false);
    const [toast, setToast] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [successWhatsApp, setSuccessWhatsApp] = useState(null);

    const [alumnosDb, setAlumnosDb] = useState([]);
    const [plantillasDb, setPlantillasDb] = useState([]);

    // Estado del modal de "Gestionar Plantillas" (pedido de un cliente real:
    // con muchas plantillas guardadas, el <select> de "Cargar Plantilla..."
    // se vuelve inmanejable — necesitaba un lugar para buscarlas y borrar
    // las que ya no usa). `editingPlantillaId`, cuando no es null, indica que
    // el plan que se está armando ahora mismo vino de "Editar" en ese modal:
    // mientras esté seteado, "Guardar Plantilla" ACTUALIZA esa plantilla en
    // vez de crear una copia nueva (algo que antes no existía — la única
    // forma de "editar" era cargarla y guardar, lo que en realidad duplicaba).
    const [showPlantillasModal, setShowPlantillasModal] = useState(false);
    const [confirmDeletePlantilla, setConfirmDeletePlantilla] = useState(null);
    const [editingPlantillaId, setEditingPlantillaId] = useState(null);

    const notify = (msg, type = 'success') => setToast({ msg, type });

    useEffect(() => {
        if (!user || !user.token) return;

        const cargarDatos = async () => {
            try {
                const [alumnosData, plantillasData] = await Promise.all([
                    UserService.getStudents(user.token),
                    PlanService.getPlantillas(user.token)
                ]);
                setAlumnosDb(alumnosData);
                setPlantillasDb(plantillasData);
            } catch (error) {
                notify("Error al cargar datos del servidor", "error");
            }
        };
        cargarDatos();
    }, [user]);

    // Persistencia del borrador: cada cambio en el plan (agregar un día,
    // escribir un ejercicio, elegir un alumno...) se guarda al toque. Si la
    // pantalla se desmonta —por navegar a otra pestaña del sidebar o por un
    // F5— y se vuelve a "Planes", se recupera exactamente donde había
    // quedado. Mismo patrón que ya se usaba del lado del alumno para no
    // perder un entrenamiento a medio hacer (ver UserDashboard.jsx).
    useEffect(() => {
        try {
            localStorage.setItem(claveDraft(user?._id), JSON.stringify(plan));
        } catch {
            // localStorage lleno o no disponible (ej. modo incógnito con
            // storage bloqueado): no es motivo para romper el armado del
            // plan, simplemente no persiste esta vez.
        }
    }, [plan, user]);

    const handleCargarPlantilla = (plantillaId) => {
        if (!plantillaId) return;
        const template = plantillasDb.find(p => p._id === plantillaId);
        if (template) {
            setPlan(prev => ({
                ...prev,
                titulo: template.titulo,
                sesiones: template.sesiones
            }));
            notify(`Plantilla "${template.titulo}" cargada`);
        }
    };

    const handleGuardarPlantilla = async () => {
        if (!plan.titulo) return notify("Debes ponerle un título a la plantilla", "error");
        setIsProcessing(true);
        try {
            const planLimpio = {
                ...plan,
                sesiones: plan.sesiones.map(s => ({
                    ...s,
                    bloques: s.bloques.filter(b => b.ejercicios && b.ejercicios.length > 0)
                }))
            };
            // Si el plan que se está armando vino de "Editar" en el modal de
            // plantillas (editingPlantillaId seteado), se ACTUALIZA esa misma
            // plantilla en la base en vez de crear una nueva — es justamente
            // lo que faltaba y hacía que la lista de plantillas se llenara de
            // copias casi idénticas.
            if (editingPlantillaId) {
                await PlanService.actualizarPlantilla(editingPlantillaId, planLimpio, user.token);
                notify("Plantilla actualizada con éxito");
            } else {
                await PlanService.guardarPlantilla(planLimpio, user.token);
                notify("Plantilla guardada en la nube con éxito");
            }
            const updatedPlantillas = await PlanService.getPlantillas(user.token);
            setPlantillasDb(updatedPlantillas);
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Carga una plantilla existente en el armador para EDITARLA (a
    // diferencia de handleCargarPlantilla / el <select> de arriba, que sigue
    // funcionando exactamente igual que siempre: carga una COPIA de
    // arranque, sin marcarla para actualizar nada).
    const handleEditarPlantilla = (plantilla) => {
        setPlan({
            ...planVacio(),
            titulo: plantilla.titulo,
            sesiones: plantilla.sesiones
        });
        setEditingPlantillaId(plantilla._id);
        setShowPlantillasModal(false);
        notify(`Editando plantilla "${plantilla.titulo}"`);
    };

    // "Salir" del modo edición: el contenido armado en pantalla NO se borra
    // (el profe puede seguir tocándolo), simplemente deja de estar atado a
    // la plantilla original — la próxima vez que toque "Guardar Plantilla"
    // va a crear una nueva, como el comportamiento de siempre.
    const handleSalirEdicion = () => {
        setEditingPlantillaId(null);
    };

    const handleConfirmEliminarPlantilla = async () => {
        if (!confirmDeletePlantilla) return;
        try {
            await PlanService.eliminarPlantilla(confirmDeletePlantilla._id, user.token);
            setPlantillasDb(prev => prev.filter(p => p._id !== confirmDeletePlantilla._id));
            if (editingPlantillaId === confirmDeletePlantilla._id) {
                setEditingPlantillaId(null);
            }
            notify(`Plantilla "${confirmDeletePlantilla.titulo}" eliminada`);
        } catch (error) {
            notify(error.message || "Error al eliminar la plantilla", "error");
        } finally {
            setConfirmDeletePlantilla(null);
        }
    };

    const handlePublicarPlan = async (semanasSeleccionadas) => {
        if (!plan.alumnoId) return notify("Por favor, selecciona un alumno de la lista", "error");
        if (!plan.titulo) return notify("El plan debe tener un título", "error");

        setShowConfirm(false);
        setIsProcessing(true);

        try {
            const planAEnviar = {
                ...plan,
                vencimiento: semanasSeleccionadas || 4,
                sesiones: plan.sesiones.map(s => ({
                    ...s,
                    bloques: s.bloques.filter(b => b.ejercicios && b.ejercicios.length > 0)
                }))
            };

            await PlanService.publicarPlan(planAEnviar, user.token);
            notify(`Plan asignado a ${plan.alumno} con éxito`);

            const mensajeWa = `¡Hola ${plan.alumno}! 🏋️‍♂️ Ya te subí tu nueva rutina: *${plan.titulo}* (${semanasSeleccionadas} semanas). ¡Entra a la app para verla! 🔥`;

            const linkWhatsApp = plan.celular
                ? `https://wa.me/${plan.celular}?text=${encodeURIComponent(mensajeWa)}`
                : `https://wa.me/?text=${encodeURIComponent(mensajeWa)}`;

            setSuccessWhatsApp({
                alumno: plan.alumno,
                link: linkWhatsApp
            });

            // El plan ya quedó publicado del lado del servidor — recién acá
            // termina el ciclo de vida de ESTE borrador en particular, así
            // que es el único momento en que corresponde borrarlo.
            try { localStorage.removeItem(claveDraft(user?._id)); } catch { /* nada que limpiar */ }
            setPlan(planVacio());
            setEditingPlantillaId(null);
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setIsProcessing(false); // 🚨 Se detiene la ruedita
        }
    };

    // --- LÓGICA DE DÍAS, BLOQUES Y EJERCICIOS (REPARADA PARA id y _id) ---
    const añadirDia = () => {
        setPlan({ ...plan, sesiones: [...plan.sesiones, { id: generateId(), nombre: `Día ${plan.sesiones.length + 1}`, bloques: [] }] });
        notify("Día añadido");
    };

    const añadirBloque = (sesionId, tipo) => {
        const nuevoBloque = { id: generateId(), tipo: tipo, descanso: 60, vueltas: tipo === 'circuit' ? 3 : 1, ejercicios: [{ id: generateId(), nombre: '', reps: '', series: '', tiempo: '', video: '', notas: '' }] };
        setPlan({ ...plan, sesiones: plan.sesiones.map(s => (s.id || s._id) === sesionId ? { ...s, bloques: [...s.bloques, nuevoBloque] } : s) });
    };

    const añadirEjercicioABloque = (sesionId, bloqueId) => {
        setPlan({ ...plan, sesiones: plan.sesiones.map(s => (s.id || s._id) === sesionId ? { ...s, bloques: s.bloques.map(b => (b.id || b._id) === bloqueId ? { ...b, ejercicios: [...b.ejercicios, { id: generateId(), nombre: '', reps: '', series: '', tiempo: '', video: '', notas: '' }] } : b) } : s) });
    };

    const updateEjercicio = (sesionId, bloqueId, ejId, campo, valor) => {
        setPlan({
            ...plan,
            sesiones: plan.sesiones.map(s =>
                (s.id || s._id) === sesionId ? {
                    ...s,
                    bloques: s.bloques.map(b =>
                        (b.id || b._id) === bloqueId ? {
                            ...b,
                            ejercicios: b.ejercicios.map(e =>
                                (e.id || e._id) === ejId ? { ...e, [campo]: valor } : e
                            )
                        } : b
                    )
                } : s
            )
        });
    };

    return (
        <div className="admin-dashboard-view">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            {showConfirm && <ConfirmModal plan={plan} onClose={() => setShowConfirm(false)} onConfirm={handlePublicarPlan} />}

            {showPlantillasModal && (
                <PlantillasModal
                    plantillas={plantillasDb}
                    onClose={() => setShowPlantillasModal(false)}
                    onEditar={handleEditarPlantilla}
                    onEliminar={(plantilla) => setConfirmDeletePlantilla(plantilla)}
                />
            )}

            {/* Modal de confirmación de borrado — se monta DESPUÉS del de
                plantillas para quedar por encima en el stacking (mismo
                z-index, gana el último en el DOM). */}
            {confirmDeletePlantilla && (
                <ConfirmModal
                    title="Eliminar Plantilla"
                    type="warning"
                    confirmText="Sí, Eliminar"
                    message={`¿Eliminar la plantilla "${confirmDeletePlantilla.titulo}"? Esta acción no se puede deshacer.`}
                    onConfirm={handleConfirmEliminarPlantilla}
                    onClose={() => setConfirmDeletePlantilla(null)}
                />
            )}

            {successWhatsApp && (
                <div style={{
                    background: 'rgba(37, 211, 102, 0.1)', border: '1px solid #25D366',
                    borderRadius: '12px', padding: '15px 20px', margin: '0 20px 20px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaCheckCircle style={{ color: '#25D366', fontSize: '2rem' }} />
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>¡Plan enviado a {successWhatsApp.alumno}!</h4>
                            <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Avisa a tu alumno al instante para mantener la motivación.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a
                            href={successWhatsApp.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                background: '#25D366', color: '#000', padding: '10px 20px',
                                borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onClick={() => setSuccessWhatsApp(null)}
                        >
                            <FaWhatsapp size={18} /> Avisar ahora
                        </a>
                        <button
                            onClick={() => setSuccessWhatsApp(null)}
                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '10px' }}
                        >
                            Omitir
                        </button>
                    </div>
                </div>
            )}

            <div className="admin-top-controls">
                <div className="search-user-container">
                    <FaSearch className="icon-dim" />
                    <input
                        placeholder="Buscar alumno para asignar..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                    />
                    {userSearch && (
                        <div className="search-results-dropdown">
                            {alumnosDb.filter(a => a.nombre.toLowerCase().includes(userSearch.toLowerCase())).map(a => (
                                <div key={a._id} className="result-item" onClick={() => {
                                    // El modelo de alumno guarda el teléfono como `telefono`, no
                                    // `celular` — leer `a.celular` siempre daba undefined, así que
                                    // el link de WhatsApp de abajo nunca llevaba el número real.
                                    setPlan({ ...plan, alumno: a.nombre, alumnoId: a._id, celular: a.telefono });
                                    setUserSearch("");
                                }}>
                                    {a.nombre} - <small>{a.email}</small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="admin-top-actions">
                    <div className="template-selector">
                        <FaHistory className="text-neon" />
                        <select className="minimal-select" onChange={(e) => handleCargarPlantilla(e.target.value)} defaultValue="">
                            <option value="" disabled>Cargar Plantilla...</option>
                            {plantillasDb.map(p => <option key={p._id} value={p._id}>{p.titulo}</option>)}
                        </select>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="btn-gestionar-plantillas"
                        onClick={() => setShowPlantillasModal(true)}
                    >
                        <FaClipboardList /> <span>Plantillas</span>
                    </Button>
                </div>
            </div>

            <section className="plan-info-card">
                <div className="assigned-user">
                    <FaUserEdit className="text-neon" />
                    <span>Asignado a: <strong>{plan.alumno || "Nadie todavía (Modo Plantilla)"}</strong></span>
                </div>

                <input
                    className="input-plan-title"
                    placeholder="TÍTULO DE LA RUTINA"
                    value={plan.titulo}
                    onChange={(e) => setPlan({ ...plan, titulo: e.target.value })}
                />

                {editingPlantillaId && (
                    <div className="editing-plantilla-banner">
                        <FaPencilAlt />
                        <span>Editando una plantilla guardada — al guardar, se pisa la original.</span>
                        <button className="btn-salir-edicion" onClick={handleSalirEdicion} title="Salir del modo edición (guardar como nueva)">
                            <FaTimes />
                        </button>
                    </div>
                )}
            </section>

            <div className="sesiones-list">
                {plan.sesiones.map((sesion) => {
                    const sId = sesion.id || sesion._id; // <-- ID Robusto de Sesión
                    return (
                        <div key={sId} className="sesion-card-pro">
                            <div className="sesion-header">
                                <div className="title-group">
                                    <FaDumbbell className="text-neon" />
                                    <input className="sesion-name-input" value={sesion.nombre} onChange={(e) => {
                                        setPlan({ ...plan, sesiones: plan.sesiones.map(s => (s.id || s._id) === sId ? { ...s, nombre: e.target.value } : s) });
                                    }} />
                                </div>
                                <button className="btn-icon-delete" onClick={() => setPlan({ ...plan, sesiones: plan.sesiones.filter(s => (s.id || s._id) !== sId) })}><FaTrash /></button>
                            </div>

                            <div className="bloques-grid">
                                {sesion.bloques.map((bloque) => {
                                    const bId = bloque.id || bloque._id; // <-- ID Robusto de Bloque
                                    return (
                                        <div key={bId} className={`admin-block-card ${bloque.tipo}`}>
                                            <div className="block-type-header">
                                                <div className="type-badge">
                                                    {bloque.tipo === 'superset' ? <FaLayerGroup /> : <FaClock />}
                                                    {bloque.tipo.toUpperCase()}
                                                </div>
                                                {bloque.tipo === 'circuit' && (
                                                    <div className="vueltas-input">
                                                        <label>Vueltas:</label>
                                                        <input type="number" value={bloque.vueltas} onChange={(e) => {
                                                            const val = e.target.value;
                                                            setPlan({ ...plan, sesiones: plan.sesiones.map(s => (s.id || s._id) === sId ? { ...s, bloques: s.bloques.map(b => (b.id || b._id) === bId ? { ...b, vueltas: val } : b) } : s) });
                                                        }} />
                                                    </div>
                                                )}
                                            </div>

                                            {bloque.ejercicios.map((ej) => {
                                                const eId = ej.id || ej._id; // <-- ID Robusto de Ejercicio
                                                return (
                                                    <div key={eId} className="ej-complex-edit-row">
                                                        <div className="main-data-row">
                                                            <input className="input-styled ej-name" placeholder="Ejercicio" value={ej.nombre} onChange={(e) => updateEjercicio(sId, bId, eId, 'nombre', e.target.value)} />
                                                            <div className="sr-inputs-admin">
                                                                {bloque.tipo === 'circuit' ? (
                                                                    <div className="time-group"><input placeholder="00" value={ej.tiempo} onChange={(e) => updateEjercicio(sId, bId, eId, 'tiempo', e.target.value)} /><span>seg</span></div>
                                                                ) : (
                                                                    <><input placeholder="S" value={ej.series} onChange={(e) => updateEjercicio(sId, bId, eId, 'series', e.target.value)} /><span>x</span><input placeholder="R" value={ej.reps} onChange={(e) => updateEjercicio(sId, bId, eId, 'reps', e.target.value)} /></>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="extra-data-row">
                                                            <div className="input-with-icon-admin"><FaLink /><input placeholder="URL Video" value={ej.video} onChange={(e) => updateEjercicio(sId, bId, eId, 'video', e.target.value)} /></div>
                                                            <div className="input-with-icon-admin"><FaInfoCircle /><input placeholder="Notas técnicas" value={ej.notas} onChange={(e) => updateEjercicio(sId, bId, eId, 'notas', e.target.value)} /></div>
                                                        </div>
                                                        <button className="delete-ej-btn-mini" onClick={() => {
                                                            const nuevas = plan.sesiones.map(s => {
                                                                if ((s.id || s._id) === sId) {
                                                                    return {
                                                                        ...s,
                                                                        bloques: s.bloques
                                                                            .map(b => (b.id || b._id) === bId ? { ...b, ejercicios: b.ejercicios.filter(x => (x.id || x._id) !== eId) } : b)
                                                                            .filter(b => b.ejercicios && b.ejercicios.length > 0)
                                                                    };
                                                                }
                                                                return s;
                                                            });
                                                            setPlan({ ...plan, sesiones: nuevas });
                                                        }}>&times;</button>
                                                    </div>
                                                );
                                            })}

                                            <div className="block-footer-admin">
                                                {(bloque.tipo === 'circuit' || bloque.tipo === 'superset') && (
                                                    <Button variant="outline" size="sm" className="btn-add-ej-to-block" onClick={() => añadirEjercicioABloque(sId, bId)}><FaPlus /> Añadir Ejercicio</Button>
                                                )}
                                                <div className="rest-input-admin"><FaClock /><input type="number" value={bloque.descanso} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setPlan({ ...plan, sesiones: plan.sesiones.map(s => (s.id || s._id) === sId ? { ...s, bloques: s.bloques.map(b => (b.id || b._id) === bId ? { ...b, descanso: val } : b) } : s) });
                                                }} /><span>seg descanso</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="add-block-actions">
                                <Button variant="secondary" size="sm" onClick={() => añadirBloque(sId, 'standard')}><FaPlus /> Serie</Button>
                                <Button variant="secondary" size="sm" onClick={() => añadirBloque(sId, 'superset')}><FaLayerGroup /> Superserie</Button>
                                <Button variant="secondary" size="sm" onClick={() => añadirBloque(sId, 'circuit')}><FaClock /> Circuito</Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="footer-add-day">
                <Button variant="secondary" fullWidth size="lg" onClick={añadirDia}>
                    <FaCalendarPlus /> AÑADIR NUEVO DÍA DE ENTRENAMIENTO
                </Button>
            </div>

            <div className="admin-actions-center-bar">
                <Button
                    variant="outline"
                    className="action-btn-central btn-save"
                    onClick={handleGuardarPlantilla}
                    disabled={isProcessing}
                >
                    {isProcessing ? <FaSpinner className="spin" /> : <FaSave />}
                    <span>{isProcessing ? 'Guardando...' : (editingPlantillaId ? 'Guardar Cambios' : 'Guardar Plantilla')}</span>
                </Button>
                <Button
                    variant="primary"
                    className="action-btn-central btn-publish"
                    onClick={() => plan.alumnoId ? setShowConfirm(true) : notify("Busca y selecciona un alumno primero", "error")}
                    disabled={isProcessing}
                >
                    {isProcessing ? <FaSpinner className="spin" /> : <FaCloudUploadAlt />}
                    <span>{isProcessing ? 'Publicando...' : 'Publicar a Alumno'}</span>
                </Button>
            </div>
        </div>
    );
}