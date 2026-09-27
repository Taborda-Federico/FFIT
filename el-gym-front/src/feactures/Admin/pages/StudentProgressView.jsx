import React, { useState, useEffect } from 'react';
import {
    FaChartLine, FaHistory, FaStickyNote, FaWeightHanging,
    FaClock, FaPlus, FaChevronRight, FaSearch, FaSpinner, FaDumbbell
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../../../Utils/Button';
import { Toast } from '../../../Utils/Toast';
import { useAuth } from '../../../contex/AuthContext';
import { AdminService } from '../../../service/admin.service';
import { UserService } from '../../../service/user.service';
import './StudentProgressView.css';

// Normaliza un nombre de ejercicio para comparar/agrupar sin que
// mayúsculas o espacios de más lo hagan contar como "otro" ejercicio.
function normalizarNombreEjercicio(nombre) {
    return (nombre || '').trim().toLowerCase();
}

// Resume el peso de UNA sesión para un ejercicio a un solo número — lo que
// el gráfico necesita para tener un punto por fecha. Si el log tiene el
// desglose por serie, se calcula según el modo elegido; si es un log viejo
// (sin `series`), se sigue usando `pesoUsado` tal cual, en los dos modos
// por igual (es la única cifra que existe para esos datos).
function resumirPeso(ejercicio, modo) {
    if (Array.isArray(ejercicio.series) && ejercicio.series.length > 0) {
        if (modo === 'volumen') {
            return ejercicio.series.reduce((acc, s) => acc + (Number(s.peso) || 0) * (Number(s.reps) || 1), 0);
        }
        return Math.max(...ejercicio.series.map(s => Number(s.peso) || 0));
    }
    return ejercicio.pesoUsado || 0;
}

export function StudentProgressView() {
    const { user: admin } = useAuth();
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [progressData, setProgressData] = useState({ historial: [], notas: [] });
    const [newNote, setNewNote] = useState("");

    const [uniqueExercises, setUniqueExercises] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState("");
    // 'mejor' = el peso más alto levantado esa sesión (sobrecarga
    // progresiva clásica); 'volumen' = peso × repeticiones sumado de todas
    // las series (cuánto trabajo total se hizo). Ver docs/CAMBIOS.md: con
    // el peso por serie, una sesión ya no es "un solo número", así que hay
    // que elegir qué representar en el gráfico.
    const [modoGrafico, setModoGrafico] = useState('mejor');

    const notify = (msg, type = 'success') => setToast({ msg, type });

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!admin?.token) return;
            try {
                const students = await UserService.getStudents(admin.token);
                setAllStudents(students);
            } catch (error) {
                console.error("Error cargando alumnos");
            }
        };
        fetchInitialData();
    }, [admin]);

    const filteredResults = searchQuery.length > 0
        ? allStudents.filter(s =>
            s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.dni.toString().includes(searchQuery)
        ).slice(0, 5)
        : [];

    const loadStudentData = async (student) => {
        setLoading(true);
        try {
            const data = await AdminService.getStudentProgress(student._id, admin.token);
            setSelectedStudent(student);
            setProgressData(data);
            setSearchQuery("");

            // Se agrupa ignorando mayúsculas/espacios de más ("Sentadilla"
            // y "sentadilla " cuentan como el mismo ejercicio) — sin esto,
            // un simple typo en una edición del plan partía la curva de un
            // ejercicio en dos "distintos" sin que nadie lo pidiera. Se
            // muestra el PRIMER casing visto como etiqueta, por prolijidad.
            const porNombreNormalizado = new Map();
            data.historial.forEach(session => {
                session.ejercicios?.forEach(ej => {
                    const clave = normalizarNombreEjercicio(ej.nombre);
                    if (clave && !porNombreNormalizado.has(clave)) {
                        porNombreNormalizado.set(clave, ej.nombre);
                    }
                });
            });
            const exercisesArray = Array.from(porNombreNormalizado.values()).sort();
            setUniqueExercises(exercisesArray);

            if (exercisesArray.length > 0) {
                setSelectedExercise(exercisesArray[0]);
            } else {
                setSelectedExercise("");
            }

        } catch (error) {
            notify("Error al cargar la ficha del alumno", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedStudent) return;
        try {
            const createdNote = await AdminService.createNote({
                alumnoId: selectedStudent._id,
                contenido: newNote
            }, admin.token);

            setProgressData(prev => ({ ...prev, notas: [createdNote, ...prev.notas] }));
            setNewNote("");
            notify("Observación guardada");
        } catch (error) {
            notify("No se pudo guardar la nota", "error");
        }
    };

    const chartData = [...progressData.historial].reverse().reduce((acc, session) => {
        if (!selectedExercise) return acc;

        const exerciseData = session.ejercicios?.find(
            ej => normalizarNombreEjercicio(ej.nombre) === normalizarNombreEjercicio(selectedExercise)
        );
        if (!exerciseData) return acc;

        const peso = resumirPeso(exerciseData, modoGrafico);
        if (peso > 0) {
            acc.push({
                fecha: new Date(session.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                peso,
                rutina: session.nombreSesion,
                series: Array.isArray(exerciseData.series) ? exerciseData.series : null
            });
        }
        return acc;
    }, []);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const punto = payload[0].payload;
            return (
                <div style={{ backgroundColor: '#111', padding: '10px', border: '1px solid #d4f039', borderRadius: '8px' }}>
                    <p style={{ color: '#888', margin: 0, fontSize: '0.8rem' }}>{label}</p>
                    <p style={{ color: '#fff', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                        {selectedExercise}: <span style={{ color: '#d4f039' }}>{payload[0].value} kg</span>
                        <span style={{ color: '#666', fontWeight: 'normal' }}> ({modoGrafico === 'volumen' ? 'volumen' : 'mejor serie'})</span>
                    </p>
                    {punto.series && punto.series.length > 0 && (
                        <p style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0 0 0' }}>
                            {punto.series.map((s, i) => (
                                <span key={i} style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#ccc', background: '#000', border: '1px solid #222', borderRadius: '6px', padding: '2px 6px' }}>
                                    S{s.numero} {s.peso}{s.reps !== undefined && s.reps !== null ? `×${s.reps}` : ''}
                                </span>
                            ))}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="progress-view-wrapper">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="search-bar-floating-container">
                <div className={`search-glass-pro ${filteredResults.length > 0 ? 'has-results' : ''}`}>
                    <FaSearch className="search-icon" />
                    <input
                        placeholder="Escribe nombre o DNI para buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {filteredResults.length > 0 && (
                    <div className="search-results-flyout">
                        {filteredResults.map(s => (
                            <div key={s._id} className="result-item-pro" onClick={() => loadStudentData(s)}>
                                <div className="res-avatar">{s.nombre.charAt(0)}</div>
                                <div className="res-info">
                                    <span className="res-name">{s.nombre}</span>
                                    <span className="res-dni">DNI: {s.dni}</span>
                                </div>
                                <FaChevronRight className="res-arrow" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-fullscreen"><FaSpinner className="spin neon-text" /></div>
            ) : selectedStudent ? (
                <div className="student-profile-active">
                    <header className="progress-header-oled">
                        <div className="profile-identity">
                            <div className="avatar-pro-glow">{selectedStudent.nombre.charAt(0)}</div>
                            <div className="identity-texts">
                                <h1>{selectedStudent.nombre}</h1>
                                <p>Plan: <strong>{selectedStudent.planActivoNombre || 'Sin Plan'}</strong></p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>Cambiar Alumno</Button>
                    </header>

                    <section className="analytics-dashboard">
                        <div className="main-chart-card">
                            <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3><FaDumbbell style={{ marginRight: '8px', color: '#d4f039' }} /> CURVA DE FUERZA (KG)</h3>
                                    <span className="stat-growth">SOBRECARGA PROGRESIVA</span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* NUEVO: con peso por serie, una sesión ya no es
                                        un solo número — hay que elegir qué mostrar
                                        (ver docs/CAMBIOS.md). Para logs viejos (sin
                                        series) el número es el mismo en los dos modos. */}
                                    <div className="modo-grafico-toggle" role="group" aria-label="Qué mostrar en el gráfico">
                                        <button
                                            type="button"
                                            className={modoGrafico === 'mejor' ? 'activo' : ''}
                                            onClick={() => setModoGrafico('mejor')}
                                        >
                                            Mejor serie
                                        </button>
                                        <button
                                            type="button"
                                            className={modoGrafico === 'volumen' ? 'activo' : ''}
                                            onClick={() => setModoGrafico('volumen')}
                                        >
                                            Volumen total
                                        </button>
                                    </div>

                                    {/* SELECTOR DE EJERCICIO */}
                                    {uniqueExercises.length > 0 && (
                                        <select
                                            style={{
                                                background: '#1a1a1a', color: '#fff', border: '1px solid #333',
                                                padding: '8px 15px', borderRadius: '8px', outline: 'none', cursor: 'pointer',
                                                fontFamily: 'Roboto', fontSize: '0.9rem'
                                            }}
                                            value={selectedExercise}
                                            onChange={(e) => setSelectedExercise(e.target.value)}
                                        >
                                            {uniqueExercises.map((ej, idx) => (
                                                <option key={idx} value={ej}>{ej}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="chart-area" style={{ marginTop: '20px' }}>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                            <XAxis dataKey="fecha" stroke="#666" fontSize={11} tickMargin={10} />
                                            <YAxis stroke="#666" fontSize={11} width={30} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 2 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="peso"
                                                stroke="#d4f039"
                                                strokeWidth={4}
                                                dot={{ r: 5, fill: '#000', stroke: '#d4f039', strokeWidth: 2 }}
                                                activeDot={{ r: 8, fill: '#d4f039', stroke: '#fff' }}
                                                animationDuration={1500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                        {uniqueExercises.length === 0
                                            ? "El alumno aún no ha registrado pesos en sus ejercicios."
                                            : "No hay registros de peso para este ejercicio específico."}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="quick-metrics-stack">
                            <div className="metric-box-pro">
                                <FaWeightHanging />
                                <label>
                                    {modoGrafico === 'volumen' ? 'MEJOR VOLUMEN' : 'RÉCORD ACTUAL'} ({selectedExercise || '---'})
                                </label>
                                <span style={{ color: '#d4f039' }}>
                                    {chartData.length > 0 ? Math.max(...chartData.map(d => d.peso)) : 0} kg
                                </span>
                            </div>
                            <div className="metric-box-pro">
                                <FaClock />
                                <label>SESIONES REGISTRADAS</label>
                                <span>{progressData.historial.length}</span>
                            </div>
                        </div>
                    </section>

                    <div className="detailed-data-split">
                        <section className="history-admin-section">
                            <div className="section-pro-title"><FaHistory /> <h3>Sesiones Completadas</h3></div>
                            {progressData.historial.map(h => (
                                <div key={h._id} className="history-card-admin">
                                    <span className="h-date-tag">{new Date(h.createdAt).toLocaleDateString()}</span>
                                    <h4>{h.nombreSesion}</h4>
                                    <div className="h-card-exercises">
                                        {h.ejercicios?.map((ej, i) => (
                                            <div key={i} className="ej-pill">{ej.nombre}: <strong style={{ color: '#d4f039' }}>{ej.pesoUsado}kg</strong></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="notes-admin-section">
                            <div className="section-pro-title"><FaStickyNote /> <h3>Observaciones Técnicas</h3></div>
                            <div className="note-input-pro">
                                <textarea placeholder="Añade recomendaciones técnicas o ajustes de carga..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                                <button className="btn-add-note-pro" onClick={handleAddNote}>Guardar Nota</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {progressData.notas.map(n => (
                                    <div key={n._id} className="note-item-pro">
                                        <span className="n-date">{new Date(n.fecha).toLocaleDateString()}</span>
                                        <p>{n.contenido}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                <div className="empty-selection-state">
                    <FaChartLine size={50} color="#222" style={{ marginBottom: '20px' }} />
                    <h2>Monitor de Alto Rendimiento</h2>
                    <p style={{ color: '#666' }}>Busca un alumno en la barra superior para analizar su curva de fuerza.</p>
                </div>
            )}
        </div>
    );
}