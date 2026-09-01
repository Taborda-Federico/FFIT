import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLandingEditor } from '../src/feactures/Admin/pages/AdminLandingEditor';

const { getLandingMock, updateLandingMock, authValue } = vi.hoisted(() => ({
    getLandingMock: vi.fn(),
    updateLandingMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/landing.service', () => ({
    LandingService: { getLanding: getLandingMock, updateLanding: updateLandingMock }
}));

beforeEach(() => {
    getLandingMock.mockReset().mockResolvedValue({ heroBackgrounds: [], clases: [], coaches: [] });
    updateLandingMock.mockReset().mockResolvedValue({});
});

async function esperarCarga() {
    await waitFor(() => expect(screen.queryByText(/Editor de/)).toBeInTheDocument());
}

describe('AdminLandingEditor — carga inicial (fallback a defaults locales)', () => {
    it('si el admin nunca configuró nada, usa las clases/coaches "de fábrica" de siteData.js, no una lista vacía', async () => {
        render(<AdminLandingEditor />);
        await esperarCarga();
        expect(screen.getByDisplayValue('Crossfit')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Musculación')).toBeInTheDocument();
    });

    it('si el admin YA guardó sus propias clases, usa esas y NO los defaults', async () => {
        getLandingMock.mockResolvedValue({
            heroBackgrounds: [], clases: [{ _id: 'c1', title: 'Mi Clase Personalizada', description: '' }], coaches: []
        });
        render(<AdminLandingEditor />);
        await esperarCarga();
        expect(screen.getByDisplayValue('Mi Clase Personalizada')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Crossfit')).not.toBeInTheDocument();
    });

    it('si falla la carga, muestra un toast de error (pero igual deja de cargar y renderiza los defaults)', async () => {
        getLandingMock.mockRejectedValue(new Error('fail'));
        render(<AdminLandingEditor />);
        expect(await screen.findByText(/Error al cargar los datos/)).toBeInTheDocument();
    });
});

describe('AdminLandingEditor — agregar/quitar tarjetas', () => {
    it('"Añadir Clase" agrega una tarjeta nueva con valores por defecto', async () => {
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.click(screen.getByText(/Añadir Clase/));
        expect(screen.getByDisplayValue('Nueva Clase')).toBeInTheDocument();
    });

    it('"Añadir Coach" agrega un coach con nombre/rol por defecto', async () => {
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.click(screen.getByText(/Añadir Coach/));
        expect(screen.getByDisplayValue('Nuevo Coach')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Especialidad')).toBeInTheDocument();
    });

    it('BUG POTENCIAL DE BAJA PROBABILIDAD: los ids de tarjetas nuevas usan Date.now(); si dos clicks caen en el mismo milisegundo, generan el mismo id', async () => {
        render(<AdminLandingEditor />);
        await esperarCarga();
        vi.spyOn(Date, 'now').mockReturnValue(123456789);
        fireEvent.click(screen.getByText(/Añadir Clase/));
        fireEvent.click(screen.getByText(/Añadir Clase/));
        const nuevas = screen.getAllByDisplayValue('Nueva Clase');
        expect(nuevas).toHaveLength(2);
        // React usaría `key={clase.id}` duplicada acá — problemático para el
        // reconciliador si en el medio se borra/reordena.
        vi.restoreAllMocks();
    });

    it('borrar una clase la saca de la lista', async () => {
        getLandingMock.mockResolvedValue({ heroBackgrounds: [], clases: [{ _id: 'c1', title: 'Para Borrar', description: '' }], coaches: [] });
        render(<AdminLandingEditor />);
        await esperarCarga();
        const tarjeta = screen.getByDisplayValue('Para Borrar').closest('.edit-card-item');
        fireEvent.click(tarjeta.querySelector('.btn-delete-card-abs'));
        expect(screen.queryByDisplayValue('Para Borrar')).not.toBeInTheDocument();
    });

    it('editar el título de una clase actualiza solo esa clase', async () => {
        getLandingMock.mockResolvedValue({
            heroBackgrounds: [], coaches: [],
            clases: [{ _id: 'c1', title: 'Clase A', description: '' }, { _id: 'c2', title: 'Clase B', description: '' }]
        });
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.change(screen.getByDisplayValue('Clase A'), { target: { value: 'Clase A Editada' } });
        expect(screen.getByDisplayValue('Clase A Editada')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Clase B')).toBeInTheDocument();
    });

    it('el campo de especialidades de un coach se guarda como array (split por coma) aunque se muestre como texto', async () => {
        getLandingMock.mockResolvedValue({ heroBackgrounds: [], clases: [], coaches: [{ _id: 'co1', name: 'Coach X', role: 'R', specialty: [], bio: '' }] });
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.change(screen.getByPlaceholderText(/Tags/), { target: { value: 'Fuerza, Boxeo' } });
        fireEvent.click(screen.getByText(/Guardar Cambios/));
        await waitFor(() => expect(updateLandingMock).toHaveBeenCalled());
        const payload = updateLandingMock.mock.calls[0][0];
        expect(payload.coaches[0].specialty).toEqual(['Fuerza', 'Boxeo']);
    });
});

describe('AdminLandingEditor — subida de imágenes (directo a Cloudinary, sin pasar por el backend)', () => {
    it('sube el archivo directamente a la API de Cloudinary con un preset público (no autenticado, no pasa por nuestro backend)', async () => {
        getLandingMock.mockResolvedValue({ heroBackgrounds: [], clases: [{ _id: 'c1', title: 'X', description: '' }], coaches: [] });
        global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ secure_url: 'https://res.cloudinary.com/x/foto.jpg' }) });
        render(<AdminLandingEditor />);
        await esperarCarga();
        const inputFile = document.querySelector('input[type="file"]');
        const archivo = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' });
        fireEvent.change(inputFile, { target: { files: [archivo] } });
        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://api.cloudinary.com/v1_1/'),
            expect.objectContaining({ method: 'POST' })
        ));
        expect(await screen.findByText(/Imagen cargada con éxito/)).toBeInTheDocument();
    });

    it('si Cloudinary no devuelve secure_url, no actualiza la tarjeta ni marca error visible (silencioso)', async () => {
        getLandingMock.mockResolvedValue({ heroBackgrounds: [], clases: [{ _id: 'c1', title: 'X', description: '' }], coaches: [] });
        global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ error: 'preset inválido' }) });
        render(<AdminLandingEditor />);
        await esperarCarga();
        const inputFile = document.querySelector('input[type="file"]');
        fireEvent.change(inputFile, { target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] } });
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(screen.queryByText(/Imagen cargada con éxito/)).not.toBeInTheDocument();
        expect(screen.queryByText(/error al subir/i)).not.toBeInTheDocument();
    });

    it('un fallo de red al subir muestra un toast de error', async () => {
        getLandingMock.mockResolvedValue({ heroBackgrounds: [], clases: [{ _id: 'c1', title: 'X', description: '' }], coaches: [] });
        global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));
        render(<AdminLandingEditor />);
        await esperarCarga();
        const inputFile = document.querySelector('input[type="file"]');
        fireEvent.change(inputFile, { target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] } });
        expect(await screen.findByText(/error al subir la imagen/i)).toBeInTheDocument();
    });
});

describe('AdminLandingEditor — guardar', () => {
    it('"Guardar Cambios" manda heroBackgrounds+clases+coaches juntos y muestra éxito', async () => {
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.click(screen.getByText(/Guardar Cambios/));
        await waitFor(() => expect(updateLandingMock).toHaveBeenCalledWith(
            expect.objectContaining({ heroBackgrounds: expect.any(Array), clases: expect.any(Array), coaches: expect.any(Array) }),
            'tok'
        ));
        expect(await screen.findByText(/ya son visibles/)).toBeInTheDocument();
    });

    it('si falla el guardado, muestra un toast de error', async () => {
        updateLandingMock.mockRejectedValue(new Error('fail'));
        render(<AdminLandingEditor />);
        await esperarCarga();
        fireEvent.click(screen.getByText(/Guardar Cambios/));
        expect(await screen.findByText(/Error al guardar los cambios/)).toBeInTheDocument();
    });
});
