// src/feactures/User/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contex/AuthContext';
import { StudentService } from '../../service/student.service';
import { WorkoutView } from './WorkoutView';
import { HomeHub } from './HomeHub';
import { HistoryView } from './HistoryView';
import { ProfileView } from './ProfileView';
import { ConfirmModal } from '../../Utils/ConfirmModal';
import {
    FaHome,
    FaHistory,
    FaUserAlt,
    FaSpinner,
    FaCalendarCheck
} from 'react-icons/fa';
import './UserDashboard.css';

export function UserDashboard() {
    const { user } = useAuth();
    const [currentTab, setCurrentTab] = useState('home');
    const [modalConfig, setModalConfig] = useState(null);
    const [activeWorkout, setActiveWorkout] = useState(() => {
        const guardado = localStorage.getItem('ffit_active_workout');
        return guardado ? JSON.parse(guardado) : null;
    });

    // Persistencia de rutina para evitar pérdidas por recarga
    useEffect(() => {
        if (activeWorkout) {
            localStorage.setItem('ffit_active_workout', JSON.stringify(activeWorkout));
        } else {
            localStorage.removeItem('ffit_active_workout');
        }
    }, [activeWorkout]);

    const [dashboardData, setDashboardData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Carga de datos inicial del alumno
    useEffect(() => {
        if (!user?.token) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [dashData, histData] = await Promise.all([
                    StudentService.getDashboard(user.token),
                    StudentService.getHistory(user.token)
                ]);

                setDashboardData(dashData);
                setHistory(histData);
            } catch (error) {
                console.error("Error al cargar datos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleStartWorkout = (session) => {
        setActiveWorkout({ ...session, planTitle: dashboardData?.plan?.titulo, startTime: Date.now() });
    };

    const handleFinishWorkout = async (workoutResult) => {
        try {
            const ejerciciosFormateados = [];
            let pesoTotalSuma = 0;

            if (activeWorkout && activeWorkout.bloques) {
                activeWorkout.bloques.forEach(bloque => {
                    if (bloque.ejercicios) {
                        bloque.ejercicios.forEach(ej => {
                            const ejId = String(ej.id || ej._id || Math.random());
                            // ARREGLADO — pedido del cliente (ver docs/CAMBIOS.md):
                            // antes acá se leía un solo número de peso por
                            // ejercicio (workoutResult[ejId]). Ahora WorkoutView
                            // manda { series: [{numero, peso, reps}], ... } por
                            // ejercicio — el backend calcula pesoUsado solo (el
                            // máximo de las series), así que acá alcanza con
                            // reenviar el desglose tal cual.
                            const entrada = workoutResult[ej.id || ej._id];
                            const series = entrada?.series || [];
                            const pesoMaximo = series.length > 0 ? Math.max(...series.map(s => s.peso || 0)) : 0;
                            pesoTotalSuma += pesoMaximo;
                            ejerciciosFormateados.push({
                                ejercicioId: ejId,
                                nombre: ej.nombre || 'Ejercicio',
                                series
                            });
                        });
                    }
                });
            }

            let duracionStr = '1m';
            if (activeWorkout?.startTime) {
                const diffMs = Date.now() - activeWorkout.startTime;
                const duracionMins = Math.floor(diffMs / 60000);
                duracionStr = duracionMins > 0 ? `${duracionMins}m` : '1m';
            }

            await StudentService.saveWorkout({
                nombreSesion: activeWorkout?.nombre || 'Rutina Completada',
                // _id de la sesión puntual del plan (no del plan entero):
                // permite a HomeHub distinguir dos sesiones que por error
                // tengan el mismo nombre — ver docs/CAMBIOS.md.
                sesionId: activeWorkout?._id,
                duracion: duracionStr,
                duracionMins: duracionStr.replace('m', ''),
                pesoTotal: pesoTotalSuma,
                ejercicios: ejerciciosFormateados
            }, user.token);

            // Además del historial, se vuelve a pedir el dashboard (con el
            // plan) acá. Antes el plan solo se cargaba UNA VEZ, al entrar a
            // la app — si el admin lo editaba mientras el alumno estaba
            // entrenando, seguía viendo la versión vieja hasta cerrar
            // sesión y volver a entrar. Ahora, apenas termina ESE
            // entrenamiento, ya ve el plan editado (si el admin lo tocó
            // mientras tanto) o exactamente el mismo de siempre (si no lo
            // tocó) — en ningún caso se pierde nada de lo que acaba de
            // guardar, porque el WorkoutLog ya se guardó en el paso anterior
            // y es independiente del Plan.
            const [updatedHistory, updatedDashboard] = await Promise.all([
                StudentService.getHistory(user.token),
                StudentService.getDashboard(user.token)
            ]);
            setHistory(updatedHistory);
            setDashboardData(updatedDashboard);
            setActiveWorkout(null);
            setCurrentTab('history');

        } catch (error) {
            console.error("Error guardando el entrenamiento:", error);
            setModalConfig({
                isAlert: true,
                title: 'Error al Guardar',
                type: 'warning',
                message: "No se pudo guardar la rutina en el servidor."
            });
        }
    };

    if (loading) {
        return (
            <div className="user-loading-screen">
                <FaSpinner className="spin text-neon" />
            </div>
        );
    }

    return (
        <div className="user-main-shell">
            {modalConfig && (
                <ConfirmModal
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    isAlert={modalConfig.isAlert}
                    onClose={() => setModalConfig(null)}
                />
            )}


            {activeWorkout && (
                <WorkoutView
                    session={activeWorkout}
                    onExit={() => setActiveWorkout(null)}
                    onFinish={handleFinishWorkout}
                />
            )}


            {!activeWorkout && (
                <>
                    <main className="main-content-scroll">

                        {dashboardData?.plan && currentTab === 'home' && (
                            <div className="progress-widget-container">
                                <div className="pw-left">
                                    <FaCalendarCheck className="text-neon" />
                                    <div className="pw-info">
                                        <h4>{dashboardData.plan.titulo}</h4>
                                        <span>PROGRESO DEL PLAN</span>
                                    </div>
                                </div>
                                <div className="pw-right">
                                    <span className="weeks-num">{dashboardData.plan.semanasRestantes || 0}</span>
                                    <span className="weeks-label">SEMANAS</span>
                                </div>
                            </div>
                        )}

                        <div className="tab-view-content">
                            {currentTab === 'home' && (
                                <HomeHub dashboardData={dashboardData} onStart={handleStartWorkout} history={history} />
                            )}
                            {currentTab === 'history' && (
                                <HistoryView history={history} />
                            )}
                            {currentTab === 'profile' && (
                                <ProfileView userData={dashboardData} />
                            )}
                        </div>
                    </main>


                    <nav className="bottom-nav-oled">
                        <button
                            className={`nav-tab ${currentTab === 'home' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('home')}
                        >
                            <FaHome /> <span>Inicio</span>
                        </button>

                        <button
                            className={`nav-tab ${currentTab === 'history' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('history')}
                        >
                            <FaHistory /> <span>Historial</span>
                        </button>

                        <button
                            className={`nav-tab ${currentTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('profile')}
                        >
                            <FaUserAlt /> <span>Perfil</span>
                        </button>
                    </nav>
                </>
            )}
        </div>
    );
}