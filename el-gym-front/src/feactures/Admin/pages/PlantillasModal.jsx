import React, { useState } from 'react';
import { FaTimes, FaSearch, FaClipboardList, FaDumbbell, FaPencilAlt, FaTrash } from 'react-icons/fa';
import './PlantillasModal.css';

// Modal de "Gestionar Plantillas" — pedido de un cliente real: con muchas
// plantillas guardadas, el <select> de "Cargar Plantilla..." del armador
// (que sigue existiendo, sin cambios) se vuelve inmanejable para elegir o
// para darse cuenta de cuáles ya no se usan. Este modal es un lugar
// dedicado para buscarlas, editarlas o borrarlas — la lista completa vive
// en el padre (AdminDashboard ya la cargaba para el <select>), acá solo se
// filtra y se muestra.
export function PlantillasModal({ plantillas, onClose, onEditar, onEliminar }) {
    const [busqueda, setBusqueda] = useState('');

    const filtradas = plantillas.filter(p =>
        (p.titulo || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="plantillas-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>

                <header className="modal-header">
                    <h2>Gestionar <span className="text-neon">Plantillas</span></h2>
                    <p>Buscá, editá o eliminá las plantillas que ya tenés guardadas.</p>
                </header>

                <div className="plantillas-search-box">
                    <FaSearch />
                    <input
                        placeholder="Buscar plantilla por título..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="plantillas-list">
                    {plantillas.length === 0 ? (
                        <div className="plantillas-empty-state">
                            <FaClipboardList size={36} />
                            <p>Todavía no guardaste ninguna plantilla.</p>
                        </div>
                    ) : filtradas.length === 0 ? (
                        <div className="plantillas-empty-state">
                            <FaSearch size={36} />
                            <p>No se encontraron resultados para "{busqueda}"</p>
                        </div>
                    ) : (
                        filtradas.map(p => (
                            <div key={p._id} className="plantilla-row">
                                <div className="plantilla-row-info">
                                    <div className="plantilla-icon"><FaDumbbell /></div>
                                    <div className="plantilla-texts">
                                        <span className="plantilla-titulo">{p.titulo}</span>
                                        <span className="plantilla-meta">
                                            {p.sesiones?.length || 0} día{p.sesiones?.length === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                </div>
                                <div className="plantilla-row-actions">
                                    <button
                                        className="btn-action-plantilla"
                                        title="Editar plantilla"
                                        onClick={() => onEditar(p)}
                                    >
                                        <FaPencilAlt />
                                    </button>
                                    <button
                                        className="btn-action-plantilla btn-borrar"
                                        title="Eliminar plantilla"
                                        onClick={() => onEliminar(p)}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
