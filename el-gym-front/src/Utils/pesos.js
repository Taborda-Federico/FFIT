// Helpers para trabajar con pesos (kg) de ejercicios: tipeo con coma o punto,
// formato para mostrar, y búsqueda del peso de la vez anterior.

// Normaliza un nombre de ejercicio para comparar/agrupar sin que
// mayúsculas o espacios de más lo hagan contar como "otro" ejercicio.
// (Se compara por NOMBRE y no por _id porque cada vez que se publica o edita
// un plan los _id de sus ejercicios cambian — ver docs/CAMBIOS.md #12.)
export function normalizarNombreEjercicio(nombre) {
    return (nombre || '').trim().toLowerCase();
}

// Limpia lo que el alumno tipea en el campo de peso: solo dígitos y UN
// separador decimal (coma o punto — en Argentina se escribe con coma, y el
// teclado numérico del celular suele ofrecer una u otra), con hasta 2
// decimales. Se conserva el separador tal cual lo tipeó para que no "salte"
// el texto mientras escribe; la conversión a número se hace con parsePeso.
export function sanitizarPesoInput(texto) {
    const limpio = String(texto ?? '').replace(/[^\d.,]/g, '');
    const idx = limpio.search(/[.,]/);
    if (idx === -1) return limpio;
    const entero = limpio.slice(0, idx);
    const decimales = limpio.slice(idx + 1).replace(/[.,]/g, '').slice(0, 2);
    return `${entero}${limpio[idx]}${decimales}`;
}

// "42,5" / "42.5" / 42.5 → 42.5. Cualquier cosa que no sea un número válido
// (vacío, texto, negativo) cuenta como 0.
export function parsePeso(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) && valor > 0 ? valor : 0;
    const n = Number(String(valor ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

// Para mostrar: coma decimal (como se escribe en Argentina), hasta 2
// decimales, sin ceros de más. Los enteros se ven igual que siempre ("40").
// El redondeo también evita cosas como 126.30000000000001 al multiplicar
// peso × repeticiones en el tonelaje.
export function formatPeso(valor) {
    const redondeado = Math.round((Number(valor) || 0) * 100) / 100;
    return String(redondeado).replace('.', ',');
}

// Peso "de la vez anterior" para un ejercicio: el mejor peso (el máximo de
// sus series) del entrenamiento más reciente donde aparece ese ejercicio con
// algún peso cargado. Devuelve null si nunca lo cargó. Los logs viejos (sin
// `series`) usan `pesoUsado`, igual que el resto de la app.
export function pesoAnteriorDe(historial, nombre) {
    const clave = normalizarNombreEjercicio(nombre);
    if (!clave || !Array.isArray(historial)) return null;

    const masNuevosPrimero = [...historial].sort(
        (a, b) => (new Date(b.createdAt) - new Date(a.createdAt)) || 0
    );

    for (const log of masNuevosPrimero) {
        const ej = (log.ejercicios || []).find(e => normalizarNombreEjercicio(e.nombre) === clave);
        if (!ej) continue;
        const peso = Array.isArray(ej.series) && ej.series.length > 0
            ? Math.max(...ej.series.map(s => parsePeso(s.peso)))
            : parsePeso(ej.pesoUsado ?? ej.peso);
        if (peso > 0) return peso;
    }
    return null;
}
