import React, { useState } from 'react';
import { 
    FaClock, FaWeightHanging, FaTrophy, FaFire, 
    FaHistory, FaChevronRight, FaTimes, FaDumbbell, FaCheckDouble 
} from 'react-icons/fa';
import './HistoryView.css';

export function HistoryView({ history = [] }) {
    const [selectedLog, setSelectedLog] = useState(null);

    // Datos extendidos simulados para el detalle
    const getWorkoutDetails = (log) => {
        // En una app real esto vendría de una base de datos filtrando por ID
        return [
            { id: 1, name: "Press de Banca Plano", sets: 4, weight: "70kg", reps: 10 },
            { id: 2, name: "Aperturas Mancuernas", sets: 3, weight: "15kg", reps: 12 },
            { id: 3, name: "Press Francés", sets: 4, weight: "30kg", reps: 12 }
        ];
    };

    return (
        <div className="history-oled-container">
            
            {/* --- CAPA DE DETALLE (SLIDE UP) --- */}
            {selectedLog && (
                <div className="history-detail-overlay">
                    <div className="detail-card-full">
                        <header className="detail-header">
                            <div>
                            <button className="btn-close-detail" onClick={() => setSelectedLog(null)}>
                                <FaTimes />

                            </button>
                            </div>
                            <div className="detail-title-group">
                                <span className="detail-date">{selectedLog.fecha}</span>
                                <h2>{selectedLog.nombre}</h2>
                            </div>
                        </header>

                        <div className="detail-stats-row">
                            <div className="d-stat"><FaClock /> <span>{selectedLog.duracion}</span></div>
                            <div className="d-stat"><FaWeightHanging /> <span>{selectedLog.peso} Totales</span></div>
                        </div>

                        <div className="detail-exercises-list">
                            <label className="section-label">RESUMEN DE CARGAS</label>
                            {getWorkoutDetails(selectedLog).map(ex => (
                                <div key={ex.id} className="detail-ex-item">
                                    <div className="ex-info">
                                        <h4>{ex.name}</h4>
                                        <p>{ex.sets} series x {ex.reps} reps</p>
                                    </div>
                                    <div className="ex-final-weight">
                                        <span>{ex.weight}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer className="detail-footer">
                            <div className="congrats-msg">
                                <FaCheckDouble className="text-neon" />
                                <span>¡Objetivo cumplido para este día!</span>
                            </div>
                        </footer>
                    </div>
                </div>
            )}

            {/* --- LISTA DE HISTORIAL PRINCIPAL --- */}
            <header className="h-oled-header">
                <p className="h-subtitle">LOGBOOK PERSONAL</p>
                <h1>Tu <span className="text-neon">Evolución</span></h1>
            </header>

            <section className="h-insights-grid">
                <div className="h-insight-item">
                    <div className="h-icon-box"><FaTrophy /></div>
                    <div className="h-data">
                        <span className="h-val">{history.length}</span>
                        <label>Sesiones</label>
                    </div>
                </div>
                <div className="h-insight-item">
                    <div className="h-icon-box"><FaFire /></div>
                    <div className="h-data">
                        <span className="h-val">12</span>
                        <label>Racha</label>
                    </div>
                </div>
            </section>

            <div className="h-list-section">
                <div className="h-list-title">ENTRENAMIENTOS PASADOS</div>
                <div className="h-items-stack">
                    {history.map((log) => (
                        <div key={log.id} className="h-log-card" onClick={() => setSelectedLog(log)}>
                            <div className="h-log-date">
                                <span className="h-day">{log.fecha.split(' ')[0]}</span>
                                <span className="h-month">{log.fecha.split(' ')[1]}</span>
                            </div>
                            <div className="h-log-content">
                                <div className="h-log-info">
                                    <h3>{log.nombre}</h3>
                                    <div className="h-log-meta">
                                        <span><FaClock /> {log.duracion}</span>
                                        <span><FaWeightHanging /> {log.peso}</span>
                                    </div>
                                </div>
                                <FaChevronRight className="h-arrow" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-spacer" />
        </div>
    );
}