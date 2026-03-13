import React, { useState, useEffect } from 'react';
import { 
    FaStopwatch, FaTimes, FaCheckCircle, FaPlayCircle, 
    FaTrophy, FaSyncAlt, FaPlay, FaClock, FaLayerGroup 
} from 'react-icons/fa';
import { Button } from '../../Utils/Button'; 
import './WorkoutView.css';

export function WorkoutView({ session, onFinish, onExit }) {
    const [restTimer, setRestTimer] = useState(0);
    const [isRestActive, setIsRestActive] = useState(false);
    const [workTimer, setWorkTimer] = useState(0);
    const [isWorkActive, setIsWorkActive] = useState(false);
    
    // --- MAGIA ANTI-F5: Cargar datos desde la memoria ---
    const [workoutPayload, setWorkoutPayload] = useState(() => {
        const guardado = localStorage.getItem('ffit_workout_payload');
        return guardado ? JSON.parse(guardado) : {};
    });

    const [blockProgress, setBlockProgress] = useState(() => {
        const guardado = localStorage.getItem('ffit_block_progress');
        return guardado ? JSON.parse(guardado) : null;
    });

    // Inicializar el progreso solo si NO había nada en la memoria
    useEffect(() => {
        if (!blockProgress && session?.bloques) {
            const initialProgress = {};
            session.bloques.forEach((b, index) => {
                initialProgress[index] = 1;
            });
            setBlockProgress(initialProgress);
        }
    }, [session, blockProgress]);

    // Guardar en memoria automáticamente cada vez que el usuario escribe un peso o avanza una serie
    useEffect(() => {
        localStorage.setItem('ffit_workout_payload', JSON.stringify(workoutPayload));
    }, [workoutPayload]);

    useEffect(() => {
        if (blockProgress) {
            localStorage.setItem('ffit_block_progress', JSON.stringify(blockProgress));
        }
    }, [blockProgress]);

    // Lógica de cronómetros
    useEffect(() => {
        let interval = null;
        if (isRestActive && restTimer > 0) {
            interval = setInterval(() => setRestTimer(t => t - 1), 1000);
        } else if (restTimer === 0) {
            setIsRestActive(false);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRestActive, restTimer]);

    const startWork = (seconds) => {
        setWorkTimer(Number(seconds) || 30);
        setIsWorkActive(true);
    };

    const handleSetCompletion = (bloqueIdx, maxSets, descanso) => {
        if (blockProgress[bloqueIdx] >= maxSets) {
            setBlockProgress(prev => ({ ...prev, [bloqueIdx]: maxSets + 1 }));
            if (window.navigator.vibrate) window.navigator.vibrate([50, 50, 50]);
            return;
        }

        setBlockProgress(prev => ({
            ...prev,
            [bloqueIdx]: prev[bloqueIdx] + 1
        }));
        
        setRestTimer(Number(descanso) || 60);
        setIsRestActive(true);
        if (window.navigator.vibrate) window.navigator.vibrate(100);
    };

    // --- LIMPIEZA TOTAL: Al salir o terminar, borramos la memoria ---
    const handleExit = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');
        onExit();
    };

    // ESTA ES LA FUNCIÓN QUE FALTABA
    const handleFinish = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');
        
        // Aquí le enviamos el objeto con los pesos anotados al UserDashboard
        onFinish(workoutPayload); 
    };

    return (
        <div className="workout-active-layer">
            {/* OVERLAY DESCANSO */}
            {restTimer > 0 && (
                <div className="timer-overlay-fullscreen rest">
                    <div className="timer-content">
                        <FaStopwatch className="icon-spin-pro" />
                        <span className="big-timer">{restTimer}s</span>
                        <p className="timer-status">RECUPERACIÓN</p>
                        <button className="btn-skip-timer" onClick={() => setRestTimer(0)}>Saltar</button>
                    </div>
                </div>
            )}

            <header className="workout-top-bar">
                <button className="btn-exit-workout" onClick={handleExit}><FaTimes /></button>
                <div className="nav-info-center">
                    <label>SESIÓN ACTIVA</label>
                    <h3>{session.nombre}</h3>
                </div>
                <div className="live-dot"></div>
            </header>

            <main className="workout-content-scroll">
                {session.bloques.map((bloque, bIdx) => {
                    const maxSets = bloque.tipo === 'circuit' ? Number(bloque.vueltas) : Number(bloque.ejercicios[0]?.series || 1);
                    const currentSet = blockProgress ? blockProgress[bIdx] : 1;
                    const isFinished = currentSet > maxSets;

                    return (
                        <div key={bIdx} className={`workout-block-card-pro ${bloque.tipo} ${isFinished ? 'finished' : ''}`}>
                            
                            <div className="block-header-row">
                                <div className="badge-group">
                                    {bloque.tipo === 'superset' && <span className="badge-neon superset">SUPERSERIE</span>}
                                    {bloque.tipo === 'circuit' && <span className="badge-neon circuit">CIRCUITO</span>}
                                    {bloque.tipo === 'standard' && <span className="badge-neon standard">SERIE</span>}
                                </div>
                                
                                <div className={`set-counter-pill ${isFinished ? 'done' : ''}`}>
                                    {isFinished ? 'COMPLETADO' : `SERIE ${currentSet} / ${maxSets}`}
                                </div>
                            </div>
                            
                            <div className="block-exercises-stack">
                                {bloque.ejercicios.map((ej) => (
                                    <div key={ej.id || ej._id} className={`exercise-card-active ${isFinished ? 'dimmed' : ''}`}>
                                        <div className="ex-main-body">
                                            <div className="ex-info-side">
                                                <h4>{ej.nombre}</h4>
                                                <div className="ex-metrics-row">
                                                    {bloque.tipo === 'circuit' ? (
                                                        <span className="metric-tag time-trigger" onClick={() => !isFinished && startWork(ej.tiempo)}>{ej.tiempo}s</span>
                                                    ) : (
                                                        <span className="metric-text">{ej.reps} Reps</span>
                                                    )}
                                                    <span className="prev-weight-tag">Ant: {ej.pesoAnterior || '0'}kg</span>
                                                </div>
                                            </div>
                                            
                                            <div className="ex-weight-side">
                                                <div className="input-weight-pill">
                                                    <input 
                                                        type="number" 
                                                        placeholder="--" 
                                                        disabled={isFinished}
                                                        value={workoutPayload[ej.id || ej._id] || ''} 
                                                        onChange={(e) => setWorkoutPayload({...workoutPayload, [ej.id || ej._id]: e.target.value})}
                                                    />
                                                    <label>KG</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                className={`btn-finish-block-pro ${isFinished ? 'btn-done' : ''}`}
                                onClick={() => handleSetCompletion(bIdx, maxSets, bloque.descanso)}
                                disabled={isFinished}
                            >
                                {isFinished ? (
                                    <><FaCheckCircle /> BLOQUE TERMINADO</>
                                ) : (
                                    <><FaCheckCircle /> FINALIZAR SERIE {currentSet}</>
                                )}
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