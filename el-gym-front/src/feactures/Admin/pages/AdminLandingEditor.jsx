import React, { useState, useEffect } from 'react';
import { 
    FaTrash, FaPlus, FaImage, FaUserTie, FaDumbbell, 
    FaSave, FaInstagram, FaAlignLeft, FaLink, FaSpinner, FaUpload
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { Toast } from '../../../Utils/Toast';
import { INITIAL_CLASSES, INITIAL_COACHES } from '../../../data/siteData';
import './AdminLandingEditor.css';
import { useAuth } from '../../../contex/AuthContext';
import { LandingService } from '../../../service/landing.service';

const TU_CLOUD_NAME = 'dimqbgre0'; 

export function AdminLandingEditor() {
    const { user } = useAuth();
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // NUEVO ESTADO: Imágenes del carrusel principal
    const [heroBackgrounds, setHeroBackgrounds] = useState([]);
    const [clases, setClases] = useState([]);
    const [coaches, setCoaches] = useState([]);

    const notify = (msg, type = 'success') => setToast({ msg, type });

    useEffect(() => {
        if (!user?.token) return;
        const fetchDatosWeb = async () => {
            try {
                const data = await LandingService.getLanding(user.token);
                
                // Cargamos las portadas. Si no hay, le ponemos 3 por defecto.
                setHeroBackgrounds(data.heroBackgrounds?.length > 0 ? data.heroBackgrounds : [
                    { id: 1, url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop' },
                    { id: 2, url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop' },
                    { id: 3, url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop' }
                ]);
                
                setClases(data.clases?.length > 0 ? data.clases : INITIAL_CLASSES);
                setCoaches(data.coaches?.length > 0 ? data.coaches : INITIAL_COACHES);
            } catch (error) {
                notify("Error al cargar los datos del servidor", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchDatosWeb();
    }, [user]);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // Ahora enviamos también los heroBackgrounds a Mongo
            await LandingService.updateLanding({ heroBackgrounds, clases, coaches }, user.token);
            notify("¡Sitio actualizado en la nube! Los cambios ya son visibles.");
        } catch (error) {
            notify("Error al guardar los cambios", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // --- SUBIDA GENÉRICA A CLOUDINARY ---
    const handleFileUpload = async (e, id, type) => {
        const file = e.target.files[0];
        if (!file) return;

        notify("Subiendo imagen, por favor espera...", "warning");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ffit_gym'); 
        const cloudName = TU_CLOUD_NAME; 

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.secure_url) {
                if (type === 'coach') updateCoach(id, 'image', data.secure_url);
                else if (type === 'clase') updateClase(id, 'image', data.secure_url);
                else if (type === 'hero') updateHeroBg(id, data.secure_url);
                notify("¡Imagen cargada con éxito!", "success");
            }
        } catch (error) {
            notify("Hubo un error al subir la imagen", "error");
        }
    };

    // Funciones Helper
    const addHeroBg = () => setHeroBackgrounds([...heroBackgrounds, { id: Date.now(), url: '' }]);
    const updateHeroBg = (id, url) => setHeroBackgrounds(heroBackgrounds.map(h => (h.id || h._id) === id ? { ...h, url } : h));
    
    const addClase = () => setClases([...clases, { id: Date.now(), title: 'Nueva Clase', iconName: 'FaDumbbell', image: '', description: '' }]);
    const updateClase = (id, field, value) => setClases(clases.map(c => (c.id || c._id) === id ? { ...c, [field]: value } : c));
    
    const addCoach = () => setCoaches([...coaches, { id: Date.now(), name: 'Nuevo Coach', role: 'Especialidad', image: '', instagram: '', specialty: [], bio: '' }]);
    const updateCoach = (id, field, value) => setCoaches(coaches.map(c => (c.id || c._id) === id ? { ...c, [field]: field === 'specialty' ? value.split(',').map(s => s.trim()) : value } : c));

    if (loading) return <div className="admin-editor-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><FaSpinner className="spin" style={{ fontSize: '3rem', color: '#BFFF00' }} /></div>;

    return (
        <div className="admin-editor-layout">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <header className="editor-header-view">
                <div className="header-info">
                    <h1>Editor de <span className="text-neon">Contenidos</span></h1>
                    <p>Gestiona imágenes, descripciones y staff de la Landing Page.</p>
                </div>
                <Button variant="primary" size="md" onClick={handleSaveAll} disabled={isSaving}>
                    <FaSave /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </header>

            {/* --- SECCIÓN NUEVA: IMÁGENES DE PORTADA --- */}
            <section className="editor-section-card">
                <div className="section-title-bar">
                    <div className="title-left">
                        <div className="icon-badge"><FaImage /></div>
                        <h3>Imágenes del Carrusel (Inicio)</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={addHeroBg}> <FaPlus /> Añadir Imagen </Button>
                </div>

                <div className="editor-grid">
                    {heroBackgrounds.map(bg => (
                        <div key={bg.id || bg._id} className="edit-card-item extended">
                            <div className="card-media" style={{ height: '180px' }}>
                                {bg.url ? <img src={bg.url} alt="Hero" /> : <div className="no-image"><FaImage /></div>}
                                <div className="card-media-overlay"><span>Sube tu foto abajo</span></div>
                                <button className="btn-delete-card-abs" onClick={() => setHeroBackgrounds(heroBackgrounds.filter(h => (h.id || h._id) !== (bg.id || bg._id)))}>
                                    <FaTrash />
                                </button>
                            </div>
                            <div className="card-body-extended">
                                <div className="input-with-icon-glass" style={{ position: 'relative' }}>
                                    <FaUpload />
                                    <input 
                                        type="text"
                                        value={bg.url ? '✅ Foto subida con éxito' : ''} 
                                        placeholder="Subir imagen de portada..."
                                        readOnly
                                        style={{ cursor: 'pointer', color: bg.url ? '#BFFF00' : 'inherit' }}
                                    />
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, bg.id || bg._id, 'hero')}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECCIÓN CLASES */}
            <section className="editor-section-card">
                <div className="section-title-bar">
                    <div className="title-left">
                        <div className="icon-badge"><FaDumbbell /></div>
                        <h3>Disciplinas</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={addClase}> <FaPlus /> Añadir Clase </Button>
                </div>

                <div className="editor-grid">
                    {clases.map(clase => (
                        <div key={clase.id || clase._id} className="edit-card-item extended">
                            <div className="card-media">
                                {clase.image ? <img src={clase.image} alt="preview" /> : <div className="no-image"><FaImage /></div>}
                                <div className="card-media-overlay"><span>Sube tu foto abajo</span></div>
                                <button className="btn-delete-card-abs" onClick={() => setClases(clases.filter(c => (c.id || c._id) !== (clase.id || clase._id)))}>
                                    <FaTrash />
                                </button>
                            </div>
                            <div className="card-body-extended">
                                <input 
                                    className="edit-input-field main" 
                                    value={clase.title} 
                                    onChange={(e) => updateClase(clase.id || clase._id, 'title', e.target.value)} 
                                    placeholder="Título de la clase"
                                />
                                <div className="input-with-icon-glass" style={{ position: 'relative' }}>
                                    <FaUpload />
                                    <input 
                                        type="text"
                                        value={clase.image ? '✅ Foto subida (Click para cambiar)' : ''} 
                                        placeholder="Haz clic para subir foto..."
                                        readOnly
                                        style={{ cursor: 'pointer', color: clase.image ? '#BFFF00' : 'inherit' }}
                                    />
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, clase.id || clase._id, 'clase')}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                </div>
                                <textarea 
                                    className="edit-input-field area" 
                                    value={clase.description} 
                                    onChange={(e) => updateClase(clase.id || clase._id, 'description', e.target.value)}
                                    placeholder="Descripción corta para el modal..."
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECCIÓN STAFF */}
            <section className="editor-section-card">
                <div className="section-title-bar">
                    <div className="title-left">
                        <div className="icon-badge"><FaUserTie /></div>
                        <h3>Nuestro Equipo</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={addCoach}> <FaPlus /> Añadir Coach </Button>
                </div>

                <div className="editor-grid">
                    {coaches.map(coach => (
                        <div key={coach.id || coach._id} className="edit-card-item extended coach-item">
                            <div className="card-media circle">
                                <img src={coach.image || 'https://via.placeholder.com/150'} alt="coach" />
                                <button className="btn-delete-card-abs" onClick={() => setCoaches(coaches.filter(c => (c.id || c._id) !== (coach.id || coach._id)))}>
                                    <FaTrash />
                                </button>
                            </div>
                            <div className="card-body-extended">
                                <input 
                                    className="edit-input-field main" 
                                    value={coach.name} 
                                    onChange={(e) => updateCoach(coach.id || coach._id, 'name', e.target.value)}
                                    placeholder="Nombre del Coach"
                                />
                                <input 
                                    className="edit-input-field role" 
                                    value={coach.role} 
                                    onChange={(e) => updateCoach(coach.id || coach._id, 'role', e.target.value)}
                                    placeholder="Rol (ej: Head Coach)"
                                />
                                <div className="input-with-icon-glass">
                                    <FaInstagram />
                                    <input 
                                        value={coach.instagram} 
                                        onChange={(e) => updateCoach(coach.id || coach._id, 'instagram', e.target.value)}
                                        placeholder="@usuario_instagram"
                                    />
                                </div>
                                <div className="input-with-icon-glass">
                                    <FaAlignLeft />
                                    <input 
                                        value={coach.specialty?.join(', ')} 
                                        onChange={(e) => updateCoach(coach.id || coach._id, 'specialty', e.target.value)}
                                        placeholder="Tags (ej: Fuerza, Boxeo, HIIT)"
                                    />
                                </div>
                                <textarea 
                                    className="edit-input-field area" 
                                    value={coach.bio} 
                                    onChange={(e) => updateCoach(coach.id || coach._id, 'bio', e.target.value)}
                                    placeholder="Pequeña biografía..."
                                />
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        className="edit-input-field sub-link" 
                                        value={coach.image ? '✅ Foto subida (Click para cambiar)' : ''} 
                                        placeholder="Haz clic para subir foto del coach..."
                                        readOnly
                                        style={{ cursor: 'pointer', textAlign: 'center', color: coach.image ? '#BFFF00' : 'inherit' }}
                                    />
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, coach.id || coach._id, 'coach')}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}