import React from 'react';
import {
    FaPlay, FaChartLine, FaHistory,
    FaCalendarCheck, FaFire, FaWeightHanging, FaDumbbell, FaCheckCircle
} from 'react-icons/fa';
import './HomeHub.css';

export function HomeHub({ onStart, dashboardData, history = [] }) {
    if (!dashboardData) return null;

    const { user, stats, plan } = dashboardData;

    // --- LÓGICA DE BLOQUEO DE RUTINA (UX) ---

    // 1. Validar si YA ENTRENÓ HOY (cualquier sesión)
    const hoyString = new Date().toDateString();
    const yaEntrenoHoy = history.some(log => new Date(log.createdAt).toDateString() === hoyString);

    // 2. Verifica si la sesión se completó esta semana (reinicia el domingo)
    const isSessionCompleted = (sessionName) => {
        if (!history || history.length === 0) return false;

        // Calculamos el inicio de la semana (Domingo a las 00:00)
        const hoy = new Date();
        const diaDeLaSemana = hoy.getDay();
        const inicioDeSemana = new Date(hoy);
        inicioDeSemana.setDate(hoy.getDate() - diaDeLaSemana);
        inicioDeSemana.setHours(0, 0, 0, 0);

        // Obtenemos cuándo se asignó ESTE plan nuevo (evita "fantasmas" de planes anteriores)
        const fechaPlan = plan && plan.createdAt ? new Date(plan.createdAt) : new Date(0);

        return history.some(log => {
            const fechaLog = new Date(log.createdAt);
            // Comparamos que se llame igual, que sea de esta semana y DESPUÉS de asignar el plan
            return (
                log.nombreSesion === sessionName &&
                fechaLog >= inicioDeSemana &&
                fechaLog >= fechaPlan
            );
        });
    };

    return (
        <div className="home-hub-container">

            <header className="hub-user-header">
                <div className="user-profile-meta">
                    <div className="avatar-neon-glow">{user.nombre.charAt(0).toUpperCase()}</div>
                    <div className="welcome-texts">
                        <p className="sub">BIENVENIDO DE VUELTA</p>
                        <h1>Hola, <span className="text-neon">{user.nombre.split(' ')[0]}</span></h1>
                    </div>
                </div>
                <button className="qr-shortcut-btn">
                    <img src="/logo ffit wellness blanco y lima.PNG" alt="FFIT Logo" className="qr-hub-logo" />
                </button>
            </header>

            <section className="membership-status-card">
                <div className="status-main">
                    <div className="status-info">
                        <label>ESTADO DE SOCIO</label>
                        <div className={`status-badge-active ${user.estado === 'VENCIDO' ? 'debt' : ''}`} style={{ backgroundColor: user.estado === 'VENCIDO' ? '#ff4444' : '' }}>
                            {user.estado}
                        </div>
                        <p className="expiry-text">
                            {user.diasRestantes > 0
                                ? `Tu plan vence en ${user.diasRestantes} días`
                                : 'Tu cuota mensual está vencida'}
                        </p>
                    </div>
                    <div className="neon-progress-circle" style={{ borderColor: user.estado === 'VENCIDO' ? '#ff4444' : '' }}>
                        <span className="days-big">{user.diasRestantes}</span>
                        <span className="days-lab">DÍAS</span>
                    </div>
                </div>
            </section>

            <section className="quick-stats-grid">
                <div className="q-stat-box">
                    <FaFire className="text-neon" />
                    <div className="q-data">
                        <span>{stats.sesionesCompletadas}</span>
                        <label>Sesiones Totales</label>
                    </div>
                </div>
                <div className="q-stat-box">
                    <FaWeightHanging className="text-neon" />
                    <div className="q-data">
                        <span>Activo</span>
                        <label>Progreso</label>
                    </div>
                </div>
            </section>

            <section className="workout-selector-section">
                <div className="section-header-hub">
                    <h2>Tu Rutina <span className="text-neon">Activa</span></h2>
                    <span className="plan-name-indicator">{plan ? plan.titulo : 'Sin plan asignado'}</span>
                </div>

                <div className="sessions-vertical-stack">
                    {plan && plan.sesiones && plan.sesiones.length > 0 ? (
                        plan.sesiones.map((session, index) => {
                            // Variables de estado del día
                            const isDone = isSessionCompleted(session.nombre);
                            // Se bloquea si ya está hecha, O si no la hizo pero ya entrenó otra sesión hoy
                            const isBlocked = isDone || (!isDone && yaEntrenoHoy);

                            return (
                                <div
                                    key={session._id || index}
                                    className="hub-session-card"
                                    onClick={() => !isBlocked && onStart(session)} // Bloqueamos el click si corresponde
                                    style={{
                                        opacity: isBlocked ? 0.6 : 1, // Opacamos si no se puede clickear
                                        cursor: isBlocked ? 'default' : 'pointer',
                                        border: isDone ? '1px solid rgba(191, 255, 0, 0.2)' : ''
                                    }}
                                >
                                    <div className="s-card-content">
                                        <div className="s-card-info">
                                            <h3 style={{ color: isDone ? '#BFFF00' : 'white' }}>{session.nombre}</h3>
                                            <div className="s-card-tags">
                                                <span className="tag-pill">{session.bloques?.length || 0} Bloques</span>
                                                <span className="tag-pill accent">
                                                    {isDone ? 'COMPLETADA' : (isBlocked ? 'ESPERA A MAÑANA' : 'Fuerza / Hipertrofia')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="s-card-action">
                                            {/* Si está terminada, mostramos un Check. Si no, el Play */}
                                            {isDone ? (
                                                <FaCheckCircle style={{ color: '#BFFF00', fontSize: '1.8rem', opacity: 0.8 }} />
                                            ) : (
                                                <div className="play-btn-neon" style={{ opacity: isBlocked ? 0.3 : 1 }}>
                                                    <FaPlay />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#888', background: '#111', borderRadius: '15px' }}>
                            <FaDumbbell size={30} style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <p>No tienes ninguna rutina asignada aún.</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>Pídele a tu entrenador que te asigne un plan.</p>
                        </div>
                    )}
                </div>
            </section>

            <div className="hub-footer-spacer"></div>
        </div>
    );
}