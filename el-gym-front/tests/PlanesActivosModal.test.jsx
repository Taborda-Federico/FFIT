import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PlanesActivosModal } from '../src/feactures/Admin/pages/PlanesActivosModal';

function planes(overrides = []) {
    return overrides.length ? overrides : [
        {
            _id: 'plan1', titulo: 'Fuerza Nivel 1', vencimiento: 2,
            alumnoId: { _id: 'a1', nombre: 'Federico Gómez' },
            sesiones: [
                { _id: 's1', nombre: 'Día 1', bloques: [{ _id: 'b1', tipo: 'standard', ejercicios: [{ _id: 'e1', nombre: 'Sentadilla', series: '4', reps: '10' }] }] },
                { _id: 's2', nombre: 'Día 2', bloques: [] },
            ]
        },
        {
            _id: 'plan2', titulo: 'Cardio Express', vencimiento: 4,
            alumnoId: { _id: 'a2', nombre: 'Ana Pérez' },
            sesiones: [{ _id: 's3', nombre: 'Día 1', bloques: [{ _id: 'b2', tipo: 'circuit', ejercicios: [{ _id: 'e2', nombre: 'Burpees', tiempo: '30' }] }] }]
        },
    ];
}

describe('PlanesActivosModal — render y búsqueda', () => {
    it('lista todos los planes recibidos, con el alumno y la cantidad de días/semanas', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        expect(screen.getByText('Fuerza Nivel 1')).toBeInTheDocument();
        expect(screen.getByText(/Federico Gómez/)).toBeInTheDocument();
        expect(screen.getByText(/2 días.*2 semanas restantes/)).toBeInTheDocument();
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.getByText(/Ana Pérez/)).toBeInTheDocument();
        expect(screen.getByText(/1 día.*4 semanas restantes/)).toBeInTheDocument(); // singular "día"
    });

    it('un plan con vencimiento=1 muestra "1 semana restante" en singular', () => {
        render(<PlanesActivosModal planes={[{ _id: 'p', titulo: 'X', vencimiento: 1, alumnoId: { nombre: 'Y' }, sesiones: [] }]} onClose={() => { }} onEditar={() => { }} />);
        expect(screen.getByText(/1 semana restante(?!s)/)).toBeInTheDocument();
    });

    it('sin ningún plan activo, muestra el estado vacío', () => {
        render(<PlanesActivosModal planes={[]} onClose={() => { }} onEditar={() => { }} />);
        expect(screen.getByText(/Todavía no hay ningún plan activo asignado/i)).toBeInTheDocument();
    });

    it('con planes pero una búsqueda sin resultados, muestra el estado vacío de "sin resultados"', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText(/Buscar por alumno o título/), { target: { value: 'zzz-no-existe' } });
        expect(screen.getByText(/No se encontraron resultados para "zzz-no-existe"/i)).toBeInTheDocument();
        expect(screen.queryByText(/Todavía no hay ningún plan activo/i)).not.toBeInTheDocument();
    });

    it('la búsqueda encuentra por nombre de ALUMNO, no solo por título', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText(/Buscar por alumno o título/), { target: { value: 'ana' } });
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.queryByText('Fuerza Nivel 1')).not.toBeInTheDocument();
    });

    it('un plan sin alumnoId (alumno borrado) no crashea, muestra "Alumno eliminado"', () => {
        render(<PlanesActivosModal planes={[{ _id: 'p', titulo: 'Huérfano', vencimiento: 2, alumnoId: null, sesiones: [] }]} onClose={() => { }} onEditar={() => { }} />);
        expect(screen.getByText('Huérfano')).toBeInTheDocument();
        expect(screen.getByText(/Alumno eliminado/)).toBeInTheDocument();
    });
});

describe('PlanesActivosModal — expandir para ver el detalle (solo lectura)', () => {
    it('la fila arranca colapsada: no se ve el detalle de ejercicios', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        expect(screen.queryByText('Sentadilla')).not.toBeInTheDocument();
    });

    it('click en la fila la expande y muestra sesiones, bloques y ejercicios', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        expect(screen.getByText(/Día 2/)).toBeInTheDocument();
        expect(screen.getByText(/Sin bloques cargados/)).toBeInTheDocument(); // Día 2 no tiene bloques
    });

    it('click de nuevo la colapsa', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        expect(screen.queryByText('Sentadilla')).not.toBeInTheDocument();
    });

    it('expandir un plan no afecta al otro (cada fila se expande de forma independiente)', () => {
        render(<PlanesActivosModal planes={planes()} onClose={() => { }} onEditar={() => { }} />);
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        expect(screen.queryByText('Burpees')).not.toBeInTheDocument();
    });
});

describe('PlanesActivosModal — acciones (editar, cerrar)', () => {
    it('"Editar" en una fila llama a onEditar con ESE plan completo, sin expandir/colapsar la fila', () => {
        const onEditar = vi.fn();
        const data = planes();
        render(<PlanesActivosModal planes={data} onClose={() => { }} onEditar={onEditar} />);
        const filaCardio = screen.getByText('Cardio Express').closest('.plan-activo-row');
        fireEvent.click(within(filaCardio).getByTitle('Editar plan'));
        expect(onEditar).toHaveBeenCalledWith(data[1]);
        expect(screen.queryByText('Burpees')).not.toBeInTheDocument(); // no se expandió de rebote
    });

    it('el botón de cerrar (×) llama a onClose', () => {
        const onClose = vi.fn();
        render(<PlanesActivosModal planes={planes()} onClose={onClose} onEditar={() => { }} />);
        fireEvent.click(document.querySelector('.close-modal-btn'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clickear el fondo oscuro (overlay) llama a onClose', () => {
        const onClose = vi.fn();
        render(<PlanesActivosModal planes={planes()} onClose={onClose} onEditar={() => { }} />);
        fireEvent.click(document.querySelector('.modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clickear DENTRO de la tarjeta del modal NO llama a onClose', () => {
        const onClose = vi.fn();
        render(<PlanesActivosModal planes={planes()} onClose={onClose} onEditar={() => { }} />);
        fireEvent.click(document.querySelector('.planes-activos-modal-card'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
