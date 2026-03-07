import React, { useState, useEffect } from 'react';
import { 
    FaWallet, FaArrowUp, FaArrowDown, FaUserClock, 
    FaFileInvoiceDollar, FaPlus, FaSearch, FaHistory 
} from 'react-icons/fa';
import { GymService } from '../../../service/gym.service';
import { Button } from '../../../Utils/Button';
import { Toast } from '../../../Utils/Toast';
import './AdminFinanceDashboard.css';

export function AdminFinanceDashboard() {
    const [stats, setStats] = useState({ totalRevenue: 0, pendingCount: 0, activeMembers: 0, growth: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        loadFinanceData();
    }, []);

    const loadFinanceData = async () => {
        try {
            setLoading(true);
            const [statsData, historyData] = await Promise.all([
                GymService.getAdminStats(),
                GymService.getHistorialFinanciero()
            ]);
            setStats(statsData);
            setTransactions(historyData);
        } catch (error) {
            console.error("Error al cargar finanzas", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="finance-dashboard-container">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <header className="finance-header">
                <div className="header-text">
                    <h1>Cashflow <span className="text-neon">Pro</span></h1>
                    <p>Gestión de ingresos, morosidad y proyecciones.</p>
                </div>
                <Button variant="primary" onClick={() => {/* Modal de pago */}}>
                    <FaPlus /> Registrar Ingreso
                </Button>
            </header>

            {/* GRID DE MÉTRICAS RÁPIDAS */}
            <section className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon revenue"><FaWallet /></div>
                    <div className="stat-info">
                        <label>Ingresos del Mes</label>
                        <h3>${stats.totalRevenue.toLocaleString()}</h3>
                        <span className="trend positive"><FaArrowUp /> 12% vs mes ant.</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon debt"><FaUserClock /></div>
                    <div className="stat-info">
                        <label>Pagos Pendientes</label>
                        <h3 className="text-error">{stats.pendingCount} socios</h3>
                        <span className="trend negative">Requiere acción</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon members"><FaFileInvoiceDollar /></div>
                    <div className="stat-info">
                        <label>Suscripciones Activas</label>
                        <h3>{stats.activeMembers}</h3>
                        <span className="trend positive">En crecimiento</span>
                    </div>
                </div>
            </section>

            {/* HISTORIAL DE TRANSACCIONES */}
            <section className="finance-main-content">
                <div className="content-card">
                    <div className="card-header">
                        <div className="title-group">
                            <FaHistory className="text-neon" />
                            <h3>Últimos Movimientos</h3>
                        </div>
                        <div className="search-mini">
                            <FaSearch />
                            <input placeholder="Buscar recibo o socio..." />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="finance-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Socio</th>
                                    <th>Concepto</th>
                                    <th>Método</th>
                                    <th>Monto</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center">Cargando flujos de caja...</td></tr>
                                ) : transactions.map(t => (
                                    <tr key={t.id} className="transaction-row">
                                        <td className="date-cell">{new Date(t.fecha).toLocaleDateString()}</td>
                                        <td className="user-cell"><strong>{t.socio}</strong></td>
                                        <td className="concept-cell">{t.concepto}</td>
                                        <td><span className="method-tag">{t.metodo}</span></td>
                                        <td className="amount-cell text-neon">${t.monto.toLocaleString()}</td>
                                        <td>
                                            <button className="btn-table-action" onClick={() => GymService.descargarRecibo(t.id)}>
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}