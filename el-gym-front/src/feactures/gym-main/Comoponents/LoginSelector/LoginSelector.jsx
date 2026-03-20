import React, { useState } from 'react';
import { FaUserShield, FaUserGraduate, FaTimes, FaLock, FaUserAlt, FaChevronLeft, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './LoginSelector.css';
import { useAuth } from '../../../../contex/AuthContext';
import { AuthService } from '../../../../service/auth.service';
import { Button } from '../../../../Utils/Button';
import { Toast } from '../../../../Utils/Toast';

export function LoginSelector({ onClose }) {
    const navigate = useNavigate();
    const [view, setView] = useState('select');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [credentials, setCredentials] = useState({ email: '', password: '' });

    const { login } = useAuth();

    const handleLoginAction = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {

            const userData = await AuthService.login(credentials.email, credentials.password);

            const selectedRole = view === 'login-admin' ? 'admin' : 'user';

            if (userData.role !== selectedRole) {
                throw new Error(`Esta cuenta no tiene permisos de ${selectedRole}`);
            }

            login(userData);

            if (userData.role === 'admin') navigate('/admin');
            else navigate('/user');

            onClose();
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="login-selector-card" onClick={(e) => e.stopPropagation()}>

                <button className="btn-close-modal" onClick={onClose}>
                    <FaTimes />
                </button>

                {view === 'select' ? (
                    <div className="selector-view-content">
                        <header className="selector-header">
                            <div className="brand-dot">FFIT<span>+</span></div>
                            <h2>Bienvenido a la <span className="text-neon">Zona FFIT</span></h2>
                            <p>Selecciona tu perfil para continuar</p>
                        </header>

                        <div className="selector-grid">
                            <div className="selection-box admin" onClick={() => { setView('login-admin'); setErrorMsg(''); }}>
                                <div className="selection-bg"></div>
                                <div className="icon-circle"><FaUserShield /></div>
                                <div className="box-info">
                                    <h3>Staff Admin</h3>
                                    <p>Gestión de planes y alumnos</p>
                                </div>
                                <FaArrowRight className="arrow-indic" />
                            </div>

                            <div className="selection-box user" onClick={() => { setView('login-user'); setErrorMsg(''); }}>
                                <div className="selection-bg"></div>
                                <div className="icon-circle"><FaUserGraduate /></div>
                                <div className="box-info">
                                    <h3>Alumno</h3>
                                    <p>Entrenamiento y progreso</p>
                                </div>
                                <FaArrowRight className="arrow-indic" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <form className="login-form-dynamic" onSubmit={handleLoginAction}>
                        <header className="selector-header">
                            <button type="button" className="btn-back-arrow" onClick={() => setView('select')}>
                                <FaChevronLeft /> Volver
                            </button>
                            <h2>Acceso <span className="text-neon">{view === 'login-admin' ? 'Staff' : 'Alumno'}</span></h2>
                        </header>

                        <div className="form-body">
                            {errorMsg && <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />}

                            <div className="glass-input-wrapper">
                                <FaUserAlt className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="Correo Electrónico"
                                    required
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                />
                            </div>

                            <div className="glass-input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    required
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </div>

                            <Button type="submit" variant="primary" fullWidth disabled={isLoading} className="btn-login-submit">
                                {isLoading ? <div className="spinner">Cargando...</div> : 'INICIAR SESIÓN'}
                            </Button>
                        </div>

                        <footer className="login-footer-info">
                            <p>¿Olvidaste tu acceso? Contacta al soporte técnico.</p>
                        </footer>
                    </form>
                )}
            </div>
        </div>
    );
}