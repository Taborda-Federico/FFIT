import React, { useState, useEffect } from 'react';
import {
    FaStopwatch, FaTimes, FaCheckCircle, FaVideo,
    FaTrophy, FaClock, FaPlay
} from 'react-icons/fa';
import { Button } from '../../Utils/Button';
import './WorkoutView.css';

// Entrada "en blanco" para un ejercicio que todavía no tiene ninguna serie
// cargada. `series` son las YA CONFIRMADAS (con "Finalizar Serie"); `pesoActual`
// y `repsActual` son lo que hay tipeado en los inputs para la serie EN CURSO.
function entradaVacia() {
    return { series: [], pesoActual: '', repsActual: '' };
}

// Migra un `ffit_workout_payload` guardado en localStorage al formato nuevo.
// Antes cada entrada era un string/número plano ("55"); ahora es un objeto
// { series, pesoActual, repsActual }. Si alguien tenía un entrenamiento a
// mitad de camino justo cuando se actualiza la app, esto evita que la
// pantalla explote al leer el localStorage viejo — se recupera el peso que
// ya tenía tipeado como punto de partida de la serie 1.
function normalizarPayload(crudo) {
    const normalizado = {};
    Object.entries(crudo || {}).forEach(([ejId, valor]) => {
        if (valor && typeof valor === 'object' && Array.isArray(valor.series)) {
            normalizado[ejId] = valor;
        } else {
            const pesoViejo = (typeof valor === 'string' || typeof valor === 'number') ? String(valor) : '';
            normalizado[ejId] = { series: [], pesoActual: pesoViejo, repsActual: '' };
        }
    });
    return normalizado;
}

