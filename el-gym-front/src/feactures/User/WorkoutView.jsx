import React, { useState, useEffect } from 'react';
import {
    FaStopwatch, FaTimes, FaCheckCircle, FaVideo,
    FaTrophy, FaClock, FaPlay
} from 'react-icons/fa';
import { Button } from '../../Utils/Button';
import './WorkoutView.css';

export function WorkoutView({ session, onFinish, onExit }) {
    // --- ESTADOS DE CRONÓMETRO ---
    const [restTimer, setRestTimer] = useState(0);
    const [isRestActive, setIsRestActive] = useState(false);
    const [exerciseTimer, setExerciseTimer] = useState(null);

    // --- PERSISTENCIA (ANTI-F5) ---
    const [workoutPayload, setWorkoutPayload] = useState(() => {
        const guardado = localStorage.getItem('ffit_workout_payload');
        return guardado ? JSON.parse(guardado) : {};
    });

    const [blockProgress, setBlockProgress] = useState(() => {
        const guardado = localStorage.getItem('ffit_block_progress');
        return guardado ? JSON.parse(guardado) : null;
    });

    // Inicializar progreso
    useEffect(() => {
        if (!blockProgress && session?.bloques) {
            const initialProgress = {};
            session.bloques.forEach((b, index) => {
                initialProgress[index] = 1;
            });
            setBlockProgress(initialProgress);
        }
    }, [session, blockProgress]);

    // Guardar en Storage automáticamente
    useEffect(() => {
        localStorage.setItem('ffit_workout_payload', JSON.stringify(workoutPayload));
        if (blockProgress) {
            localStorage.setItem('ffit_block_progress', JSON.stringify(blockProgress));
        }
    }, [workoutPayload, blockProgress]);

    // Lógica del Temporizador (Descanso y Ejercicio)
    useEffect(() => {
        let interval = null;
        if (restTimer > 0) {
            interval = setInterval(() => setRestTimer(t => t - 1), 1000);
        } else if (restTimer === 0 && isRestActive) {
            setIsRestActive(false);
        }

        if (exerciseTimer && exerciseTimer.time > 0) {
            interval = setInterval(() => {
                setExerciseTimer(prev => ({ ...prev, time: prev.time - 1 }));
            }, 1000);
        } else if (exerciseTimer && exerciseTimer.time === 0) {
            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
            setExerciseTimer(null);
        }

        return () => clearInterval(interval);
    }, [restTimer, exerciseTimer, isRestActive]);

    const startExerciseTimer = (id, seconds) => {
        if (!seconds || seconds <= 0) return;
        setExerciseTimer({ id, time: parseInt(seconds) });
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    };

    const handleSetCompletion = (bloqueIdx, maxSets, descanso) => {
        const currentProgress = blockProgress[bloqueIdx];
        if (currentProgress >= maxSets) {
            setBlockProgress(prev => ({ ...prev, [bloqueIdx]: maxSets + 1 }));
            return;
        }

        setBlockProgress(prev => ({ ...prev, [bloqueIdx]: currentProgress + 1 }));

        if (descanso > 0) {
            setRestTimer(Number(descanso));
            setIsRestActive(true);
        }
        if (window.navigator.vibrate) window.navigator.vibrate(100);
    };

    // 🚨 AQUÍ ESTÁ LA SOLUCIÓN DEL ERROR: Funciones para salir y finalizar 🚨
    const handleExit = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');
        onExit(); // Llama a la función del padre para cerrar la vista
    };

    const handleFinish = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');
        // Le mandamos los pesos registrados al UserDashboard para que los guarde en la BD
        onFinish(workoutPayload);
    };

    if (!blockProgress) return null;

    return (
        <div className="workout-view-active">
            {/* OVERLAY DE DESCANSO */}
            {restTimer > 0 && (
                <div className="timer-overlay-fullscreen rest">
                    <div className="timer-content">
                        <FaStopwatch className="icon-pulse-accent" />
                        <span className="timer-label">RECUPERACIÓN</span>
                        <span className="big-timer">{restTimer}s</span>
                        <button className="btn-skip-timer" onClick={() => setRestTimer(0)}>SALTAR</button>
                    </div>
                </div>
            )}

            {/* OVERLAY DE EJERCICIO (CIRCUITO) */}
            {exerciseTimer && (
                <div className="timer-overlay-fullscreen work">
                    <div className="timer-content">
                        <FaClock className="icon-pulse-white" />
                        <span className="timer-label">TIEMPO BAJO TENSIÓN</span>
                        <span className="big-timer">{exerciseTimer.time}s</span>
                        <button className="btn-skip-timer" onClick={() => setExerciseTimer(null)}>DETENER</button>
                    </div>
                </div>
            )}

            <header className="workout-sticky-header">
                {/* Usamos handleExit para que limpie la memoria al salir */}
                <button className="btn-exit-workout" onClick={handleExit}><FaTimes /></button>
                <div className="nav-info-center">
                    <label>ENTRENAMIENTO ACTIVO</label>
                    <h3>{session.nombre}</h3>
                </div>
                <div className="live-status-dot"></div>
            </header>

            <main className="workout-content-scroll">
                {session.bloques.map((bloque, bIdx) => {
                    const maxSets = bloque.tipo === 'circuit' ? Number(bloque.vueltas) : Number(bloque.ejercicios[0]?.series || 1);
                    const currentSet = blockProgress[bIdx];
                    const isFinished = currentSet > maxSets;

                    return (
                        <div key={bIdx} className={`workout-block-card-pro ${bloque.tipo} ${isFinished ? 'finished' : ''}`}>
                            <div className="block-header-row">
                                <span className={`badge-type ${bloque.tipo}`}>{bloque.tipo === 'circuit' ? 'CIRCUITO' : bloque.tipo.toUpperCase()}</span>
                                <div className="set-counter-pill">
                                    {isFinished ? 'COMPLETADO' : `${bloque.tipo === 'circuit' ? 'VUELTA' : 'SERIE'} ${currentSet} / ${maxSets}`}
                                </div>
                            </div>

                            <div className="block-exercises-stack">
                                {bloque.ejercicios.map((ej) => {
                                    // Mapeo dinámico del video desde el backend
                                    const videoLink = ej.video

                                    return (
                                        <div key={ej._id || ej.id} className="exercise-card-active">
                                            <div className="ex-main-body">
                                                <div className="ex-info-side">
                                                    <div className="ex-title-row">
                                                        <h4>{ej.nombre}</h4>
                                                        {/* SECCIÓN DE URL/VIDEO */}
                                                        {videoLink && (
                                                            <a href={videoLink} target="_blank" rel="noopener noreferrer" className="btn-technique-link">
                                                                <FaVideo />
                                                                <span>VER</span>
                                                            </a>
                                                        )}
                                                    </div>

                                                    {ej.notas && <div className="ex-coach-note">{ej.notas}</div>}

                                                    <div className="ex-metrics-row">
                                                        {bloque.tipo === 'circuit' ? (
                                                            <button
                                                                className="timer-trigger-btn"
                                                                onClick={() => !isFinished && startExerciseTimer(ej._id || ej.id, ej.tiempo)}
                                                            >
                                                                <FaPlay size={10} /> {ej.tiempo}s
                                                            </button>
                                                        ) : (
                                                            <span className="metric-tag">{ej.reps} reps</span>
                                                        )}
                                                        <span className="prev-weight-tag">Ant: {ej.pesoAnterior || 0}kg</span>
                                                    </div>
                                                </div>

                                                <div className="ex-weight-side">
                                                    <div className="input-weight-pill">
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            placeholder="0"
                                                            value={workoutPayload[ej._id || ej.id] || ''}
                                                            onChange={(e) => setWorkoutPayload({
                                                                ...workoutPayload,
                                                                [ej._id || ej.id]: e.target.value
                                                            })}
                                                            disabled={isFinished}
                                                        />
                                                        <label>KG</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className={`btn-finish-block-pro ${isFinished ? 'btn-done' : ''}`}
                                onClick={() => handleSetCompletion(bIdx, maxSets, bloque.descanso)}
                                disabled={isFinished}
                            >
                                {isFinished ? <FaCheckCircle /> : `FINALIZAR ${bloque.tipo === 'circuit' ? 'VUELTA' : 'SERIE'}`}
                            </button>
                        </div>
                    );
                })}

                <div className="workout-end-trigger">
                    <Button variant="primary" fullWidth size="lg" onClick={handleFinish}>
                        <FaTrophy /> FINALIZAR ENTRENAMIENTO
                    </Button>
                </div>
            </main>
        </div>
    );
}