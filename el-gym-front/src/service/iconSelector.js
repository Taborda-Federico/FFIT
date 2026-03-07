import { FaDumbbell, FaRunning, FaFistRaised, FaHeartbeat, FaBiking } from 'react-icons/fa';

const iconMap = {
    FaDumbbell: FaDumbbell,    // Guardamos la función, sin los < >
    FaRunning: FaRunning,
    FaFistRaised: FaFistRaised,
    FaHeartbeat: FaHeartbeat,
    FaBiking: FaBiking
};

export const getIcon = (name) => {
    // Si el nombre existe en el mapa, lo devuelve, si no, devuelve FaDumbbell por defecto
    const IconComponent = iconMap[name] || FaDumbbell;
    return IconComponent; 
};