import React, { useState } from 'react';
import { 
    FaUser, FaIdCard, FaEnvelope, FaCalendarAlt, 
    FaMoneyBillWave, FaWeight, FaArrowsAltV, FaMapMarkerAlt 
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import './RegisterUserModal.css';

// 1. Importamos el contexto y el servicio
import { useAuth } from '../../../contex/AuthContext';
import { UserService } from '../../../service/user.service';

export function RegisterUserModal({ onClose, onSave }) {
    // Extraemos al usuario logueado (Admin) para usar su Token
    const { user } = useAuth(); 

    // Estados para UX (Carga y Errores)
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        dni: '',
        email: '',
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
            // 2. Llamamos a nuestro backend real
            const newStudent = await UserService.createStudent(formData, user.token);
            
            // 3. Si todo sale bien, le avisamos al componente padre (AdminUsers)
            onSave(newStudent); 
            onClose(); // Cerramos el modal
        } catch (error) {
            // Si el backend nos rechaza (ej: DNI repetido), mostramos el error
            setErrorMsg(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="register-modal-card">
                <header className="modal-header-pro">
                    <h2>Nuevo <span className="text-neon">Socio</span></h2>
                    <p>Ficha técnica y personal del alumno.</p>
                </header>

                <form onSubmit={handleSubmit} className="register-form">
                    {/* Mensaje de Error Dinámico */}
                    {errorMsg && (
                        <div style={{color: '#ff4444', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem'}}>
                            {errorMsg}
                        </div>
                    )}

                    <div className="input-glass-group">
                        <FaUser className="input-icon" />
                        <input type="text" placeholder="Nombre Completo" required onChange={(e) => setFormData({...formData, nombre: e.target.value})}/>
                    </div>

                    <div className="input-grid-dual">
                        <div className="input-glass-group">
                            <FaIdCard className="input-icon" />
                            <input type="number" placeholder="DNI" required onChange={(e) => setFormData({...formData, dni: e.target.value})}/>
                        </div>
                        <div className="input-glass-group">
                            <FaMoneyBillWave className="input-icon" />
                            {/* El monto por ahora no lo enviamos al backend de User, pero se usará para Finanzas después */}
                            <input type="number" placeholder="Monto ($)" required onChange={(e) => setFormData({...formData, montoPago: e.target.value})}/>
                        </div>
                    </div>

                    <div className="input-grid-dual">
                        <div className="input-glass-group">
                            <FaWeight className="input-icon" />
                            <input type="number" placeholder="Peso (kg)" step="0.1" onChange={(e) => setFormData({...formData, peso: e.target.value})}/>
                        </div>
                        <div className="input-glass-group">
                            <FaArrowsAltV className="input-icon" />
                            <input type="number" placeholder="Altura (cm)" onChange={(e) => setFormData({...formData, altura: e.target.value})}/>
                        </div>
                    </div>

                    <div className="input-glass-group">
                        <FaEnvelope className="input-icon" />
                        <input type="email" placeholder="Correo Electrónico" required onChange={(e) => setFormData({...formData, email: e.target.value})}/>
                    </div>

                    <div className="input-glass-group">
                        <FaMapMarkerAlt className="input-icon" />
                        <input type="text" placeholder="Dirección de Domicilio" onChange={(e) => setFormData({...formData, domicilio: e.target.value})}/>
                    </div>

                    <div className="input-glass-group">
                        <FaCalendarAlt className="input-icon" />
                        <input type="date" value={formData.fechaInicio} onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}/>
                    </div>

                    <footer className="modal-footer-actions">
                        <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            {isLoading ? 'Registrando...' : 'Finalizar Registro'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>
    );
}