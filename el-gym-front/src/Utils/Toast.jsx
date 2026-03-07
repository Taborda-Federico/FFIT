import React, { useState, useEffect } from 'react';
export function Toast({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast-container ${type}`}>
            {message}
        </div>
    );
}