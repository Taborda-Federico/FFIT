import React, { useState } from 'react';
import { Button } from '../../../../Utils/Button';
import { LoginSelector } from '../LoginSelector/LoginSelector';
import { FaBars, FaTimes } from 'react-icons/fa'; // Necesitarás react-icons

export function Navbar({ onScroll }) {
    const [showLogin, setShowLogin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleClick = (e, target) => {
        e.preventDefault();
        onScroll(target);
        setIsMenuOpen(false); // Cerramos el menú al hacer clic en un link
    };

    return (
        <>
            <nav className={`navbar-floating ${isMenuOpen ? 'menu-open' : ''}`}>
                <div className="nav-container-wrapper">
                    {/* LOGO */}
                    <div className="logo-container" onClick={(e) => handleClick(e, 'inicio')}>
                        FFIT <span className="logo-plus">+</span>
                    </div>

                    {/* BOTÓN HAMBURGUESA (Solo móvil) */}
                    <button className="mobile-menu-btn" onClick={toggleMenu}>
                        {isMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>

                    {/* ENLACES DE NAVEGACIÓN */}
                    <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <a href="#inicio" className="nav-item" onClick={(e) => handleClick(e, 'inicio')}>Inicio</a>
                        <a href="#clases" className="nav-item" onClick={(e) => handleClick(e, 'clases')}>Clases</a>
                        <a href="#horarios" className="nav-item" onClick={(e) => handleClick(e, 'horarios')}>Horarios</a>
                        <a href="#nosotros" className="nav-item" onClick={(e) => handleClick(e, 'nosotros')}>Nosotros</a>
                        
                        <div className="nav-mobile-actions">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="nav-login-btn" 
                                onClick={() => {
                                    setShowLogin(true);
                                    setIsMenuOpen(false);
                                }}
                            >
                                Acceso
                            </Button>
                            <a href="#contacto" className="nav-item nav-cta" onClick={(e) => handleClick(e, 'contacto')}>Asociate</a>
                        </div>
                    </div>
                </div>
            </nav>

            {showLogin && <LoginSelector onClose={() => setShowLogin(false)} />}
        </>
    );
}