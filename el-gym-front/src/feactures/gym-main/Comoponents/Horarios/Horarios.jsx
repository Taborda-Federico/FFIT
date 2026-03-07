import React, { useState, useEffect } from 'react'; // 1. Importamos useEffect
import './Horarios.css';
import { FaCheck, FaTrashAlt, FaDumbbell, FaRunning, FaHeartbeat, FaTrophy, FaUnlockAlt } from 'react-icons/fa';

export function Horarios() {
    
    // --- DATOS (Igual que antes) ---
    const clasesDB = [
        { dia: 'Lunes', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Lunes', hora: '08:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Martes', hora: '07:30', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Martes', hora: '08:30', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Miércoles', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Miércoles', hora: '11:00', clase: 'Vital FFIT', tipo: 'salud' },
        { dia: 'Jueves', hora: '07:30', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Viernes', hora: '07:30', clase: 'Funcional FFIT', tipo: 'funcional' },
        { dia: 'Viernes', hora: '11:00', clase: 'Vital FFIT', tipo: 'salud' },
        { dia: 'Lunes', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Lunes', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        { dia: 'Lunes', hora: '20:00', clase: 'Entren. Híbrido', tipo: 'hibrido' },
        { dia: 'Martes', hora: '16:30', clase: 'Yoga Integral', tipo: 'salud' },
        { dia: 'Martes', hora: '18:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Martes', hora: '20:00', clase: 'HIIT FFIT', tipo: 'cardio' },
        { dia: 'Martes', hora: '21:00', clase: 'FFIT RX', tipo: 'avanzado' },
        { dia: 'Miércoles', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Miércoles', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        { dia: 'Jueves', hora: '16:30', clase: 'Yoga Integral', tipo: 'salud' },
        { dia: 'Jueves', hora: '18:00', clase: 'FFIT Performance', tipo: 'avanzado' },
        { dia: 'Jueves', hora: '20:00', clase: 'HIIT FFIT', tipo: 'cardio' },
        { dia: 'Viernes', hora: '15:00', clase: 'FFIT Cross', tipo: 'cross' },
        { dia: 'Viernes', hora: '18:00', clase: 'Intro FFIT', tipo: 'hibrido' },
        { dia: 'Viernes', hora: '21:00', clase: 'FFIT RX', tipo: 'avanzado' },
        { dia: 'Todos', hora: '09:00 - 21:00', clase: 'Gimnasio Libre', tipo: 'libre' },
    ];

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const objetivosOptions = [
        { id: 'fuerza', label: 'Fuerza y Músculo', icon: <FaDumbbell /> },
        { id: 'resistencia', label: 'Resistencia / Quema', icon: <FaRunning /> },
        { id: 'performance', label: 'Alto Rendimiento', icon: <FaTrophy /> },
        { id: 'salud', label: 'Salud y Mente', icon: <FaHeartbeat /> },
        { id: 'libre', label: 'Entrenamiento Libre', icon: <FaUnlockAlt /> }
    ];

    // --- ESTADOS ---
    const [objetivo, setObjetivo] = useState('');
    const [diasSeleccionados, setDiasSeleccionados] = useState([]); 
    const [cronograma, setCronograma] = useState(null); 

    // --- MANEJADORES DE CLICK ---
    const toggleDia = (dia) => {
        if (diasSeleccionados.includes(dia)) {
            setDiasSeleccionados(diasSeleccionados.filter(d => d !== dia));
        } else {
            setDiasSeleccionados([...diasSeleccionados, dia]);
        }
    };

    const toggleTodos = () => {
        if (diasSeleccionados.length === weekDays.length) {
            setDiasSeleccionados([]); 
        } else {
            setDiasSeleccionados(weekDays); 
        }
    };

    const limpiarFiltros = () => {
        setObjetivo('');
        setDiasSeleccionados([]);
        // No hace falta setCronograma(null) aquí porque el useEffect lo hará solo
    }

    // --- LA MAGIA: USE EFFECT ---
    useEffect(() => {
        // 1. Si faltan datos, limpiamos y salimos
        if (!objetivo || diasSeleccionados.length === 0) {
            setCronograma(null);
            return;
        }

        // 2. Lógica de Filtrado (La misma que tenías antes)
        let filtroPlano = clasesDB.filter(item => {
            const diaMatch = diasSeleccionados.includes(item.dia) || item.dia === 'Todos';
            
            let tipoMatch = false;
            if (objetivo === 'fuerza') tipoMatch = ['funcional', 'cross', 'avanzado'].includes(item.tipo);
            if (objetivo === 'resistencia') tipoMatch = ['hibrido', 'cardio', 'funcional'].includes(item.tipo);
            if (objetivo === 'salud') tipoMatch = ['salud', 'yoga', 'libre'].includes(item.tipo);
            if (objetivo === 'performance') tipoMatch = ['avanzado', 'rx', 'cross'].includes(item.tipo);
            if (objetivo === 'libre') tipoMatch = item.tipo === 'libre';

            return diaMatch && tipoMatch;
        });

        // 3. Lógica de Agrupamiento
        const agrupado = {};
        diasSeleccionados.forEach(d => agrupado[d] = []);

        filtroPlano.forEach(clase => {
            if (clase.dia === 'Todos') {
                diasSeleccionados.forEach(d => agrupado[d].push(clase));
            } else if (diasSeleccionados.includes(clase.dia)) {
                agrupado[clase.dia].push(clase);
            }
        });

        Object.keys(agrupado).forEach(dia => {
            agrupado[dia].sort((a, b) => a.hora.localeCompare(b.hora));
        });

        // 4. Actualizamos el estado automáticamente
        setCronograma(agrupado);

    }, [objetivo, diasSeleccionados]); // <--- AQUÍ ESTÁ LA CLAVE: Se ejecuta cuando esto cambia

    return (
        <div className="finder-container">
            <div className="finder-header">
                <h2 className="section-title">Armá tu Rutina Semanal</h2>
                <p className="section-subtitle">Seleccioná tu objetivo y los días. El plan se actualiza automáticamente.</p>
            </div>

            {/* Quitamos el onSubmit porque ya no usamos submit */}
            <form className="finder-form" onSubmit={(e) => e.preventDefault()}>
                
                {/* 1. OBJETIVO */}
                <div className="form-group full-width">
                    <label style={{marginBottom: '1rem'}}>1. ELEGÍ TU OBJETIVO PRINCIPAL</label>
                    <div className="days-grid">
                        {objetivosOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                className={`day-chip ${objetivo === opt.id ? 'active' : ''}`}
                                onClick={() => setObjetivo(opt.id)}
                            >
                                {opt.icon} {opt.label}
                                {objetivo === opt.id && <FaCheck className="check-icon" style={{marginLeft:'5px'}}/>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. DÍAS */}
                <div className="form-group full-width">
                    <label style={{marginBottom: '1rem'}}>2. ¿QUÉ DÍAS VENÍS?</label>
                    <div className="days-grid">
                        <button 
                            type="button"
                            className={`day-chip all-days ${diasSeleccionados.length === 5 ? 'active' : ''}`}
                            onClick={toggleTodos}
                        >
                            TODOS
                        </button>
                        {weekDays.map(dia => (
                            <button
                                key={dia}
                                type="button"
                                className={`day-chip ${diasSeleccionados.includes(dia) ? 'active' : ''}`}
                                onClick={() => toggleDia(dia)}
                            >
                                {dia.substring(0, 3)}
                                {diasSeleccionados.includes(dia) && <FaCheck className="check-icon"/>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN: Solo dejamos el de limpiar si hay resultados */}
                {cronograma && (
                    <div className="form-actions" style={{justifyContent: 'flex-end'}}>
                        <button 
                            type="button" 
                            className="btn-clear" 
                            onClick={limpiarFiltros} 
                            title="Limpiar Filtros"
                            style={{width: 'auto', padding: '0 20px', gap: '10px'}} // Ajuste visual rápido
                        >
                            LIMPIAR FILTROS <FaTrashAlt />
                        </button>
                    </div>
                )}
            </form>

            {/* --- RESULTADOS: EL CRONOGRAMA --- */}
            {cronograma && (
                <div className="schedule-container">
                    <h3 className="schedule-title">Tu Plan Sugerido:</h3>
                    <div className="schedule-columns">
                        {weekDays.map(dia => {
                            if (!diasSeleccionados.includes(dia)) return null;
                            const clasesDelDia = cronograma[dia] || [];
                            return (
                                <div key={dia} className="day-column">
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
                                            <div className="empty-day">Sin clases este día.</div>
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