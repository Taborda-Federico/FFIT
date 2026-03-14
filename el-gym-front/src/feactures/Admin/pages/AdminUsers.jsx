import React, { useState, useEffect } from 'react';
import {
    FaUserPlus, FaSearch, FaCheckCircle, FaExclamationCircle,
    FaClipboardList, FaUserFriends, FaIdCard, FaSpinner, FaTrash
} from 'react-icons/fa';
import { Button } from '../../../Utils/Button';
import { RegisterUserModal } from './RegisterUserModal';
import { Toast } from '../../../Utils/Toast';
import { ConfirmModal } from '../../../Utils/ConfirmModal';
import { UserService } from '../../../service/user.service';
import { useAuth } from '../../../contex/AuthContext';
import './AdminUsers.css';

export function AdminUsers() {
    const { user } = useAuth();
    const [busqueda, setBusqueda] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState(null);
    const [toast, setToast] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlumnos = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const data = await UserService.getStudents(user.token);
            setAlumnos(data);
        } catch (error) {
            console.error("Error:", error);
            setToast({ msg: "Error al cargar alumnos", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlumnos();
    }, [user]);

    const handleSaveUser = (newUser) => {
        setShowModal(false);
        setToast({ msg: `¡Socio ${newUser.nombre} registrado!`, type: 'success' });
        fetchAlumnos(); // Recargar lista
    };

    // --- ACCIÓN: COBRAR Y RENOVAR ---
    const handleCobrar = (alumno) => {
        setModalConfig({
            action: 'cobrar',
            alumno,
            title: 'Registrar Pago',
            type: 'info',
            confirmText: 'Aceptar Pago',
            message: `¿Confirmas que recibiste el pago de ${alumno.nombre}? Se le sumarán 30 días a su membresía.`
        });
    };

    // --- ACCIÓN: ELIMINAR ---
    const handleEliminar = (alumno) => {
        setModalConfig({
            action: 'eliminar',
            alumno,
            title: 'Eliminar Alumno',
            type: 'warning',
            confirmText: 'Sí, Eliminar',
            message: `⚠️ ADVERTENCIA: ¿Estás seguro de eliminar a ${alumno.nombre} del sistema? Esto no se puede deshacer.`
        });
    };

    // --- ACCIÓN: VER FICHA ---
    const handleVerFicha = (alumno) => {
        setModalConfig({
            action: 'info',
            alumno: null,
            isAlert: true,
            title: 'Ver Ficha Técnica',
            type: 'info',
            message: `Para ver la Ficha Técnica y Gráficos de ${alumno.nombre}, ve a la pestaña "Seguimiento" en tu menú lateral y búscalo por su nombre.`
        });
    };

    const handleConfirmAction = async () => {
        if (!modalConfig) return;
        const { action, alumno } = modalConfig;

        if (action === 'cobrar') {
            try {
                await UserService.renewMembership(alumno._id, user.token);
                setToast({ msg: `Pago de ${alumno.nombre} registrado. Membresía renovada.`, type: 'success' });
                fetchAlumnos();
            } catch (error) {
                setToast({ msg: "Error al registrar el pago", type: "error" });
            }
        } else if (action === 'eliminar') {
            try {
                await UserService.deleteUser(alumno._id, user.token);
                setToast({ msg: `Alumno ${alumno.nombre} eliminado del sistema`, type: 'success' });
                setAlumnos(alumnos.filter(a => a._id !== alumno._id));
            } catch (error) {
                setToast({ msg: "Error al eliminar alumno", type: "error" });
            }
        }
        setModalConfig(null);
    };

    // Filtro inteligente por Nombre o DNI
    const filtrados = alumnos.filter(a =>
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.dni.toString().includes(busqueda)
    );

    // --- LÓGICA DE VENCIMIENTOS ---
    const getStatusInfo = (fechaVencimiento) => {
        if (!fechaVencimiento) return { label: 'Sin Datos', class: 'debt', icon: <FaExclamationCircle />, sub: '-' };

        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: 'Vencido', class: 'debt', icon: <FaExclamationCircle />, sub: `Hace ${Math.abs(diffDays)}d` };
        if (diffDays <= 5) return { label: 'Por vencer', class: 'warning', icon: <FaExclamationCircle />, sub: `${diffDays}d restantes` };
        return { label: 'Al día', class: 'paid', icon: <FaCheckCircle />, sub: `Vence en ${diffDays}d` };
    };

    return (
        <div className="admin-users-view">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            {showModal && <RegisterUserModal onClose={() => setShowModal(false)} onSave={handleSaveUser} />}
            {modalConfig && (
                <ConfirmModal 
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    isAlert={modalConfig.isAlert}
                    confirmText={modalConfig.confirmText}
                    onConfirm={handleConfirmAction}
                    onClose={() => setModalConfig(null)}
                />
            )}

            {/* HEADER */}
            <header className="users-header-main">
                <div className="title-stack">
                    <h1>Socio <span className="text-neon">Management</span></h1>
                    <p><FaUserFriends /> {alumnos.length} Alumnos en el sistema</p>
                </div>
                <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
                    <FaUserPlus /> <span>Nuevo Socio</span>
                </Button>
            </header>

            {/* SEARCH */}
            <div className="search-section-pro">
                <div className="search-glass-box">
                    <FaSearch />
                    <input
                        placeholder="Buscar por nombre o DNI..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="users-list-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <FaSpinner className="spin" />
                        <p>Sincronizando alumnos...</p>
                    </div>
                ) : filtrados.length > 0 ? (
                    <table className="users-table-pro">
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Estado Pago</th>
                                <th>Vencimiento</th>
                                <th>Plan</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map(alumno => {
                                const status = getStatusInfo(alumno.fechaVencimiento);
                                return (
                                    <tr key={alumno._id} className="user-row-pro">
                                        <td data-label="Alumno">
                                            <div className="user-profile-cell">
                                                <div className="avatar-mini">{alumno.nombre.charAt(0)}</div>
                                                <div className="user-details">
                                                    <span className="u-name">{alumno.nombre}</span>
                                                    <span className="u-dni">DNI: {alumno.dni}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Estado">
                                            <div className={`status-badge-pro ${status.class}`}>
                                                {status.icon} {status.label}
                                            </div>
                                        </td>
                                        <td data-label="Vencimiento">
                                            <div className="vencimiento-cell">
                                                <span className="v-date">{new Date(alumno.fechaVencimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                                <span className={`v-sub ${status.class}`}>{status.sub}</span>
                                            </div>
                                        </td>
                                        <td data-label="Plan">
                                            <span className="plan-pill">{alumno.planActivoNombre || 'Sin Plan'}</span>
                                        </td>
                                        <td data-label="Acciones" className="text-right">
                                            <div className="actions-flex">
                                                {/* Botón Ver Ficha */}
                                                <button className="btn-action-pro" title="Ver Ficha Técnica" onClick={() => handleVerFicha(alumno)}>
                                                    <FaIdCard />
                                                </button>

                                                {/* Botón Eliminar */}
                                                <button className="btn-action-pro" title="Eliminar Alumno" onClick={() => handleEliminar(alumno)} style={{ color: '#ff4444' }}>
                                                    <FaTrash />
                                                </button>

                                                {/* Botón Cobrar */}
                                                <button className="btn-action-pro btn-pago" title="Registrar Pago y Renovar" onClick={() => handleCobrar(alumno)}>
                                                    $
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <FaSearch size={40} />
                        <p>No se encontraron resultados para "{busqueda}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}