import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Button } from '../../../../Utils/Button';
import { LoginSelector } from '../LoginSelector/LoginSelector';


export function Navbar({ onScroll }) {
    const [showLogin, setShowLogin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleClick = (e, target) => {
        e.preventDefault();
        onScroll(target);
        setIsMenuOpen(false);
    };

    return (
        <>
            <nav className={`navbar-floating ${isMenuOpen ? 'menu-active' : ''}`}>
                <div className="nav-container-wrapper">

                    <div className="logo-container" onClick={(e) => handleClick(e, 'inicio')}>
                        <img
                            src="/logo ffit wellness blanco y lima.PNG"
                            alt="FFIT+ Logo"
                            className="nav-logo-img"
                        />
                    </div>

                    <button className="mobile-menu-btn" onClick={toggleMenu}>
                        {isMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>

                    <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <a href="#inicio" className="nav-item" onClick={(e) => handleClick(e, 'inicio')}>Inicio</a>
                        <a href="#clases" className="nav-item" onClick={(e) => handleClick(e, 'clases')}>Clases</a>
                        <a href="#horarios" className="nav-item" onClick={(e) => handleClick(e, 'horarios')}>Horarios</a>
                        <a href="#nosotros" className="nav-item" onClick={(e) => handleClick(e, 'nosotros')}>Nosotros</a>

                        <div className="nav-mobile-actions">
                            <Button
                                variant="outline"
                                className="nav-login-btn"
                                onClick={() => { setShowLogin(true); setIsMenuOpen(false); }}
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