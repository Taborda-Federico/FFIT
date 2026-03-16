import { useEffect, useState } from 'react';
import './Nosotros.css';
import { Button } from '../../../../Utils/Button'; 
import { INITIAL_COACHES } from '../../../../data/siteData';
import { LandingService } from '../../../../service/landing.service';

export function Nosotros() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const data = await LandingService.getPublicLanding();
                // Si hay profes en la BD, los usa. Si no, usa los de prueba.
                setTeam(data.coaches?.length > 0 ? data.coaches : INITIAL_COACHES);
            } catch (error) {
                console.error("Error cargando el equipo:", error);
                setTeam(INITIAL_COACHES);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, []);

    if (loading) return null; // Evita que parpadee mientras carga

    return (
        <div className="nosotros-container">
            <div className="section-header">
                <h2>Nuestro Equipo</h2>
                <span></span>
                <p className="team-intro">
                    Profesionales certificados listos para llevarte al <span className="text-neon">siguiente nivel</span>.
                </p>
            </div>

            <div className="team-grid">
                {team.map((coach) => (
                    <div key={coach.id || coach._id} className="team-card">
                        <div className="team-card-bg" style={{ backgroundImage: `url(${coach.image})` }}></div>
                        <div className="team-overlay">
                            <div className="team-content">
                                <h3 className="coach-name">{coach.name}</h3>
                                <h4 className="coach-role">{coach.role}</h4>
                                
                                <div className="coach-tags">
                                    {coach.specialty?.map((tag, index) => (
                                        <span key={index} className="tag">{tag}</span>
                                    ))}
                                </div>

                                <p className="coach-bio">{coach.bio}</p>
                                
                                <div className="coach-actions">
                                    <Button variant="outline" size="sm">
                                        Clases
                                    </Button>
                                    <a href={`https://instagram.com/${coach.instagram}`} className="social-link" target="_blank" rel="noopener noreferrer">
                                        Instagram
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}