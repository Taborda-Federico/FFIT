import React from 'react';
import {
    FaUserCircle, FaIdCard, FaEnvelope, FaSignOutAlt,
    FaShieldAlt, FaQuestionCircle, FaCrown, FaCalendarAlt, FaWeight, FaRulerVertical
} from 'react-icons/fa';
import { useAuth } from '../../contex/AuthContext';
import './ProfileView.css';

export function ProfileView({ userData }) {
    const { logout } = useAuth();

    // Si no hay datos aún, evitamos que la pantalla explote
    if (!userData || !userData.user) return null;

    const { user, stats } = userData;

    // Función para poner la fecha de ingreso bonita (ej: "Marzo 2024")
    const formatearMesAnio = (fechaIso) => {
        if (!fechaIso) return '---';
        const date = new Date(fechaIso);
        const mes = date.toLocaleDateString('es-ES', { month: 'long' });
        const anio = date.getFullYear();
        return `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${anio}`;
    };

    const formatearFechaExacta = (fechaIso) => {
        if (!fechaIso) return '---';
        return new Date(fechaIso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="profile-page-container">
            {/* 1. HEADER: IDENTIDAD */}
            <header className="profile-hero">
                <div className="avatar-huge">
                    <FaUserCircle />
                    {user.estado === 'ACTIVO' && <div className="status-badge-online"></div>}
                </div>
                <div className="hero-info">
                    <h1>{user.nombre} <span className="text-neon">FFIT+</span></h1>
                    <div className="rank-badge">
                        <FaCrown style={{ color: user.estado === 'ACTIVO' ? '#d4f039' : '#ff4444' }} />
                        <span>{user.estado === 'ACTIVO' ? 'SOCIO ACTIVO' : 'SOCIO VENCIDO'}</span>
                    </div>
                </div>
            </header>

            {/* 2. CARD DE MEMBRESÍA (INFO CRÍTICA) */}
            <section className="membership-profile-card">
                <div className="m-card-header">
                    <FaShieldAlt className="text-neon" />
                    <h3>Estado de Membresía</h3>
                </div>
                <div className="m-card-body">
                    <div className="m-item">
                        <label>VENCIMIENTO</label>
                        <span>{formatearFechaExacta(user.fechaVencimiento)}</span>
                    </div>
                    <div className="m-item">
                        <label>DÍAS RESTANTES</label>
                        <span className="text-neon" style={{ color: user.estado === 'VENCIDO' ? '#ff4444' : '' }}>
                            {user.diasRestantes} Días
                        </span>
                    </div>
                </div>
            </section>

            {/* 3. FICHA PERSONAL */}
            <section className="personal-info-section">
                <label className="section-label-profile">DATOS PERSONALES Y FÍSICOS</label>

                <div className="info-list-glass">
                    <div className="info-row">
                        <FaEnvelope />
                        <div className="info-text">
                            <label>Correo Electrónico</label>
                            <span>{user.email || '---'}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <FaIdCard />
                        <div className="info-text">
                            <label>DNI / Identificación</label>
                            <span>{user.dni || '---'}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%' }}>
                            <div className="info-text" style={{ flex: 1, minWidth: '120px' }}>
                                <label><FaWeight style={{ marginRight: '5px', color: '#BFFF00' }} /> Peso Inicial</label>
                                <span>{user.peso ? `${user.peso} kg` : '---'}</span>
                            </div>
                            <div className="info-text" style={{ flex: 1, minWidth: '120px' }}>
                                <label><FaRulerVertical style={{ marginRight: '5px', color: '#BFFF00' }} /> Altura</label>
                                <span>{user.altura ? `${user.altura} cm` : '---'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="info-row">
                        <FaCalendarAlt />
                        <div className="info-text">
                            <label>Socio de FFIT+ desde</label>
                            <span className="text-neon">{formatearMesAnio(user.fechaIngreso)}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. ACCIONES DE CUENTA */}
            <section className="profile-actions-area">
                <button className="btn-action-outline">
                    <FaQuestionCircle /> Soporte Técnico o WhatsApp
                </button>

                <button className="btn-logout-pro" onClick={logout}>
                    <FaSignOutAlt /> CERRAR SESIÓN
                </button>
            </section>

            <footer className="profile-footer-branding">
                <p>FFIT+ v2.0 • Total Sesiones: {stats?.sesionesCompletadas || 0}</p>
            </footer>

            <div className="hub-footer-spacer"></div>
        </div>
    );
}