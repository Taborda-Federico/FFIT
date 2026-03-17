import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

export function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            textAlign: 'center',
            padding: '20px'
        }}>
            <FaExclamationTriangle style={{ fontSize: '4rem', color: 'var(--neon, #d4f039)', marginBottom: '20px' }} />

            <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '3rem', margin: '0' }}>
                ERROR <span style={{ color: 'var(--neon, #d4f039)' }}>404</span>
            </h1>

            <p style={{ color: '#888', margin: '15px 0 30px', maxWidth: '300px' }}>
                Parece que te perdiste en el gimnasio. La página que buscas no existe o fue eliminada.
            </p>

            <button
                onClick={() => navigate('/')}
                style={{
                    backgroundColor: 'var(--neon, #d4f039)',
                    color: '#000',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textTransform: 'uppercase'
                }}
            >
                Volver al Inicio
            </button>
        </div>
    );
}