export function WorkoutView({ session, onFinish, onExit }) {

    const [restTimer, setRestTimer] = useState(0);
    const [isRestActive, setIsRestActive] = useState(false);
    const [exerciseTimer, setExerciseTimer] = useState(null);


    const [workoutPayload, setWorkoutPayload] = useState(() => {
        const guardado = localStorage.getItem('ffit_workout_payload');
        return guardado ? normalizarPayload(JSON.parse(guardado)) : {};
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


    useEffect(() => {
        localStorage.setItem('ffit_workout_payload', JSON.stringify(workoutPayload));
        if (blockProgress) {
            localStorage.setItem('ffit_block_progress', JSON.stringify(blockProgress));
        }
    }, [workoutPayload, blockProgress]);


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

    const entradaDe = (ejId) => workoutPayload[ejId] || entradaVacia();

    const actualizarCampoActual = (ejId, campo, valor) => {
        setWorkoutPayload(prev => ({
            ...prev,
            [ejId]: { ...(prev[ejId] || entradaVacia()), [campo]: valor }
        }));
    };

    // ARREGLADO — pedido del cliente (ver docs/CAMBIOS.md): antes se
    // cargaba un solo peso por ejercicio para TODA la sesión, aunque el
    // peso real cambie serie a serie. Ahora, al finalizar cada serie, se
    // confirma el peso/reps tipeados para ESA serie puntual de cada
    // ejercicio del bloque, y el input de peso arranca la siguiente serie
    // precargado con el mismo valor (lo más común es repetir el peso; si
    // cambió, se toca y ya) — las repeticiones sí se vacían, porque varían
    // más seguido serie a serie.
    const handleSetCompletion = (bloqueIdx, maxSets, descanso, ejerciciosDelBloque, numeroDeSerie, esCircuito) => {
        const currentProgress = blockProgress[bloqueIdx];

        setWorkoutPayload(prev => {
            const next = { ...prev };
            (ejerciciosDelBloque || []).forEach(ej => {
                const ejId = ej._id || ej.id;
                const entrada = next[ejId] || entradaVacia();
                const nuevaSerie = {
                    numero: numeroDeSerie,
                    peso: Number(entrada.pesoActual) || 0,
                    reps: (!esCircuito && entrada.repsActual !== '') ? Number(entrada.repsActual) : undefined
                };
                next[ejId] = {
                    series: [...entrada.series, nuevaSerie],
                    pesoActual: entrada.pesoActual,
                    repsActual: ''
                };
            });
            return next;
        });

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


    const handleExit = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');
        onExit();
    };

    const handleFinish = () => {
        localStorage.removeItem('ffit_workout_payload');
        localStorage.removeItem('ffit_block_progress');

        onFinish(workoutPayload);
    };

    if (!blockProgress) return null;

    return (
        <div className="workout-view-active">

            {restTimer > 0 && (
                <div className="timer-overlay-fullscreen rest">
                    <div className="timer-content">
                        <FaStopwatch className="icon-pulse-accent" />
                        <span className="timer-label">RECUPERACIÓN</span>
                        <span className="big-timer">{restTimer}seg</span>
                        <button className="btn-skip-timer" onClick={() => setRestTimer(0)}>SALTAR</button>
                    </div>
                </div>
            )}

            {exerciseTimer && (
                <div className="timer-overlay-fullscreen work">
                    <div className="timer-content">
                        <FaClock className="icon-pulse-white" />
                        <span className="timer-label">TIEMPO BAJO TENSIÓN</span>
                        <span className="big-timer">{exerciseTimer.time}seg</span>
                        <button className="btn-skip-timer" onClick={() => setExerciseTimer(null)}>DETENER</button>
                    </div>
                </div>
            )}

            <header className="workout-sticky-header">
                <button className="btn-exit-workout" onClick={handleExit}><FaTimes /></button>
                <div className="nav-info-center">
                    <label>ENTRENAMIENTO ACTIVO</label>
                    <h3>{session.nombre}</h3>
                </div>
                <div className="live-status-dot"></div>
            </header>

            <main className="workout-content-scroll">
                {session.bloques.map((bloque, bIdx) => {
                    if (!bloque.ejercicios || bloque.ejercicios.length === 0) return null;
                    const esCircuito = bloque.tipo === 'circuit';
                    const maxSets = esCircuito ? Number(bloque.vueltas) : Number(bloque.ejercicios[0]?.series || 1);
                    const currentSet = blockProgress[bIdx];
                    const isFinished = currentSet > maxSets;

                    // Pedido explícito: no dejar cargar un peso sin su
                    // cantidad de repeticiones — antes se podía "Finalizar
                    // Serie" con las reps en blanco (o en 0), y esa serie
                    // quedaba sin registrar cuánto se repitió de verdad. Al
                    // menos 1 repetición tiene que estar cargada. En un
                    // circuito no aplica (son sets por tiempo, no por reps).
                    const faltanReps = !esCircuito && bloque.ejercicios.some(ej => {
                        const entrada = entradaDe(ej._id || ej.id);
                        return !(Number(entrada.repsActual) >= 1);
                    });

                    return (
                        <div key={bIdx} className={`workout-block-card-pro ${bloque.tipo} ${isFinished ? 'finished' : ''}`}>
                            <div className="block-header-row">
                                <span className={`badge-type ${bloque.tipo}`}>{esCircuito ? 'CIRCUITO' : bloque.tipo.toUpperCase()}</span>
                                <div className="set-counter-pill">
                                    {isFinished ? 'COMPLETADO' : `${esCircuito ? 'VUELTA' : 'SERIE'} ${currentSet} / ${maxSets}`}
                                </div>
                            </div>

                            <div className="block-exercises-stack">
                                {bloque.ejercicios.map((ej) => {
                                    // Mapeo dinámico del video desde el backend
                                    const videoLink = ej.video
                                    const ejId = ej._id || ej.id;
                                    const entrada = entradaDe(ejId);

                                    return (
                                        <div key={ejId} className="exercise-card-active">
                                            <div className="ex-title-row">
                                                <h4>{ej.nombre}</h4>
                                                {videoLink && (
                                                    <a href={videoLink} target="_blank" rel="noopener noreferrer" className="btn-technique-link">
                                                        <FaVideo />
                                                        <span>VER</span>
                                                    </a>
                                                )}
                                            </div>

                                            {ej.notas && <div className="ex-coach-note">{ej.notas}</div>}

                                            <div className="ex-metrics-row">
                                                {esCircuito ? (
                                                    <button
                                                        className="timer-trigger-btn"
                                                        onClick={() => !isFinished && startExerciseTimer(ejId, ej.tiempo)}
                                                    >
                                                        <FaPlay size={10} /> {ej.tiempo}seg
                                                    </button>
                                                ) : (
                                                    <span className="metric-tag">{ej.reps} reps</span>
                                                )}
                                                <span className="prev-weight-tag">Ant: {ej.pesoAnterior || 0}kg</span>
                                            </div>

                                            {entrada.series.length > 0 && (
                                                <div className="series-chips-row">
                                                    {entrada.series.map((s, i) => (
                                                        <span key={i} className="chip-serie">
                                                            S{s.numero} · {s.peso}kg{s.reps !== undefined ? ` × ${s.reps}` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="set-log-row">
                                                <span className="set-numero-badge">S{currentSet <= maxSets ? currentSet : maxSets}</span>
                                                <div className="mini-field-pill">
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        placeholder="0"
                                                        aria-label={`Peso serie ${currentSet} — ${ej.nombre}`}
                                                        value={entrada.pesoActual}
                                                        onChange={(e) => actualizarCampoActual(ejId, 'pesoActual', e.target.value)}
                                                        disabled={isFinished}
                                                    />
                                                    <label>KG</label>
                                                </div>
                                                {!esCircuito && (
                                                    <div className="mini-field-pill reps">
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            aria-label={`Repeticiones serie ${currentSet} — ${ej.nombre}`}
                                                            value={entrada.repsActual}
                                                            onChange={(e) => actualizarCampoActual(ejId, 'repsActual', e.target.value)}
                                                            disabled={isFinished}
                                                        />
                                                        <label>REPS</label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isFinished && faltanReps && (
                                <p className="aviso-faltan-reps">Cargá las repeticiones para poder finalizar la serie.</p>
                            )}

                            <button
                                className={`btn-finish-block-pro ${isFinished ? 'btn-done' : ''}`}
                                onClick={() => handleSetCompletion(bIdx, maxSets, bloque.descanso, bloque.ejercicios, currentSet, esCircuito)}
                                disabled={isFinished || faltanReps}
                            >
                                {isFinished ? <FaCheckCircle /> : `FINALIZAR ${esCircuito ? 'VUELTA' : 'SERIE'}`}
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
