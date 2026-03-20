import React, { useState, useMemo } from 'react';
import {
    FaClock, FaWeightHanging, FaTrophy, FaFire,
    FaHistory, FaChevronRight, FaTimes, FaCheckDouble
} from 'react-icons/fa';
import './HistoryView.css';

export function HistoryView({ history = [] }) {
    const [selectedLog, setSelectedLog] = useState(null);

    // 1. Formateador de Fechas dinámico
    const formatearFecha = (fechaIso) => {
        if (!fechaIso) return { dia: '-', mes: '-', completa: 'Fecha desconocida' };
        const date = new Date(fechaIso);
        return {
            dia: date.getDate(),
            mes: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
            completa: date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        };
    };

    // 2. Cálculo de Peso Total de una sesión
    const calcularPesoSesion = (ejercicios) => {
        if (!ejercicios || !Array.isArray(ejercicios)) return 0;
        return ejercicios.reduce((total, ex) => {
            const peso = parseFloat(ex.pesoUsado || ex.peso || 0);
            return total + peso;
        }, 0);
    };

    // 3. Lógica de Racha (Streak) Real
    const calcularRacha = useMemo(() => {
        if (!history.length) return 0;

        // Obtenemos fechas únicas (sin horas) y ordenadas de más reciente a más antigua
        const fechasUnicas = [...new Set(history.map(h =>
            new Date(h.createdAt).toISOString().split('T')[0]
        ))].sort((a, b) => new Date(b) - new Date(a));

        let racha = 0;
        let hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let fechaReferencia = new Date(fechasUnicas[0]);
        fechaReferencia.setHours(0, 0, 0, 0);

        // Si el último entreno fue hace más de 48h, la racha se rompió
        const diferenciaDiasHoy = (hoy - fechaReferencia) / (1000 * 60 * 60 * 24);
        if (diferenciaDiasHoy > 1) return 0;

        for (let i = 0; i < fechasUnicas.length; i++) {
            const actual = new Date(fechasUnicas[i]);
            const siguiente = fechasUnicas[i + 1] ? new Date(fechasUnicas[i + 1]) : null;

            racha++;

            if (siguiente) {
                const diff = (actual - siguiente) / (1000 * 60 * 60 * 24);
                if (diff !== 1) break; // Si no es exactamente el día anterior, paramos
            }
        }
        return racha;
    }, [history]);

    const formatearDuracion = (duracion) => {
        if (!duracion) return '0m';
        if (typeof duracion === 'number') {
            const minutos = Math.floor(duracion / 60);
            return minutos > 0 ? `${minutos}m` : `${duracion}s`;
        }
        return duracion;
    };

    return (
        <div className="history-oled-container">

            {/* --- CAPA DE DETALLE (SLIDE UP) --- */}
            {selectedLog && (
                <div className="history-detail-overlay">
                    <div className="detail-card-full">
                        <header className="detail-header">
                            <button className="btn-close-detail" onClick={() => setSelectedLog(null)}>
                                <FaTimes />
                            </button>
                            <div className="detail-title-group">
                                <span className="detail-date">{formatearFecha(selectedLog.createdAt).completa}</span>
                                <h2>{selectedLog.nombreSesion || selectedLog.nombre || "Sesión Completada"}</h2>
                            </div>
                        </header>

                        <div className="detail-stats-row">
                            <div className="d-stat">
                                <FaClock />
                                <span>{formatearDuracion(selectedLog.duracion)} Duración</span>
                            </div>
                            <div className="d-stat">
                                <FaWeightHanging />
                                <span>{calcularPesoSesion(selectedLog.ejercicios)} kg Movidos</span>
                            </div>
                        </div>

                        <div className="detail-exercises-list">
                            <label className="section-label">DESGLOSE DE CARGAS</label>

                            {selectedLog.ejercicios && selectedLog.ejercicios.length > 0 ? (
                                selectedLog.ejercicios.map((ex, idx) => (
                                    <div key={ex._id || idx} className="detail-ex-item">
                                        <div className="ex-info">
                                            <h4>{ex.nombre}</h4>
                                            <p>{ex.series || 0} series registradas</p>
                                        </div>
                                        <div className="ex-final-weight">
                                            <span>{ex.pesoUsado || ex.peso || 0}</span>
                                            <small>KG</small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-empty-mini">No hay detalles de ejercicios disponibles.</div>
                            )}
                        </div>

                        <footer className="detail-footer">
                            <div className="congrats-msg">
                                <FaCheckDouble className="text-neon" />
                                <span>Datos sincronizados con la nube</span>
                            </div>
                        </footer>
                    </div>
                </div>
            )}

            {/* --- LISTA PRINCIPAL --- */}
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
                        <span className="h-val">{calcularRacha} d</span>
                        <label>Racha Actual</label>
                    </div>
                </div>
            </section>

            <div className="h-list-section">
                <div className="h-list-title">ACTIVIDAD RECIENTE</div>
                <div className="h-items-stack">
                    {history.length > 0 ? (
                        [...history].reverse().map((log) => { // Reverse para ver los más nuevos primero
                            const fecha = formatearFecha(log.createdAt);
                            const pesoTotal = calcularPesoSesion(log.ejercicios);

                            return (
                                <div key={log._id || log.id} className="h-log-card" onClick={() => setSelectedLog(log)}>
                                    <div className="h-log-date">
                                        <span className="h-day">{fecha.dia}</span>
                                        <span className="h-month">{fecha.mes}</span>
                                    </div>
                                    <div className="h-log-content">
                                        <div className="h-log-info">
                                            <h3>{log.nombreSesion || log.nombre || "Sesión"}</h3>
                                            <div className="h-log-meta">
                                                <span><FaClock /> {formatearDuracion(log.duracion)}</span>
                                                {pesoTotal > 0 && (
                                                    <span><FaWeightHanging /> {pesoTotal} kg</span>
                                                )}
                                            </div>
                                        </div>
                                        <FaChevronRight className="h-arrow" />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-empty-state">
                            <FaHistory size={40} />
                            <p>Tu historial está vacío. ¡Empieza a entrenar hoy!</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="h-spacer" />
        </div>
    );
}