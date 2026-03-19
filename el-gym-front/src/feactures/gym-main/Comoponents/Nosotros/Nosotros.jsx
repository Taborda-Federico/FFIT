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

            <section className="Nosotros_encuadre">
                <h2 className="Nosotros_titulo">QUiÉNES SOMOS Y QUé HACEMOS</h2>
                <hr className="linea_div_nosotros" />

                <div className="div_todos_p">

                    <p className="Nosotros_p">
                        <strong>FFiT Wellness</strong> es un espacio integral de entrenamiento y salud orientado al desarrollo físico y bienestar de personas de todos los niveles. Combina entrenamiento funcional, fuerza y acondicionamiento con un enfoque profesional basado en la experiencia en alto rendimiento.
                    </p>

                    <p className="Nosotros_p">
                        Trabajamos exclusivamente con profesionales de las distintas áreas de la salud y el rendimiento, garantizando un servicio seguro, personalizado y de calidad, donde cada proceso está acompañado y respaldado por especialistas.
                    </p>

                    <p className="Nosotros_p">
                        El proyecto apunta a brindar un servicio cercano y profesional, donde tanto deportistas como personas que buscan mejorar su calidad de vida puedan entrenar, progresar y sentirse parte de una comunidad.
                    </p>

                    <p className="Nosotros_p">
                        A su vez, <strong>FFiT</strong> se proyecta como un centro integral que integra entrenamiento, salud y hábitos, incorporando servicios como kinesiología, nutrición y acompañamiento profesional.
                    </p>
                </div>
            </section>

            <div className="section-header">
                <h2>Nuestro Equipo</h2>
                <span></span>
                <p className="team-intro">
                    Profesionales certificados listos para llevarte al siguiente nivel <span className="text-neon"></span>
                </p>
            </div>

            <div className="team-grid">
                {team.map((coach) => (
                    <a
                        key={coach.id || coach._id}
                        href={`https://instagram.com/${coach.instagram?.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-card"
                        style={{ textDecoration: 'none', display: 'block' }}
                    >
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
                                    <span className="social-link" style={{ pointerEvents: 'none' }}>
                                        Ir a Instagram
                                    </span>
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}