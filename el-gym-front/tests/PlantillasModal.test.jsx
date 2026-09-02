import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PlantillasModal } from '../src/feactures/Admin/pages/PlantillasModal';

function plantillas(overrides = []) {
    return overrides.length ? overrides : [
        { _id: 'p1', titulo: 'Fuerza Nivel 1', sesiones: [{ nombre: 'Día 1' }, { nombre: 'Día 2' }] },
        { _id: 'p2', titulo: 'Cardio Express', sesiones: [{ nombre: 'Día 1' }] },
    ];
}

describe('PlantillasModal — render y búsqueda', () => {
    it('lista todas las plantillas recibidas, con la cantidad de días de cada una', () => {
        render(<PlantillasModal plantillas={plantillas()} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        expect(screen.getByText('Fuerza Nivel 1')).toBeInTheDocument();
        expect(screen.getByText('2 días')).toBeInTheDocument();
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.getByText('1 día')).toBeInTheDocument(); // singular, sin "s"
    });

    it('sin ninguna plantilla, muestra el estado vacío ("todavía no guardaste ninguna")', () => {
        render(<PlantillasModal plantillas={[]} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        expect(screen.getByText(/Todavía no guardaste ninguna plantilla/i)).toBeInTheDocument();
    });

    it('con plantillas pero una búsqueda sin resultados, muestra el estado vacío de "sin resultados" (distinto del de lista vacía)', () => {
        render(<PlantillasModal plantillas={plantillas()} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        fireEvent.change(screen.getByPlaceholderText(/Buscar plantilla/), { target: { value: 'zzz-no-existe' } });
        expect(screen.getByText(/No se encontraron resultados para "zzz-no-existe"/i)).toBeInTheDocument();
        expect(screen.queryByText(/Todavía no guardaste ninguna/i)).not.toBeInTheDocument();
    });

    it('la búsqueda filtra por coincidencia parcial, sin importar mayúsculas/minúsculas', () => {
        render(<PlantillasModal plantillas={plantillas()} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        fireEvent.change(screen.getByPlaceholderText(/Buscar plantilla/), { target: { value: 'cardio' } });
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.queryByText('Fuerza Nivel 1')).not.toBeInTheDocument();
    });

    it('borrar la búsqueda vuelve a mostrar todas las plantillas', () => {
        render(<PlantillasModal plantillas={plantillas()} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        const input = screen.getByPlaceholderText(/Buscar plantilla/);
        fireEvent.change(input, { target: { value: 'cardio' } });
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getByText('Fuerza Nivel 1')).toBeInTheDocument();
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
    });

    it('una plantilla sin sesiones (sesiones undefined) no crashea y muestra "0 días"', () => {
        render(<PlantillasModal plantillas={[{ _id: 'p3', titulo: 'Rota' }]} onClose={() => {}} onEditar={() => {}} onEliminar={() => {}} />);
        expect(screen.getByText('Rota')).toBeInTheDocument();
        expect(screen.getByText('0 días')).toBeInTheDocument();
    });
});

describe('PlantillasModal — acciones (editar, eliminar, cerrar)', () => {
    it('"Editar" en una fila llama a onEditar con esa plantilla completa', () => {
        const onEditar = vi.fn();
        const data = plantillas();
        render(<PlantillasModal plantillas={data} onClose={() => {}} onEditar={onEditar} onEliminar={() => {}} />);
        const filaCardio = screen.getByText('Cardio Express').closest('.plantilla-row');
        fireEvent.click(within(filaCardio).getByTitle('Editar plantilla'));
        expect(onEditar).toHaveBeenCalledWith(data[1]);
    });

    it('"Eliminar" en una fila llama a onEliminar con esa plantilla (el modal no borra nada por sí mismo)', () => {
        const onEliminar = vi.fn();
        const data = plantillas();
        render(<PlantillasModal plantillas={data} onClose={() => {}} onEditar={() => {}} onEliminar={onEliminar} />);
        const filaFuerza = screen.getByText('Fuerza Nivel 1').closest('.plantilla-row');
        fireEvent.click(within(filaFuerza).getByTitle('Eliminar plantilla'));
        expect(onEliminar).toHaveBeenCalledWith(data[0]);
    });

    it('el botón de cerrar (×) llama a onClose', () => {
        const onClose = vi.fn();
        render(<PlantillasModal plantillas={plantillas()} onClose={onClose} onEditar={() => {}} onEliminar={() => {}} />);
        fireEvent.click(document.querySelector('.close-modal-btn'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clickear el fondo oscuro (overlay) llama a onClose', () => {
        const onClose = vi.fn();
        render(<PlantillasModal plantillas={plantillas()} onClose={onClose} onEditar={() => {}} onEliminar={() => {}} />);
        fireEvent.click(document.querySelector('.modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clickear DENTRO de la tarjeta del modal NO llama a onClose (el click no debe "atravesar" al overlay)', () => {
        const onClose = vi.fn();
        render(<PlantillasModal plantillas={plantillas()} onClose={onClose} onEditar={() => {}} onEliminar={() => {}} />);
        fireEvent.click(document.querySelector('.plantillas-modal-card'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
