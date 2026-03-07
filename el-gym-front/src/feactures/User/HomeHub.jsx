import React from 'react';
import { 
    FaPlay, FaChartLine, FaHistory, FaQrcode, 
    FaCalendarCheck, FaFire, FaWeightHanging 
} from 'react-icons/fa';
import './HomeHub.css';

export function HomeHub({ onStart }) {
    // Datos estáticos para previsualizar
    const userData = {
        name: "Fede",
        planTitle: "HIPERTROFIA AVANZADA V2",
        daysLeft: 12,
        sessions: [
            { id: 1, name: "Día 1: Pecho y Tríceps", blocks: 4, type: "Fuerza" },
            { id: 2, name: "Día 2: Espalda y Bíceps", blocks: 5, type: "Hipertrofia" },
            { id: 3, name: "Día 3: Piernas Power", blocks: 6, type: "Volumen" },
        ]
    };

    return (
        <div className="home-hub-container">
            
            {/* 1. HEADER: PERFIL Y ACCESO RÁPIDO */}
            <header className="hub-user-header">
                <div className="user-profile-meta">
                    <div className="avatar-neon-glow">{userData.name.charAt(0)}</div>
                    <div className="welcome-texts">
                        <p className="sub">BIENVENIDO DE VUELTA</p>
                        <h1>Hola, <span className="text-neon">{userData.name}</span></h1>
                    </div>
                </div>
                <button className="qr-shortcut-btn">
                    <FaQrcode />
                </button>
            </header>

            {/* 2. CARD DE ESTADO DE MEMBRESÍA */}
            <section className="membership-status-card">
                <div className="status-main">
                    <div className="status-info">
                        <label>ESTADO DE SOCIO</label>
                        <div className="status-badge-active">ACTIVO</div>
                        <p className="expiry-text">Tu plan vence en {userData.daysLeft} días</p>
                    </div>
                    <div className="neon-progress-circle">
                        <span className="days-big">{userData.daysLeft}</span>
                        <span className="days-lab">DÍAS</span>
                    </div>
                </div>
            </section>

            {/* 3. MÉTRICAS RÁPIDAS */}
            <section className="quick-stats-grid">
                <div className="q-stat-box">
                    <FaFire className="text-neon" />
                    <div className="q-data">
                        <span>12</span>
                        <label>Racha días</label>
                    </div>
                </div>
                <div className="q-stat-box">
                    <FaWeightHanging className="text-neon" />
                    <div className="q-data">
                        <span>+5kg</span>
                        <label>Progreso</label>
                    </div>
                </div>
            </section>

            {/* 4. SELECTOR DE SESIONES (ENTRENAMIENTO) */}
            <section className="workout-selector-section">
                <div className="section-header-hub">
                    <h2>Tu Rutina <span className="text-neon">Activa</span></h2>
                    <span className="plan-name-indicator">{userData.planTitle}</span>
                </div>

                <div className="sessions-vertical-stack">
                    {userData.sessions.map((session) => (
                        <div 
                            key={session.id} 
                            className="hub-session-card"
                            onClick={() => onStart(session)}
                        >
                            <div className="s-card-content">
                                <div className="s-card-info">
                                    <h3>{session.name}</h3>
                                    <div className="s-card-tags">
                                        <span className="tag-pill">{session.blocks} Bloques</span>
                                        <span className="tag-pill accent">{session.type}</span>
                                    </div>
                                </div>
                                <div className="s-card-action">
                                    <div className="play-btn-neon">
                                        <FaPlay />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ESPACIADOR PARA QUE LA NAV NO TAPE EL FINAL */}
            <div className="hub-footer-spacer"></div>
        </div>
    );
}