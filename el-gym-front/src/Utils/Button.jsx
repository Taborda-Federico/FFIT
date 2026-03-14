import React from 'react';
import './Button.css';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    href,
    ...props
}) {
    const baseClass = `btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`;

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

export default Button;