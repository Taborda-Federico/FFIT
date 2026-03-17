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
    const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'history' | 'profile'
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
        setActiveWorkout({ ...session, planTitle: dashboardData?.plan?.titulo });
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
                            const peso = Number(workoutResult[ej.id || ej._id]) || 0;
                            pesoTotalSuma += peso;
                            ejerciciosFormateados.push({
                                ejercicioId: ejId,
                                nombre: ej.nombre || 'Ejercicio',
                                pesoUsado: peso
                            });
                        });
                    }
                });
            }

            await StudentService.saveWorkout({
                nombreSesion: activeWorkout?.nombre || 'Rutina Completada',
                duracion: '45m',
                duracionMins: 45,
                pesoTotal: pesoTotalSuma,
                ejercicios: ejerciciosFormateados
            }, user.token);

            const updatedHistory = await StudentService.getHistory(user.token);
            setHistory(updatedHistory);
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

            {/* MODO ENTRENAMIENTO (CAPA SUPERIOR) */}
            {activeWorkout && (
                <WorkoutView
                    session={activeWorkout}
                    onExit={() => setActiveWorkout(null)}
                    onFinish={handleFinishWorkout}
                />
            )}

            {/* VISTAS DE NAVEGACIÓN */}
            {!activeWorkout && (
                <>
                    <main className="main-content-scroll">
                        {/* WIDGET SUPERIOR DE PROGRESO */}
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

                    {/* --- BARRA DE NAVEGACIÓN INFERIOR (3 ITEMS) --- */}
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