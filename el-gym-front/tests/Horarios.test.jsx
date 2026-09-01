import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Horarios } from '../src/feactures/gym-main/Comoponents/Horarios/Horarios';

describe('Horarios — grilla estática semanal (Lunes a Viernes, sin fin de semana)', () => {
    it('muestra las 5 columnas Lunes-Viernes, sin Sábado ni Domingo', () => {
        render(<Horarios />);
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].forEach(d => {
            expect(screen.getByText(d)).toBeInTheDocument();
        });
        expect(screen.queryByText('Sábado')).not.toBeInTheDocument();
        expect(screen.queryByText('Domingo')).not.toBeInTheDocument();
    });

    it('el buscador de rutina NO muestra resultados hasta elegir objetivo Y al menos un día', () => {
        render(<Horarios />);
        expect(screen.queryByText('Tu Plan Sugerido:')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText(/Fuerza y Músculo/));
        expect(screen.queryByText('Tu Plan Sugerido:')).not.toBeInTheDocument(); // falta el día
    });
});

describe('Horarios — selector de días', () => {
    it('"TODOS" selecciona los 5 días; un segundo click los deselecciona todos', () => {
        render(<Horarios />);
        fireEvent.click(screen.getByText(/Fuerza y Músculo/));
        const botonTodos = screen.getByText('TODOS');
        fireEvent.click(botonTodos);
        expect(screen.getByText('Tu Plan Sugerido:')).toBeInTheDocument();
        fireEvent.click(botonTodos);
        expect(screen.queryByText('Tu Plan Sugerido:')).not.toBeInTheDocument();
    });

    it('togglear un día individual lo agrega/quita de la selección', () => {
        render(<Horarios />);
        fireEvent.click(screen.getByText(/Fuerza y Músculo/));
        fireEvent.click(screen.getByText('Lun'));
        expect(screen.getByText('Tu Plan Sugerido:')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Lun'));
        expect(screen.queryByText('Tu Plan Sugerido:')).not.toBeInTheDocument();
    });

    it('"LIMPIAR FILTROS" resetea objetivo y días, ocultando el resultado', () => {
        render(<Horarios />);
        fireEvent.click(screen.getByText(/Fuerza y Músculo/));
        fireEvent.click(screen.getByText('Lun'));
        fireEvent.click(screen.getByText(/LIMPIAR FILTROS/));
        expect(screen.queryByText('Tu Plan Sugerido:')).not.toBeInTheDocument();
    });
});

describe('Horarios — filtrado por objetivo', () => {
    it('objetivo "Entrenamiento Libre" (tipo=libre) solo trae clases "Gimnasio Libre" del día elegido', () => {
        render(<Horarios />);
        fireEvent.click(screen.getByText(/Entrenamiento Libre/));
        fireEvent.click(screen.getByText('Mar')); // Martes tiene 2 "Gimnasio Libre" (09:30 y 15:00)
        // Hay dos encabezados "Martes": la grilla estática de arriba y la del
        // resultado filtrado ("Tu Plan Sugerido") — nos interesa el segundo.
        const encabezados = screen.getAllByText('Martes');
        const columna = encabezados[encabezados.length - 1].closest('.day-column');
        const clases = within(columna).getAllByText('Gimnasio Libre');
        expect(clases.length).toBeGreaterThan(0);
        expect(within(columna).queryByText('FFIT RX')).not.toBeInTheDocument(); // tipo "avanzado", no "libre"
    });

    it('un día sin ninguna clase que matchee el objetivo elegido muestra la columna vacía sin crashear', () => {
        render(<Horarios />);
        fireEvent.click(screen.getByText(/Entrenamiento Libre/));
        fireEvent.click(screen.getByText('Lun')); // Lunes no tiene ninguna clase tipo "libre"
        expect(screen.getByText('Tu Plan Sugerido:')).toBeInTheDocument();
    });
});
