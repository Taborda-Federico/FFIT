import React, { useState } from 'react';
import { FaTimes, FaSearch, FaCalendarCheck, FaDumbbell, FaPencilAlt, FaChevronDown, FaChevronUp, FaUserAlt } from 'react-icons/fa';
import './PlanesActivosModal.css';

// Sección "Planes Activos" del panel — pedido de un cliente real: hoy no
// hay ninguna forma de ver de un vistazo todo lo que está asignado ahora
// mismo, ni de editarlo (la única forma de "cambiar" un plan es publicar
// uno nuevo desde cero, lo que reemplaza el anterior entero). Acá se puede
// ver el contenido de cada plan (clic en la fila lo expande) o editarlo
// in-place — ver actualizarPlan en el backend para el porqué de que sea
// in-place y no un reemplazo.
export function PlanesActivosModal({ planes, onClose, onEditar }) {
    const [busqueda, setBusqueda] = useState('');
    const [expandidoId, setExpandidoId] = useState(null);

    const filtrados = planes.filter(p => {
        const texto = `${p.titulo || ''} ${p.alumnoId?.nombre || ''}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="planes-activos-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>

                <header className="modal-header">
                    <h2>Planes <span className="text-neon">Activos</span></h2>
                    <p>Lo que tiene asignado cada alumno ahora mismo — vélo o editalo sin perder su progreso.</p>
                </header>

                <div className="planes-activos-search-box">
                    <FaSearch />
                    <input
                        placeholder="Buscar por alumno o título..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="planes-activos-list">
                    {planes.length === 0 ? (
                        <div className="planes-activos-empty-state">
                            <FaCalendarCheck size={36} />
                            <p>Todavía no hay ningún plan activo asignado.</p>
                        </div>
                    ) : filtrados.length === 0 ? (
                        <div className="planes-activos-empty-state">
                            <FaSearch size={36} />
                            <p>No se encontraron resultados para "{busqueda}"</p>
                        </div>
                    ) : (
                        filtrados.map(p => {
                            const expandido = expandidoId === p._id;
                            return (
                                <div key={p._id} className={`plan-activo-row ${expandido ? 'expandido' : ''}`}>
                                    <div
                                        className="plan-activo-row-main"
                                        onClick={() => setExpandidoId(expandido ? null : p._id)}
                                    >
                                        <div className="plan-activo-row-info">
                                            <div className="plan-activo-icon"><FaDumbbell /></div>
                                            <div className="plan-activo-texts">
                                                <span className="plan-activo-alumno"><FaUserAlt size={9} /> {p.alumnoId?.nombre || 'Alumno eliminado'}</span>
                                                <span className="plan-activo-titulo">{p.titulo}</span>
                                                <span className="plan-activo-meta">
                                                    {p.sesiones?.length || 0} día{p.sesiones?.length === 1 ? '' : 's'} · {p.vencimiento ?? 0} semana{p.vencimiento === 1 ? '' : 's'} restante{p.vencimiento === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="plan-activo-row-actions">
                                            <button
                                                className="btn-action-plan-activo"
                                                title="Editar plan"
                                                onClick={(e) => { e.stopPropagation(); onEditar(p); }}
                                            >
                                                <FaPencilAlt />
                                            </button>
                                            {expandido ? <FaChevronUp className="chevron-icon" /> : <FaChevronDown className="chevron-icon" />}
                                        </div>
                                    </div>

                                    {expandido && (
                                        <div className="plan-activo-detalle">
                                            {(p.sesiones || []).map((s, i) => (
                                                <div key={s._id || i} className="detalle-sesion">
                                                    <h5>{s.nombre}</h5>
                                                    {(s.bloques || []).length === 0 && (
                                                        <p className="detalle-vacio">Sin bloques cargados.</p>
                                                    )}
                                                    {(s.bloques || []).map((b, bi) => (
                                                        <div key={b._id || bi} className="detalle-bloque">
                                                            <span className="detalle-bloque-tipo">{b.tipo}</span>
                                                            <ul>
                                                                {(b.ejercicios || []).map((ej, ei) => (
                                                                    <li key={ej._id || ei}>
                                                                        <span className="detalle-ej-nombre">{ej.nombre || 'Sin nombre'}</span>
                                                                        {ej.tiempo && <span className="detalle-ej-meta"> — {ej.tiempo}s</span>}
                                                                        {!ej.tiempo && ej.series && ej.reps && <span className="detalle-ej-meta"> — {ej.series}x{ej.reps}</span>}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
