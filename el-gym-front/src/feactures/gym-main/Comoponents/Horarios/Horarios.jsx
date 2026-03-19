import React, { useState, useEffect } from 'react';
import './Horarios.css';
import { FaCheck, FaTrashAlt, FaDumbbell, FaRunning, FaHeartbeat, FaTrophy, FaUnlockAlt, FaCalendarAlt } from 'react-icons/fa';

export function Horarios() {

    const clasesDB = [
        // --- 07:30 ---
        { dia: 'Lunes', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Martes', hora: '07:30', clase: 'Entren. Semipersonalizado', tipo: 'semipersonalizado' },
        { dia: 'Miércoles', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Jueves', hora: '07:30', clase: 'Entren. Semipersonalizado', tipo: 'semipersonalizado' },
        { dia: 'Viernes', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        // --- 08:30 ---
        { dia: 'Lunes', hora: '08:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Martes', hora: '08:30', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Miércoles', hora: '08:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Jueves', hora: '08:30', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Viernes', hora: '08:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        // --- 09:30 ---
        { dia: 'Lunes', hora: '09:30', clase: 'Entren. Semipersonalizado', tipo: 'semipersonalizado' },
        { dia: 'Martes', hora: '09:30', clase: 'Gimnasio Libre', tipo: 'libre' },
        { dia: 'Miércoles', hora: '09:30', clase: 'Entren. Semipersonalizado', tipo: 'semipersonalizado' },
        { dia: 'Jueves', hora: '09:30', clase: 'Gimnasio Libre', tipo: 'libre' },
        { dia: 'Viernes', hora: '09:30', clase: 'Entren. Semipersonalizado', tipo: 'semipersonalizado' },
        // --- 11:00 ---
        { dia: 'Miércoles', hora: '11:00', clase: 'Vital FFIT', tipo: 'salud' },
        { dia: 'Viernes', hora: '11:00', clase: 'Vital FFIT', tipo: 'salud' },
        // --- 15:00 ---
        { dia: 'Lunes', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Martes', hora: '15:00', clase: 'Gimnasio Libre', tipo: 'libre' },
        { dia: 'Miércoles', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Jueves', hora: '15:00', clase: 'Gimnasio Libre', tipo: 'libre' },
        { dia: 'Viernes', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        // --- 16:30 ---
        { dia: 'Lunes', hora: '16:30', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Martes', hora: '16:30', clase: 'Gimnasio Libre', tipo: 'libre' },
        { dia: 'Miércoles', hora: '16:30', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Jueves', hora: '16:30', clase: 'Yoga Integral', tipo: 'salud' },
        { dia: 'Viernes', hora: '16:30', clase: 'FFIT Cross', tipo: 'cross' },
        // --- 18:00 ---
        { dia: 'Lunes', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        { dia: 'Martes', hora: '18:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Miércoles', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        { dia: 'Jueves', hora: '18:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Viernes', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        // --- 19:00 ---
        { dia: 'Lunes', hora: '19:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Martes', hora: '19:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Miércoles', hora: '19:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Jueves', hora: '19:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Viernes', hora: '19:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        // --- 20:00 ---
        { dia: 'Lunes', hora: '20:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Martes', hora: '20:00', clase: 'HIIT FFIT', tipo: 'cardio' },
        { dia: 'Miércoles', hora: '20:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Jueves', hora: '20:00', clase: 'HIIT FFIT', tipo: 'cardio' },
        { dia: 'Viernes', hora: '20:00', clase: 'HIIT FFIT', tipo: 'cardio' },
        // --- 21:00 ---
        { dia: 'Martes', hora: '21:00', clase: 'FFIT RX', tipo: 'avanzado' },
        { dia: 'Jueves', hora: '21:00', clase: 'FFIT RX', tipo: 'avanzado' },
        { dia: 'Viernes', hora: '21:00', clase: 'FFIT RX', tipo: 'avanzado' }
    ];

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const objetivosOptions = [
        { id: 'fuerza', label: 'Fuerza y Músculo', icon: <FaDumbbell /> },
        { id: 'resistencia', label: 'Resistencia / Quema', icon: <FaRunning /> },
        { id: 'performance', label: 'Alto Rendimiento', icon: <FaTrophy /> },
        { id: 'salud', label: 'Salud y Mente', icon: <FaHeartbeat /> },
        { id: 'libre', label: 'Entrenamiento Libre', icon: <FaUnlockAlt /> }
    ];

    // ESTADOS PARA EL FILTRADOR
    const [objetivo, setObjetivo] = useState('');
    const [diasSeleccionados, setDiasSeleccionados] = useState([]);
    const [cronograma, setCronograma] = useState(null);

    const toggleDia = (dia) => {
        setDiasSeleccionados(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
    };

    const toggleTodos = () => {
        setDiasSeleccionados(diasSeleccionados.length === weekDays.length ? [] : weekDays);
    };

    const limpiarFiltros = () => {
        setObjetivo('');
        setDiasSeleccionados([]);
    }

    useEffect(() => {
        if (!objetivo || diasSeleccionados.length === 0) {
            setCronograma(null);
            return;
        }

        let filtroPlano = clasesDB.filter(item => {
            const diaMatch = diasSeleccionados.includes(item.dia);
            let tipoMatch = false;
            if (objetivo === 'fuerza') tipoMatch = ['funcional', 'cross', 'avanzado', 'semipersonalizado'].includes(item.tipo);
            if (objetivo === 'resistencia') tipoMatch = ['hibrido', 'cardio', 'funcional'].includes(item.tipo);
            if (objetivo === 'salud') tipoMatch = ['salud', 'yoga', 'libre'].includes(item.tipo);
            if (objetivo === 'performance') tipoMatch = ['avanzado', 'rx', 'cross'].includes(item.tipo);
            if (objetivo === 'libre') tipoMatch = item.tipo === 'libre';
            return diaMatch && tipoMatch;
        });

        const agrupado = {};
        diasSeleccionados.forEach(d => agrupado[d] = []);
        filtroPlano.forEach(clase => {
            if (diasSeleccionados.includes(clase.dia)) agrupado[clase.dia].push(clase);
        });
        setCronograma(agrupado);
    }, [objetivo, diasSeleccionados]);

    return (
        <div className="finder-container">

            {/* --- SECCIÓN 1: GRILLA GENERAL --- */}
            <div className="finder-header">
                <h2 className="section-title">Nuestros Horarios</h2>
                <p className="section-subtitle">Explora todas nuestras actividades de la semana</p>
            </div>

            <div className="schedule-columns full-grid">
                {weekDays.map(dia => (
                    <div key={dia} className="day-column">
                        <div className="day-header">{dia}</div>
                        <div className="day-body">
                            {clasesDB.filter(c => c.dia === dia).map((item, idx) => (
                                <div key={idx} className={`schedule-card type-${item.tipo}`}>
                                    <span className="sc-time">{item.hora}</span>
                                    <span className="sc-name">{item.clase}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="separator-neon">
                <span></span>
                <FaCalendarAlt />
                <span></span>
            </div>

            {/* --- SECCIÓN 2: ARMÁ TU RUTINA --- */}
            <div className="finder-header" style={{ marginTop: '2rem' }}>
                <h2 className="section-title">Armá tu Rutina</h2>
                <p className="section-subtitle">Seleccioná tu objetivo y días para una recomendación personalizada.</p>
            </div>

            <form className="finder-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group full-width">
                    <label>1. OBJETIVO PRINCIPAL</label>
                    <div className="days-grid">
                        {objetivosOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                className={`day-chip ${objetivo === opt.id ? 'active' : ''}`}
                                onClick={() => setObjetivo(opt.id)}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group full-width">
                    <label>2. ¿QUÉ DÍAS ENTRENÁS?</label>
                    <div className="days-grid">
                        <button type="button" className={`day-chip all-days ${diasSeleccionados.length === 5 ? 'active' : ''}`} onClick={toggleTodos}>TODOS</button>
                        {weekDays.map(dia => (
                            <button key={dia} type="button" className={`day-chip ${diasSeleccionados.includes(dia) ? 'active' : ''}`} onClick={() => toggleDia(dia)}>
                                {dia.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {cronograma && (
                    <div className="form-actions">
                        <button type="button" className="btn-clear" onClick={limpiarFiltros}>
                            LIMPIAR FILTROS <FaTrashAlt />
                        </button>
                    </div>
                )}
            </form>

            {cronograma && (
                <div className="schedule-container result-area">
                    <h3 className="schedule-title">Tu Plan Sugerido:</h3>
                    <div className="schedule-columns">
                        {weekDays.map(dia => {
                            if (!diasSeleccionados.includes(dia)) return null;
                            const clasesDelDia = cronograma[dia] || [];
                            return (
                                <div key={dia} className="day-column highlight">
                                    <div className="day-header">{dia}</div>
                                    <div className="day-body">
                                        {clasesDelDia.length > 0 ? (
                                            clasesDelDia.map((item, idx) => (
                                                <div key={idx} className={`schedule-card type-${item.tipo}`}>
                                                    <span className="sc-time">{item.hora}</span>
                                                    <span className="sc-name">{item.clase}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-day">No hay clases que coincidan con tu objetivo este día.</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}