// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de la vista principal
import { MainPrincipal } from './feactures/gym-main/pantalla_principal/mainPantalla';
import {AuthProvider} from './contex/AuthContext'
// Importación de Páginas de Admin
import { AdminLayout } from './feactures/Admin/layouts/AdminLayout';
import { AdminDashboard } from './feactures/Admin/pages/AdminDashboard';
import { AdminUsers } from './feactures/Admin/pages/AdminUsers';
import { AdminLandingEditor } from './feactures/Admin/pages/AdminLandingEditor';
import { AdminRegister } from './feactures/Admin/pages/AdminRegister';
import { AdminFinanceDashboard } from './feactures/Admin/pages/AdminFinanceDashboard';
import{UserDashboard} from './feactures/User/UserDashboard'
import{WorkoutView} from './feactures/User/WorkoutView'
export default function App() {
    return (
        <AuthProvider> {/* Proveedor de datos global */}
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<MainPrincipal />} />
                    
                    {/* Admin - Usamos rutas anidadas para escalabilidad */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminUsers />} /> 
                        <Route path="planes" element={<AdminDashboard />} />
                        <Route path="finanzas" element={<div>Finanzas</div>} />
                         <Route path="editor" element={<AdminLandingEditor/>} />
                    </Route>

                    {/* User - Estructura móvil escalable */}
                    <Route path="/user/*" element={<UserDashboard />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}