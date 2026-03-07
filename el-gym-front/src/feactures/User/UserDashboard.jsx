// src/feactures/User/UserDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contex/AuthContext';
import { WorkoutView } from './WorkoutView';
import { HomeHub } from './HomeHub';
import { HistoryView } from './HistoryView';
import { FaHome, FaHistory, FaCalendarAlt, FaQrcode, FaUserAlt } from 'react-icons/fa';
import './UserDashboard.css';

export function UserDashboard() {
    const { user } = useAuth();
    const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'history' | 'schedule'
    const [activeWorkout, setActiveWorkout] = useState(null);

    // --- ESTADO DEL HISTORIAL REAL ---
    const [history, setHistory] = useState([
        { id: 1, fecha: '18 MAY', nombre: 'Pecho y Tríceps', duracion: '45m', peso: '2.1k' },
    ]);

    // --- CONEXIÓN 1: Iniciar rutina desde HomeHub ---
    const handleStartWorkout = (session) => {
        // Nos aseguramos de que la sesión tenga bloques para que WorkoutView no falle
        const sessionWithData = {
            ...session,
            bloques: session.bloques || [
                { tipo: 'standard', descanso: 60, ejercicios: [{ id: 1, nombre: session.name, specs: "4x10", anterior: "0" }] }
            ]
        };
        setActiveWorkout(sessionWithData);
    };

    // --- CONEXIÓN 2: Guardar al finalizar desde WorkoutView ---
    const handleFinishWorkout = () => {
        const newEntry = {
            id: Date.now(),
            fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase(),
            nombre: activeWorkout.name,
            duracion: '40m', 
            peso: '---' 
        };
        
        setHistory([newEntry, ...history]); // Agregamos a la lista
        setActiveWorkout(null); // Cerramos el modo entrenamiento
        setCurrentTab('history'); // Navegamos automáticamente al historial
    };

    return (
        <div className="user-main-shell">
            {/* CAPA DE ENTRENAMIENTO ACTIVA (Tapa todo) */}
            {activeWorkout && (
                <WorkoutView 
                    session={activeWorkout} 
                    onExit={() => setActiveWorkout(null)}
                    onFinish={handleFinishWorkout}
                />
            )}

            {/* CONTENIDO PRINCIPAL SEGÚN EL TAB SELECCIONADO */}
            {!activeWorkout && (
                <>
                    <main className="main-content-scroll">
                        {currentTab === 'home' && (
                            <HomeHub user={user} onStart={handleStartWorkout} />
                        )}
                        {currentTab === 'history' && (
                            <HistoryView history={history} />
                        )}
                        {currentTab === 'schedule' && (
                            <div className="placeholder-view">Próximamente: Turnero</div>
                        )}
                    </main>

                    {/* NAV BAR ESTILO MOBILE NATIVA */}
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

                        <div className="nav-tab-center">
                            <button className="qr-fab"><FaQrcode /></button>
                        </div>

                        <button 
                            className={`nav-tab ${currentTab === 'schedule' ? 'active' : ''}`} 
                            onClick={() => setCurrentTab('schedule')}
                        >
                            <FaCalendarAlt /> <span>Turnos</span>
                        </button>

                        <button className="nav-tab">
                            <FaUserAlt /> <span>Perfil</span>
                        </button>
                    </nav>
                </>
            )}
        </div>
    );
}