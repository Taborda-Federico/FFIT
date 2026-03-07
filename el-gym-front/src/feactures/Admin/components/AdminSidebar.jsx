import { NavLink } from 'react-router-dom';
import { FaUsers, FaDumbbell, FaEdit, FaHome, FaSignOutAlt, FaTimes, FaWallet } from 'react-icons/fa';
import './AdminSidebar.css';

export function AdminSidebar({ onClose, isOpen }) {
    return (
        <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
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
                    
                    <NavLink to="/admin" end onClick={onClose} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaUsers className="nav-icon" /> 
                        <span className="nav-text">Alumnos</span>
                    </NavLink>
                    
                    <NavLink to="/admin/planes" onClick={onClose} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaDumbbell className="nav-icon" /> 
                        <span className="nav-text">Planes</span>
                    </NavLink>
                     <NavLink to="/admin/finanzas" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaWallet  className="nav-icon" /> 
                        <span className="nav-text">Finazas</span>
                    </NavLink>
                    <NavLink to="/admin/editor" onClick={onClose} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaEdit className="nav-icon" /> 
                        <span className="nav-text">Editor Web</span>
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

                {/* Botón de Salida al final */}
                <button className="nav-item logout-btn" onClick={() => console.log("Logout")}>
                    <FaSignOutAlt className="nav-icon" />
                    <span className="nav-text">Cerrar Sesión</span>
                </button>
            </nav>
        </aside>
    );
}