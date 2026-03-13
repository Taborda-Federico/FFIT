import { NavLink, useNavigate } from 'react-router-dom'; // 1. Agregamos useNavigate
import { FaUsers, FaDumbbell, FaEdit, FaHome, FaSignOutAlt, FaTimes, FaWallet ,FaChartLine} from 'react-icons/fa';
import { useAuth } from '../../../contex/AuthContext'; // 2. Traemos tu contexto (Ajusta los '../' si es necesario)
import './AdminSidebar.css';

export function AdminSidebar({ onClose, isOpen }) {
    const { logout } = useAuth(); // Sacamos la función para cerrar sesión
    const navigate = useNavigate(); // Sacamos la función para navegar

    // 3. Creamos la función que hace la magia
    const handleLogout = () => {
        logout(); // Borra el token y el localStorage
        navigate('/'); // Redirige a la página principal pública
    };

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
                        <span className="nav-text">Finanzas</span> {/* Corregí un pequeño typo de "Finazas" a "Finanzas" */}
                    </NavLink>
                    <NavLink to="/admin/editor" onClick={onClose} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FaEdit className="nav-icon" /> 
                        <span className="nav-text">Editor Web</span>
                    </NavLink>
                    <NavLink to="/admin/progreso" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
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

                {/* 4. Conectamos el botón de Salida con nuestra función */}
                <button className="nav-item logout-btn" onClick={handleLogout}>
                    <FaSignOutAlt className="nav-icon" />
                    <span className="nav-text">Cerrar Sesión</span>
                </button>
            </nav>
        </aside>
    );
}