import React, { useState } from 'react';
import {
    FaUser, FaIdCard, FaEnvelope, FaCalendarAlt,
    FaMoneyBillWave, FaWeight, FaArrowsAltV, FaMapMarkerAlt, FaPhone, FaTimes
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import './RegisterUserModal.css';

// Importamos el contexto y el servicio para mantener la escalabilidad
import { useAuth } from '../../../contex/AuthContext';
import { UserService } from '../../../service/user.service';

export function RegisterUserModal({ onClose, onSave }) {
    const { user } = useAuth(); // Token del Admin
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        dni: '',
        email: '',
        telefono: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        montoPago: '',
        peso: '',
        altura: '',
        domicilio: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            // Llamada al backend (Node/Mongo) siguiendo el patrón de servicio
            const newStudent = await UserService.createStudent(formData, user.token);
            onSave(newStudent);
            onClose();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Error al registrar socio');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="register-modal-card">
                <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>

                <header className="modal-header">
                    <h2>Nuevo <span className="text-neon">Miembro</span></h2>
                    <p>Completa los datos para el alta en el sistema</p>
                </header>

                {errorMsg && <div className="error-badge">{errorMsg}</div>}

                <form onSubmit={handleSubmit} className="register-grid-form">

                    <div className="input-glass-group">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            placeholder="Nombre y Apellido"
                            required
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="input-glass-group">
                        <FaIdCard className="input-icon" />
                        <input
                            type="text"
                            placeholder="DNI / Identificación"
                            required
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                        />
                    </div>

                    <div className="input-glass-group">
                        <FaPhone className="input-icon" />
                        <input
                            type="tel"
                            placeholder="Teléfono de contacto"
                            required
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        />
                    </div>

                    <div className="input-glass-group">
                        <FaEnvelope className="input-icon" />
                        <input
                            type="email"
                            placeholder="Correo Electrónico"
                            required
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="input-glass-group full-width">
                        <FaMapMarkerAlt className="input-icon" />
                        <input
                            type="text"
                            placeholder="Dirección de Domicilio"
                            onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                        />
                    </div>

                    <div className="input-row-flex">
                        <div className="input-glass-group">
                            <FaWeight className="input-icon" />
                            <input
                                type="number"
                                placeholder="Peso (kg)"
                                onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                            />
                        </div>
                        <div className="input-glass-group">
                            <FaArrowsAltV className="input-icon" />
                            <input
                                type="number"
                                placeholder="Altura (cm)"
                                onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="input-glass-group">
                        <FaCalendarAlt className="input-icon" />
                        <input
                            type="date"
                            value={formData.fechaInicio}
                            onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        />
                    </div>

                    <div className="input-glass-group">
                        <FaMoneyBillWave className="input-icon" />
                        <input
                            type="number"
                            placeholder="Monto de Pago"
                            required
                            onChange={(e) => setFormData({ ...formData, montoPago: e.target.value })}
                        />
                    </div>

                    <footer className="modal-footer-actions">
                        <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            {isLoading ? 'Registrando...' : 'Finalizar Registro'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>
    );
}