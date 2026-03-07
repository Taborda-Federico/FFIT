import React, { useState } from 'react';
import { FaLock, FaUserShield, FaArrowRight, FaUserAstronaut } from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { useNavigate } from 'react-router-dom';
import './AdminRegister.css';

export function AdminRegister() {
    const [adminData, setAdminData] = useState({ user: '', pass: '' });
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        localStorage.setItem('admin_session', JSON.stringify({ ...adminData, role: 'GOD_MODE' }));
        navigate('/admin');
    };

    return (
        <div className="admin-register-page">
            <div className="register-overlay-glow"></div>
            
            <main className="register-content">
                <div className="register-glass-card">
                    <div className="card-header">
                        <div className="shield-wrapper">
                            <FaUserShield className="shield-icon" />
                        </div>
                        <h2>Setup <span className="text-neon">Admin</span></h2>
                        <p>Configura tu acceso maestro para gestionar <strong>FFIT+</strong></p>
                    </div>
                    
                    <form onSubmit={handleRegister} className="register-form">
                        <div className="input-field-group">
                            <label>Identificador Único</label>
                            <div className="input-glass-wrapper">
                                <FaUserAstronaut className="input-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Nombre de usuario" 
                                    required 
                                    autoComplete="off"
                                    onChange={(e) => setAdminData({...adminData, user: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="input-field-group">
                            <label>Clave de Encriptación</label>
                            <div className="input-glass-wrapper">
                                <FaLock className="input-icon" />
                                <input 
                                    type="password" 
                                    placeholder="••••••••••••" 
                                    required 
                                    onChange={(e) => setAdminData({...adminData, pass: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="security-notice">
                            <FaLock size={10} />
                            <span>Acceso encriptado de nivel 256-bit</span>
                        </div>

                        <Button variant="primary" fullWidth type="submit" className="btn-activate">
                            Activar Panel Maestro <FaArrowRight />
                        </Button>
                    </form>

                    <footer className="register-footer">
                        <p>© {new Date().getFullYear()} FFIT+ Technology • Dashboard Engine</p>
                    </footer>
                </div>
            </main>
        </div>
    );
}