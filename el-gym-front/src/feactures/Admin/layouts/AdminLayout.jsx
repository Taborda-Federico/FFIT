import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar.jsx';
import { FaBars, FaUserCircle } from 'react-icons/fa'; // Necesitarás react-icons
import './AdminLayout.css';

export function AdminLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className={`admin-master-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>

            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />

            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="admin-main-content">
                <header className="admin-top-nav">
                    <div className="nav-left">
                        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                            <FaBars />
                        </button>
                        <span className="nav-page-indicator">Panel de Gestión</span>
                    </div>

                    <div className="nav-right">
                        <div className="user-profile-badge">
                            <div className="admin-info">
                                <span className="admin-name">Admin</span>
                                <span className="admin-status">En línea</span>
                            </div>
                            <div className="avatar-circle">
                                <FaUserCircle />
                            </div>
                        </div>
                    </div>
                </header>

                <section className="admin-page-container">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}