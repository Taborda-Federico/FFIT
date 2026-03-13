import React, { useState } from 'react';
import { 
    FaClock, FaWeightHanging, FaTrophy, FaFire, 
    FaHistory, FaChevronRight, FaTimes, FaDumbbell, FaCheckDouble 
} from 'react-icons/fa';
import './HistoryView.css';

export function HistoryView({ history = [] }) {
    const [selectedLog, setSelectedLog] = useState(null);

    // Formateador de Fechas Reales de MongoDB
    const formatearFecha = (fechaIso) => {
        if (!fechaIso) return { dia: '-', mes: '-' };
        const date = new Date(fechaIso);
        return {
            dia: date.getDate(),
            mes: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
            completa: date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        };
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
                                <span className="detail-date">{formatearFecha(selectedLog.createdAt).completa}</span>
                                <h2>{selectedLog.nombreSesion || selectedLog.nombre}</h2>
                            </div>
                        </header>

                        <div className="detail-stats-row">
                            <div className="d-stat"><FaClock /> <span>{selectedLog.duracion || '45m'}</span></div>
                            <div className="d-stat"><FaWeightHanging /> <span>{selectedLog.pesoTotal || 0}kg Totales</span></div>
                        </div>

                        <div className="detail-exercises-list">
                            <label className="section-label">RESUMEN DE CARGAS (REALES)</label>
                            
                            {/* AQUÍ LEEMOS LOS EJERCICIOS REALES DE MONGODB */}
                            {selectedLog.ejercicios && selectedLog.ejercicios.length > 0 ? (
                                selectedLog.ejercicios.map(ex => (
                                    <div key={ex._id || Math.random()} className="detail-ex-item">
                                        <div className="ex-info">
                                            <h4>{ex.nombre}</h4>
                                            {/* Si en el futuro guardas series, las puedes poner aquí */}
                                            <p style={{color: '#888', fontSize: '0.8rem'}}>Carga máxima registrada</p>
                                        </div>
                                        <div className="ex-final-weight" style={{ color: '#BFFF00', fontWeight: 'bold' }}>
                                            <span>{ex.pesoUsado > 0 ? `${ex.pesoUsado} kg` : '-'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{color: '#666', textAlign: 'center', padding: '20px'}}>No se registraron cargas específicas.</p>
                            )}
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
                        <span className="h-val">Activa</span>
                        <label>Racha</label>
                    </div>
                </div>
            </section>

            <div className="h-list-section">
                <div className="h-list-title">ENTRENAMIENTOS PASADOS</div>
                <div className="h-items-stack">
                    {history.length > 0 ? history.map((log) => {
                        const fecha = formatearFecha(log.createdAt);
                        return (
                            <div key={log._id || log.id} className="h-log-card" onClick={() => setSelectedLog(log)}>
                                <div className="h-log-date">
                                    <span className="h-day">{fecha.dia}</span>
                                    <span className="h-month">{fecha.mes}</span>
                                </div>
                                <div className="h-log-content">
                                    <div className="h-log-info">
                                        <h3>{log.nombreSesion || log.nombre}</h3>
                                        <div className="h-log-meta">
                                            <span><FaClock /> {log.duracion || '45m'}</span>
                                            <span><FaWeightHanging /> {log.pesoTotal || 0} kg</span>
                                        </div>
                                    </div>
                                    <FaChevronRight className="h-arrow" />
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                            <FaHistory size={40} style={{ opacity: 0.3, marginBottom: '15px' }} />
                            <p>Aún no has registrado ningún entrenamiento.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="h-spacer" />
        </div>
    );
}