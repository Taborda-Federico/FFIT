import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaUsers, FaDumbbell, FaEdit, FaHome, FaSignOutAlt, FaTimes, FaWallet, FaChartLine, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../../../contex/AuthContext';
import { CreateAdminModal } from './CreateAdminModal';
import { Toast } from '../../../Utils/Toast';
import './AdminSidebar.css';

export function AdminSidebar({ onClose, isOpen }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    
    // Estados para el Modal de Admin
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [toast, setToast] = useState(null);

    const notify = (msg, type = 'success') => setToast({ msg, type });

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            {showAdminModal && (
                <CreateAdminModal
                    onClose={() => setShowAdminModal(false)}
                    onSuccess={(msg) => notify(msg, "success")}
                    onError={(msg) => notify(msg, "error")}
                />
            )}

            {/* Cabecera con Logo y Cierre para Móvil */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    FFIT<span className="text-neon">+</span>
                </div>
                <button className="close-sidebar-btn" onClick={onClose} aria-label="Cerrar menú">
                    <FaTimes />
                </button>
            </div>

            <nav className="sidebar-navigation">
                <div className="nav-section">
                    <span className="nav-label">GESTIÓN</span>

                    <NavLink to="/admin" end onClick={onClose} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaUsers className="nav-icon" />
                        <span className="nav-text">Alumnos</span>
                    </NavLink>

                    <NavLink to="/admin/planes" onClick={onClose} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaDumbbell className="nav-icon" />
                        <span className="nav-text">Planes</span>
                    </NavLink>

                    <NavLink to="/admin/editor" onClick={onClose} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaEdit className="nav-icon" />
                        <span className="nav-text">Editor Web</span>
                    </NavLink>
                    <NavLink to="/admin/progreso" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaChartLine className="nav-icon" /> <span className="nav-text">Seguimiento</span>
                    </NavLink>
                </div>

                <div className="sidebar-divider" />

                <div className="nav-section">
                    <span className="nav-label">SISTEMA</span>
                    <NavLink to="/" onClick={onClose} className="nav-item link-external">
                        <FaHome className="nav-icon" />
                        <span className="nav-text">Web Pública</span>
                    </NavLink>
                </div>

                <div className="sidebar-spacer" />

                <div className="nav-section">
                    <span className="nav-label">ACCIONES</span>
                    <button className="nav-item" onClick={() => setShowAdminModal(true)} style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left' }}>
                        <FaUserPlus className="nav-icon" style={{ color: "var(--neon)" }} />
                        <span className="nav-text" style={{ color: "var(--neon)" }}>Nuevo Admin</span>
                    </button>
                </div>

                <div className="sidebar-divider" />

                {/* 4. Conectamos el botón de Salida con nuestra función */}
                <button className="nav-item logout-btn" onClick={handleLogout}>
                    <FaSignOutAlt className="nav-icon" />
                    <span className="nav-text">Cerrar Sesión</span>
                </button>
            </nav>
        </aside>
    );
}