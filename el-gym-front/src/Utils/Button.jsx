import React from 'react';
import './Button.css'; // Asegúrate de crear el archivo CSS arriba

/**
 * Componente Genérico de Botón FFIT
 * * @param {string} children - El texto o contenido del botón
 * @param {string} variant - 'primary' | 'secondary' | 'outline'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Si es true, ocupa el 100% del ancho
 * @param {string} href - Si existe, renderiza un tag <a> en vez de <button>
 * @param {function} onClick - Función a ejecutar al clickear
 */
export function Button({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    className = '',
    href,
    ...props 
}) {
    
    // Construimos la clase CSS basada en las props
    const baseClass = `btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`;

    // Si pasamos un href, renderizamos un link (a), si no, un botón normal
    if (href) {
        return (
            <a href={href} className={baseClass} {...props}>
                {children}
            </a>
        );
    }

    return (
        <button className={baseClass} {...props}>
            {children}
        </button>
    );
}

export default Button;1