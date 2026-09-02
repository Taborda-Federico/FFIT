
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { MainPrincipal } from './feactures/gym-main/pantalla_principal/mainPantalla';
import { AuthProvider } from './contex/AuthContext';
import { ProtectedRoute } from './Utils/ProtectedRoute';


import { AdminLayout } from './feactures/Admin/layouts/AdminLayout';
import { AdminDashboard } from './feactures/Admin/pages/AdminDashboard';
import { AdminUsers } from './feactures/Admin/pages/AdminUsers';
import { AdminLandingEditor } from './feactures/Admin/pages/AdminLandingEditor';
import { StudentProgressView } from './feactures/Admin/pages/StudentProgressView'
import { NotFound } from './Utils/NotFound';
import { UserDashboard } from './feactures/User/UserDashboard';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainPrincipal />} />

                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireAdmin={true}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<AdminUsers />} />
                        <Route path="planes" element={<AdminDashboard />} />
                        <Route path="finanzas" element={<div>Finanzas</div>} />
                        <Route path="editor" element={<AdminLandingEditor />} />
                        <Route path="progreso" element={<StudentProgressView />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>

                    <Route
                        path="/user/*"
                        element={
                            <ProtectedRoute requireAdmin={false}>
                                <UserDashboard />
                            </ProtectedRoute>
                        }

                    />

                    {/* --- FALLBACK --- */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}