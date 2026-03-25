import React, { useState, useEffect } from 'react';
import {
    FaTrash, FaPlus, FaCloudUploadAlt, FaSave, FaUserEdit,
    FaLink, FaInfoCircle, FaDumbbell, FaHistory, FaLayerGroup,
    FaClock, FaCalendarPlus, FaSearch, FaWhatsapp, FaCheckCircle, FaSpinner
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { ConfirmModal } from '../../../Utils/ConfirmModal';
import { Toast } from '../../../Utils/Toast';
import './AdminDashboard.css';

import { useAuth } from '../../../contex/AuthContext';
import { UserService } from '../../../service/user.service';
import { PlanService } from '../../../service/plan.service';

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

export function AdminDashboard() {
    const { user } = useAuth();

    const [plan, setPlan] = useState({
        alumno: '',
        alumnoId: null,
        celular: '',
        titulo: '',
        sesiones: [{ id: generateId(), nombre: 'Día 1', bloques: [] }]
    });

    const [showConfirm, setShowConfirm] = useState(false);
    const [toast, setToast] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [successWhatsApp, setSuccessWhatsApp] = useState(null);

    const [alumnosDb, setAlumnosDb] = useState([]);
    const [plantillasDb, setPlantillasDb] = useState([]);

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
            await PlanService.guardarPlantilla(planLimpio, user.token);
            notify("Plantilla guardada en la nube con éxito");
            const updatedPlantillas = await PlanService.getPlantillas(user.token);
            setPlantillasDb(updatedPlantillas);
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setIsProcessing(false);
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

            setPlan({
                alumno: '',
                alumnoId: null,
                celular: '',
                titulo: '',
                sesiones: [{ id: generateId(), nombre: 'Día 1', bloques: [] }]
            });
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
                                    setPlan({ ...plan, alumno: a.nombre, alumnoId: a._id, celular: a.celular });
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
                    <span>{isProcessing ? 'Guardando...' : 'Guardar Plantilla'}</span>
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