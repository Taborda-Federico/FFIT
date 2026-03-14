// src/feactures/User/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contex/AuthContext';
import { StudentService } from '../../service/student.service'; // <-- Importamos el nuevo servicio
import { WorkoutView } from './WorkoutView';
import { HomeHub } from './HomeHub';
import { HistoryView } from './HistoryView';
import { FaHome, FaHistory, FaCalendarAlt, FaQrcode, FaUserAlt, FaSpinner } from 'react-icons/fa';
import { ProfileView } from './ProfileView'
import { ConfirmModal } from '../../Utils/ConfirmModal';
import './UserDashboard.css';

export function UserDashboard() {
    const { user } = useAuth();
    const [currentTab, setCurrentTab] = useState('home');
    const [modalConfig, setModalConfig] = useState(null);
   const [activeWorkout, setActiveWorkout] = useState(() => {
        const guardado = localStorage.getItem('ffit_active_workout');
        return guardado ? JSON.parse(guardado) : null;
    });
useEffect(() => {
        if (activeWorkout) {
            localStorage.setItem('ffit_active_workout', JSON.stringify(activeWorkout));
        } else {
            localStorage.removeItem('ffit_active_workout');
        }
    }, [activeWorkout]);
    // --- NUEVOS ESTADOS DE LA BASE DE DATOS ---
    const [dashboardData, setDashboardData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar la información del alumno al entrar
    useEffect(() => {
        if (!user?.token) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                // Traemos el dashboard y el historial en paralelo para que sea más rápido
                const [dashData, histData] = await Promise.all([
                    StudentService.getDashboard(user.token),
                    StudentService.getHistory(user.token)
                ]);
                
                setDashboardData(dashData);
                setHistory(histData);
            } catch (error) {
                console.error("Error al cargar datos del alumno:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, currentTab]); // Si cambia de pestaña, podríamos refrescar, pero por ahora está bien así.

    // Iniciar entrenamiento (Pasamos la sesión completa a WorkoutView)
    const handleStartWorkout = (session) => {
        // Le agregamos el título del plan por si WorkoutView lo necesita
        setActiveWorkout({ ...session, planTitle: dashboardData?.plan?.titulo });
    };

const handleFinishWorkout = async (workoutResult) => {
        try {
            const ejerciciosFormateados = [];
            let pesoTotalSuma = 0;

            // 1. Escaneamos la sesión activa y armamos la lista exacta de ejercicios
            if (activeWorkout && activeWorkout.bloques) {
                activeWorkout.bloques.forEach(bloque => {
                    if (bloque.ejercicios) {
                        bloque.ejercicios.forEach(ej => {
                            // Obligamos a que el ID sea un String (Mongoose odia los números aquí)
                            const ejId = String(ej.id || ej._id || Math.random());
                            
                            // Si el alumno no anotó peso, mandamos 0 por defecto para que Mongoose no falle
                            const peso = Number(workoutResult[ej.id || ej._id]) || 0;
                            
                            pesoTotalSuma += peso;

                            ejerciciosFormateados.push({
                                ejercicioId: ejId,
                                nombre: ej.nombre || 'Ejercicio sin nombre',
                                pesoUsado: peso
                            });
                        });
                    }
                });
            }

            // 2. Enviamos TODAS las variables posibles para que cualquier versión de tu backend lo acepte
            await StudentService.saveWorkout({
                nombreSesion: activeWorkout?.nombre || 'Rutina Completada', 
                duracion: '45m', 
                duracionMins: 45,             // Por si tu modelo pide número
                pesoTotal: pesoTotalSuma,     // Por si tu modelo pide el peso global
                ejercicios: ejerciciosFormateados,         // Mapeo directo
                ejerciciosGrabados: ejerciciosFormateados  // Mapeo alternativo
            }, user.token);

            // 3. Refrescamos el historial en tiempo real
            const updatedHistory = await StudentService.getHistory(user.token);
            setHistory(updatedHistory);
            
            // 4. Limpiamos la pantalla y llevamos al alumno a su Logbook
            setActiveWorkout(null); 
            setCurrentTab('history'); 
            
        } catch (error) {
            console.error("Error guardando el entrenamiento:", error);
            setModalConfig({
                isAlert: true,
                title: 'Error al Guardar',
                type: 'warning',
                message: "No se pudo guardar la rutina. Revisa la consola de tu backend para ver el error de MongoDB."
            });
        }
    };
    if (loading) {
        return (
            <div className="user-main-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <FaSpinner className="spin text-neon" style={{ fontSize: '3rem' }} />
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
                        {currentTab === 'home' && (
                            // Pasamos los datos reales al HomeHub
                            <HomeHub dashboardData={dashboardData} onStart={handleStartWorkout} history={history}/>
                        )}
                        {currentTab === 'history' && (
                            <HistoryView history={history} />
                        )}
                        {currentTab === 'schedule' && (
                            <div className="placeholder-view" style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>Próximamente: Turnero</div>
                        )
                        }
                         {currentTab === 'profile' && <ProfileView userData={dashboardData} />}
                    </main>

                    <nav className="bottom-nav-oled">
                        <button className={`nav-tab ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
                            <FaHome /> <span>Inicio</span>
                        </button>
                        <button className={`nav-tab ${currentTab === 'history' ? 'active' : ''}`} onClick={() => setCurrentTab('history')}>
                            <FaHistory /> <span>Historial</span>
                        </button>
                        <div className="nav-tab-center">
                            <button className="qr-fab"><FaQrcode /></button>
                        </div>
                        <button className={`nav-tab ${currentTab === 'schedule' ? 'active' : ''}`} onClick={() => setCurrentTab('schedule')}>
                            <FaCalendarAlt /> <span>Turnos</span>
                        </button>
                        <button className="nav-tab" onClick={()=>setCurrentTab('profile')}>
                            <FaUserAlt /> <span>Perfil</span>
                        </button>
                    </nav>
                </>
            )}
        </div>
    );
}