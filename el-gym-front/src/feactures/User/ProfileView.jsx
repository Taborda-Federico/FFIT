import React, { useState } from 'react';
import {
    FaUserCircle, FaIdCard, FaEnvelope, FaSignOutAlt,
    FaShieldAlt, FaQuestionCircle, FaCrown, FaCalendarAlt, FaWeight, FaRulerVertical, FaKey, FaTimes, FaCheck
} from 'react-icons/fa';
import { useAuth } from '../../contex/AuthContext';
import { StudentService } from '../../service/student.service';
import './ProfileView.css';

export function ProfileView({ userData }) {
    const { user: authUser, logout } = useAuth();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [pwdData, setPwdData] = useState({ current: '', new: '', confirm: '' });
    const [pwdStatus, setPwdStatus] = useState({ loading: false, error: '', success: '' });

    // Si no hay datos aún, evitamos que la pantalla explote
    if (!userData || !userData.user) return null;

    const { user, stats } = userData;


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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdStatus({ loading: false, error: '', success: '' });
        
        if (pwdData.new !== pwdData.confirm) {
            return setPwdStatus({ loading: false, error: 'Las nuevas contraseñas no coinciden', success: '' });
        }
        if (pwdData.new.length < 6) {
            return setPwdStatus({ loading: false, error: 'La nueva contraseña debe tener al menos 6 caracteres', success: '' });
        }

        setPwdStatus({ loading: true, error: '', success: '' });
        try {
            await StudentService.changePassword(pwdData.current, pwdData.new, authUser.token);
            setPwdStatus({ loading: false, error: '', success: '¡Contraseña actualizada con éxito!' });
            setPwdData({ current: '', new: '', confirm: '' });
            setTimeout(() => {
                setShowPasswordForm(false);
                setPwdStatus({ loading: false, error: '', success: '' });
            }, 2500);
        } catch (error) {
            setPwdStatus({ loading: false, error: error.message || 'Error al actualizar', success: '' });
        }
    };

    return (
        <div className="profile-page-container">

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

            <section className="security-section-profile">
                {showPasswordForm ? (
                    <div className="pwd-change-form">
                        <div className="pwd-header">
                            <h4><FaKey /> Cambiar Contraseña</h4>
                            <button className="btn-close-pwd" onClick={() => setShowPasswordForm(false)}><FaTimes /></button>
                        </div>
                        
                        {pwdStatus.error && <p className="pwd-error">{pwdStatus.error}</p>}
                        {pwdStatus.success && <p className="pwd-success"><FaCheck /> {pwdStatus.success}</p>}
                        
                        <form onSubmit={handleChangePassword}>
                            <input 
                                type="password" 
                                placeholder="Contraseña Actual (ej. tu DNI)"
                                value={pwdData.current}
                                onChange={e => setPwdData({...pwdData, current: e.target.value})}
                                required 
                            />
                            <input 
                                type="password" 
                                placeholder="Nueva Contraseña"
                                value={pwdData.new}
                                onChange={e => setPwdData({...pwdData, new: e.target.value})}
                                required 
                            />
                            <input 
                                type="password" 
                                placeholder="Repetir Nueva Contraseña"
                                value={pwdData.confirm}
                                onChange={e => setPwdData({...pwdData, confirm: e.target.value})}
                                required 
                            />
                            <button type="submit" disabled={pwdStatus.loading} className="btn-primary" style={{width: '100%', marginTop: '10px'}}>
                                {pwdStatus.loading ? 'Actualizando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <button className="btn-action-outline pwd-trigger-btn" onClick={() => setShowPasswordForm(true)}>
                        <FaKey /> Configurar Contraseña
                    </button>
                )}
            </section>

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