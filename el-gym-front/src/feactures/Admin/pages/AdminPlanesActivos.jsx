import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaSearch, FaCalendarCheck, FaDumbbell, FaPencilAlt, FaArrowLeft,
    FaUserAlt, FaSpinner, FaChevronRight, FaClock
} from 'react-icons/fa';
import { useAuth } from '../../../contex/AuthContext';
import { PlanService } from '../../../service/plan.service';
import './AdminPlanesActivos.css';

// Pestaña propia "Planes Activos" en la navegación del admin — pedido del
// cliente: antes no había ninguna forma de ver de un vistazo todo lo que
// está asignado, ni de editarlo (la única forma de "cambiar" un plan era
// publicar uno nuevo desde cero, lo que reemplaza el anterior entero).
//
// Acá se busca y se elige un plan de la lista, se lo ve en grande (todas
// sus sesiones, bloques y ejercicios) y desde ahí un botón chico de
// "Editar" lo manda al armador de siempre (AdminDashboard, en
// /admin/planes) ya cargado en modo edición — la edición en sí (in-place,
// sin perder el progreso del alumno) vive ahí, ver actualizarPlan en el
// backend para el porqué.
export function AdminPlanesActivos() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);

    useEffect(() => {
        if (!user?.token) return;
        (async () => {
            try {
                setLoading(true);
                const data = await PlanService.getPlanesActivos(user.token);
                setPlanes(data);
            } catch (error) {
                console.error('Error al cargar los planes activos:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    const filtrados = planes.filter(p => {
        const texto = `${p.titulo || ''} ${p.alumnoId?.nombre || ''}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
    });

    const handleEditar = (plan) => {
        // El plan a editar viaja en el state de la navegación (no por
        // localStorage): es un traspaso de una sola vez entre pestañas del
        // panel, no algo que tenga que sobrevivir un F5 — AdminDashboard lo
        // toma al montarse y carga el armador en modo edición.
        navigate('/admin/planes', { state: { planParaEditar: plan } });
    };

    if (seleccionado) {
        return (
            <div className="admin-planes-activos-view">
                <button className="btn-volver-planes" onClick={() => setSeleccionado(null)}>
                    <FaArrowLeft /> Volver a la lista
                </button>

                <div className="plan-detalle-grande">
                    <div className="detalle-grande-header">
                        <div className="detalle-grande-alumno"><FaUserAlt size={11} /> {seleccionado.alumnoId?.nombre || 'Alumno eliminado'}</div>
                        <div className="detalle-grande-titulo-row">
                            <h1>{seleccionado.titulo}</h1>
                            <button className="btn-editar-chico" onClick={() => handleEditar(seleccionado)} title="Editar este plan">
                                <FaPencilAlt /> Editar
                            </button>
                        </div>
                        <div className="detalle-grande-meta">
                            <FaClock /> {seleccionado.vencimiento ?? 0} semana{seleccionado.vencimiento === 1 ? '' : 's'} restante{seleccionado.vencimiento === 1 ? '' : 's'}
                            <span className="meta-separador">·</span>
                            {seleccionado.sesiones?.length || 0} día{seleccionado.sesiones?.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div className="detalle-grande-sesiones">
                        {(seleccionado.sesiones || []).map((s, i) => (
                            <div key={s._id || i} className="detalle-grande-sesion">
                                <h3><FaDumbbell className="text-neon" /> {s.nombre}</h3>
                                {(s.bloques || []).length === 0 && (
                                    <p className="detalle-grande-vacio">Sin bloques cargados.</p>
                                )}
                                {(s.bloques || []).map((b, bi) => (
                                    <div key={b._id || bi} className="detalle-grande-bloque">
                                        <span className="detalle-grande-bloque-tipo">{b.tipo}</span>
                                        <ul>
                                            {(b.ejercicios || []).map((ej, ei) => (
                                                <li key={ej._id || ei}>
                                                    <span className="detalle-grande-ej-nombre">{ej.nombre || 'Sin nombre'}</span>
                                                    {ej.tiempo && <span className="detalle-grande-ej-meta"> — {ej.tiempo}s</span>}
                                                    {!ej.tiempo && ej.series && ej.reps && <span className="detalle-grande-ej-meta"> — {ej.series}x{ej.reps}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-planes-activos-view">
            <header className="planes-activos-header-main">
                <div className="title-stack">
                    <h1>Planes <span className="text-neon">Activos</span></h1>
                    <p><FaCalendarCheck /> {planes.length} plan{planes.length === 1 ? '' : 'es'} asignado{planes.length === 1 ? '' : 's'} ahora mismo</p>
                </div>
            </header>

            <div className="search-section-pro">
                <div className="search-glass-box">
                    <FaSearch />
                    <input
                        placeholder="Buscar por alumno o título..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <FaSpinner className="spin" />
                    <p>Cargando planes activos...</p>
                </div>
            ) : filtrados.length === 0 ? (
                <div className="empty-state">
                    <FaSearch size={40} />
                    <p>{planes.length === 0 ? 'Todavía no hay ningún plan activo asignado.' : `No se encontraron resultados para "${busqueda}"`}</p>
                </div>
            ) : (
                <div className="planes-activos-cards">
                    {filtrados.map(p => (
                        <button key={p._id} className="plan-activo-card" onClick={() => setSeleccionado(p)}>
                            <div className="plan-activo-card-icon"><FaDumbbell /></div>
                            <div className="plan-activo-card-texts">
                                <span className="plan-activo-card-alumno"><FaUserAlt size={9} /> {p.alumnoId?.nombre || 'Alumno eliminado'}</span>
                                <span className="plan-activo-card-titulo">{p.titulo}</span>
                                <span className="plan-activo-card-meta">
                                    {p.sesiones?.length || 0} día{p.sesiones?.length === 1 ? '' : 's'} · {p.vencimiento ?? 0} semana{p.vencimiento === 1 ? '' : 's'} restante{p.vencimiento === 1 ? '' : 's'}
                                </span>
                            </div>
                            <FaChevronRight className="plan-activo-card-chevron" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
