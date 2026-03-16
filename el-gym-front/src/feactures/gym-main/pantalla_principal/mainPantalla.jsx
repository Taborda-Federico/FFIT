import React, { useState, useEffect } from 'react';
import './MainPrincipal.css'; 
import { Button } from '../../../Utils/Button'; 
import { VerClases } from '../Comoponents/clases/VerClases';
import { Horarios } from '../Comoponents/Horarios/Horarios';
import { Nosotros} from "../Comoponents/Nosotros/Nosotros";
import { Navbar } from '../Comoponents/Navbar/Navbar'; 
import { LandingService } from '../../../service/landing.service';

export function MainPrincipal() {
    
    // Ahora las imágenes nacen desde un estado, esperando la base de datos
    const [backgroundImages, setBackgroundImages] = useState([
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop'
    ]);

    const [currentBgIndex, setCurrentBgIndex] = useState(0);

    // 1. CARGAMOS LAS IMÁGENES DEL BACKEND AL INICIAR
    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const data = await LandingService.getPublicLanding();
                if (data.heroBackgrounds && data.heroBackgrounds.length > 0) {
                    // Extraemos solo las URLs del array de objetos de Mongo
                    setBackgroundImages(data.heroBackgrounds.map(bg => bg.url));
                }
            } catch (error) {
                console.error("Error cargando imágenes de portada", error);
            }
        };
        fetchPublicData();
    }, []);

    // 2. LÓGICA DEL CARRUSEL (A prueba de balas)
    useEffect(() => {
        if (backgroundImages.length === 0) return;
        
        const interval = setInterval(() => {
            setCurrentBgIndex((prev) => (prev === backgroundImages.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(interval);
    }, [backgroundImages.length]);

    const handleScroll = (id) => {
        const section = document.getElementById(id);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="main-wrapper">
            
            <header 
                className="hero-fullscreen" 
                id="inicio"
                style={{ 
                    backgroundImage: `
                        linear-gradient(to bottom, rgba(26, 71, 42, 0.5), rgba(18, 18, 18, 1)),
                        url(${backgroundImages[currentBgIndex]})` 
                }}
            >
                <Navbar onScroll={handleScroll} />

                <div className="hero-content">
                    <h1 className="hero-title">
                        SABEMOS LO QUE HACEMOS,<br />
                        <span className="highlight-neon">Y LO HACEMOS POR VOS</span>
                    </h1>
                    <p className="hero-subtitle">
                        Entrenamiento Integral de Alto Rendimiento
                    </p>
                    
                    <div className="hero-buttons">
                        <Button variant="primary" size="lg" onClick={() => handleScroll('contacto')}>
                            Comenzar
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => handleScroll('clases')}>
                            Ver Clases
                        </Button>
                    </div>
                </div>
            </header>

            <section id="clases" className="dark-section"><VerClases /></section>
            <section id="horarios" className="dark-section"><Horarios /></section>
            <section id="contacto" className="dark-section" style={{textAlign:'center', paddingBottom: '6rem'}}>
                <div className="section-header"><h2>¿Listo para el cambio?</h2><span></span></div>
                <Button variant="primary" size="lg">Contactanos por WhatsApp</Button>
            </section>
            <section id="nosotros" className="dark-section" style={{ background: '#181818' }}><Nosotros /></section>
        </div>
    );
}