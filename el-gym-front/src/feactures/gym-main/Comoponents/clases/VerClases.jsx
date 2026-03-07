import React, { useState, useEffect } from 'react';
import './verClases.css';
import { FaDumbbell, FaRunning, FaFistRaised, FaTimes, FaHeartbeat, FaBiking } from 'react-icons/fa'; 
import { INITIAL_CLASSES } from '../../../../data/siteData';
import { getIcon } from '../../../../service/iconSelector';
import { LandingService } from '../../../../service/landing.service';

export function VerClases() {
    const [selectedClass, setSelectedClass] = useState(null);
    const [clases, setClases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const data = await LandingService.getPublicLanding();
                // Si hay clases en la BD, las usa. Si no, usa las de prueba.
                setClases(data.clases?.length > 0 ? data.clases : INITIAL_CLASSES);
            } catch (error) {
                console.error("Error cargando las clases:", error);
                setClases(INITIAL_CLASSES);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, []);

    const handleOverlayClick = (e) => {
        if (e.target.className === 'modal-overlay') setSelectedClass(null);
    };

    const scrollToHorarios = () => {
        setSelectedClass(null);
        document.getElementById('horarios')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) return null; // Evita que parpadee mientras carga

    return (
        <section className="classes-section-container">
            <div className="square-grid">
                {clases.map((clase) => {
                    const IconoDinamico = getIcon(clase.iconName);
                    
                    return (
                        <div key={clase.id || clase._id} className="square-card" onClick={() => setSelectedClass(clase)}>
                            <div className="square-bg" style={{backgroundImage: `url(${clase.image})`}}></div>
                            <div className="square-overlay">
                                <span className="square-icon">
                                    {IconoDinamico && <IconoDinamico />}
                                </span>
                                <h3 className="square-title">{clase.title}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedClass && (
                <div className="modal-overlay" onClick={handleOverlayClick}>
                    <div className="modal-content">
                        <button className="close-btn" onClick={() => setSelectedClass(null)}><FaTimes /></button>
                        <img src={selectedClass.image} alt={selectedClass.title} className="modal-img" />
                        <div className="modal-text">
                            <h3 className="modal-title">{selectedClass.title}</h3>
                            <p className="modal-desc">{selectedClass.description}</p>
                            <button className="btn-modal" onClick={scrollToHorarios}>Ver Horarios</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}