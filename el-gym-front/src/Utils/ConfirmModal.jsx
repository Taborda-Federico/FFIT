import React, { useState } from 'react';
import { FaCalendarAlt, FaUser, FaDumbbell, FaCheckCircle, FaTimes, FaExclamationCircle } from 'react-icons/fa';
import './ConfirmModal.css';

export function ConfirmModal({ plan, title, message, type = 'info', isAlert = false, confirmText = 'Confirmar', onConfirm, onClose }) {
    const [duracion, setDuracion] = useState('4 semanas');

    const getIcon = () => {
        if (type === 'warning') return <FaExclamationCircle style={{ color: '#ff4444' }} />;
        return <FaCheckCircle />;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* stopPropagation evita que al hacer clic en la tarjeta se cierre el modal */}
            <div className="modal-confirm-card" onClick={(e) => e.stopPropagation()}>

                <div className="modal-header-pro">
                    <div className="icon-circle-confirm" style={{ color: type === 'warning' ? '#ff4444' : '#BFFF00', borderColor: type === 'warning' ? '#ff4444' : '#BFFF00' }}>
                        {getIcon()}
                    </div>
                    <h2>{title || (plan ? <>Confirmar <span className="text-neon">Publicación</span></> : 'Aviso')}</h2>
                    <p>{message || (plan ? 'Verifica los detalles antes de enviar al alumno.' : '')}</p>
                </div>

                {plan && (
                    <div className="summary-box-pro">
                        <div className="summary-item">
                            <FaUser className="item-icon" />
                            <div className="item-text">
                                <label>Alumno</label>
                                <span>{plan.alumno || "Sin asignar"}</span>
                            </div>
                        </div>

                        <div className="summary-item">
                            <FaDumbbell className="item-icon" />
                            <div className="item-text">
                                <label>Plan de entrenamiento</label>
                                <span>{plan.titulo || "Sin título"}</span>
                            </div>
                        </div>

                        <div className="duration-selector-wrapper">
                            <div className="selector-label">
                                <FaCalendarAlt />
                                <label>Vigencia del plan</label>
                            </div>
                            <select
                                className="minimal-select"
                                value={duracion}
                                onChange={(e) => setDuracion(e.target.value)}
                            >
                                <option value="2 semanas">2 semanas (Express)</option>
                                <option value="4 semanas">4 semanas (Mensual)</option>
                                <option value="8 semanas">8 semanas (Bimestral)</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="modal-footer-pro">
                    {!isAlert && (
                        <button className="btn-modal-primary" onClick={() => onConfirm(plan ? duracion : undefined)} style={{ background: type === 'warning' ? '#ff4444' : '#BFFF00', color: '#111' }}>
                            {plan ? '¡Publicar ahora!' : confirmText}
                        </button>
                    )}
                    <button className="btn-modal-secondary" onClick={onClose}>
                        <FaTimes /> {isAlert ? 'Aceptar' : (plan ? 'Revisar de nuevo' : 'Cancelar')}
                    </button>
                </div>
            </div>
        </div>
    );
}