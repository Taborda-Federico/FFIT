import React, { useState, useEffect } from 'react';
import { FaStopwatch, FaTimes, FaCheckCircle, FaPlayCircle, FaTrophy } from 'react-icons/fa';
import { Button } from '../../Utils/Button'; // Mantengo tu componente Button
import './WorkoutView.css';

export function WorkoutView({ session, onFinish, onExit }) {
    // Estado del Temporizador
    const [timer, setTimer] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    
    // Motor de Captura de Datos (Escalable para la Base de Datos)
    const [workoutPayload, setWorkoutPayload] = useState({});

    // Efecto del Temporizador
    useEffect(() => {
        let interval = null;
        if (isTimerActive && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (timer === 0) {
            setIsTimerActive(false);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, timer]);

    const startRest = (seconds) => {
        setTimer(seconds || 60);
        setIsTimerActive(true);
    };

    // Función para guardar lo que el usuario escribe en cada input
    const handleWeightChange = (exerciseId, value) => {
        setWorkoutPayload(prev => ({
            ...prev,
            [exerciseId]: value
        }));
    };

    // Función que procesa los datos antes de cerrar la vista
    const handleFinishClick = () => {
        // Sumamos todos los pesos registrados para sacar el "Volumen Total"
        // Convertimos a Number para evitar sumar strings ("10" + "20" = "1020")
        const totalWeight = Object.values(workoutPayload).reduce((acc, curr) => acc + Number(curr || 0), 0);
        
        // Enviamos al Dashboard los pesos detallados y el total calculado
        onFinish({
            detalles: workoutPayload,
            totalWeight: totalWeight
        });
    };

    return (
        <div className="workout-active-layer">
            {/* TIMER SUPERPUESTO */}
            {timer > 0 && (
                <div className="rest-overlay-fullscreen">
                    <div className="timer-display">
                        <FaStopwatch className="timer-icon-spin" />
                        <span className="seconds">{timer}s</span>
                        <p>DESCANSO ACTIVO</p>
                        <button className="btn-skip" onClick={() => setTimer(0)}>Omitir</button>
                    </div>
                </div>
            )}

            {/* CABECERA DE LA SESIÓN */}
            <header className="workout-nav">
                <button className="exit-circle" onClick={onExit}><FaTimes /></button>
                <div className="nav-titles">
                    <label>SESIÓN ACTIVA</label>
                    <h3>{session.nombre}</h3>
                </div>
            </header>

            {/* LISTA DE BLOQUES Y EJERCICIOS */}
            <main className="blocks-scroll">
                {session.bloques.map((bloque, idx) => (
                    <div key={idx} className={`workout-block ${bloque.tipo}`}>
                        {bloque.tipo === 'superset' && <div className="tag-neon-mini">SUPERSERIE</div>}
                        
                        {bloque.ejercicios.map(ej => (
                            <div key={ej.id} className="exercise-row-active">
                                <div className="ex-info">
                                    <div className="title-row">
                                        <h4>{ej.nombre}</h4>
                                        {ej.video && (
                                            <a href={ej.video} target="_blank" rel="noreferrer" className="play-tech">
                                                <FaPlayCircle />
                                            </a>
                                        )}
                                    </div>
                                    <p>{ej.specs} • <span>Ant: {ej.anterior}kg</span></p>
                                </div>
                                
                                {/* INPUT CONECTADO AL ESTADO DE REACT */}
                                <div className="weight-input-active">
                                    <input 
                                        type="number" 
                                        placeholder="KG" 
                                        value={workoutPayload[ej.id] || ''}
                                        onChange={(e) => handleWeightChange(ej.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}

                        <button className="btn-complete-block" onClick={() => startRest(bloque.descanso)}>
                            <FaCheckCircle /> COMPLETAR BLOQUE
                        </button>
                    </div>
                ))}

                {/* BOTÓN FINAL */}
                <div className="workout-footer">
                    <Button variant="primary" fullWidth size="lg" onClick={handleFinishClick}>
                        <FaTrophy /> FINALIZAR RUTINA
                    </Button>
                </div>
            </main>
        </div>
    );
}
export default WorkoutView;