import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FaUserShield, FaEnvelope, FaLock, FaTimes } from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { AdminService } from '../../../service/admin.service';
import { useAuth } from '../../../contex/AuthContext';
import './CreateAdminModal.css';

export function CreateAdminModal({ onClose, onSuccess, onError }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre || !formData.email || !formData.password) {
            return onError("Todos los campos son obligatorios.");
        }

        setIsSubmitting(true);
        try {
            await AdminService.createAdmin(formData, user.token);
            onSuccess(`Administrador ${formData.nombre} creado con éxito.`);
            onClose();
        } catch (error) {
            onError(error.message || "Error al crear administrador.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                <button className="admin-modal-close" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="admin-modal-header">
                    <FaUserShield className="header-icon" />
                    <h2>Nuevo Administrador</h2>
                    <p>Registra a un nuevo profesor o staff con acceso total al panel.</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="input-group">
                        <FaUserShield className="input-icon" />
                        <input
                            type="text"
                            name="nombre"
                            placeholder="Nombre completo"
                            value={formData.nombre}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                    </div>

                    <div className="input-group">
                        <FaEnvelope className="input-icon" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Correo electrónico"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Contraseña provisoria"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="admin-modal-actions">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creando...' : 'Crear Admin'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
