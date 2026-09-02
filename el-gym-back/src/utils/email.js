// Comparación de emails "case-insensitive, sin migrar nada".
//
// Por qué existe: el email se guarda en la base tal cual lo escribió quien
// lo cargó (un admin creando un alumno, o el propio registro) — no hay
// ningún `lowercase: true` en el schema (ver src/models/User.js). Eso
// significa que "Juan@Gmail.com" y "juan@gmail.com" son, para Mongo, dos
// strings distintos. En la práctica esto rompía el login: un admin carga
// el email de un alumno con mayúsculas (autocompletado del teclado, copiar
// y pegar de una tarjeta, etc.) y el alumno, al loguearse escribiendo todo
// en minúscula (lo más común), recibía "Email o contraseña incorrectos"
// con la contraseña perfecta.
//
// La solución NO es agregar `lowercase: true` al schema ni un índice único
// case-insensitive (`collation`): cualquiera de las dos cosas requeriría
// saber de antemano que no hay ya, en la base de producción de meses de
// uso, dos cuentas distintas cuyos emails solo difieren en mayúsculas —
// algo que no podemos verificar sin acceso directo a esa base. Migrar en
// esas condiciones podría chocar contra el índice único existente y romper
// cuentas reales. En cambio, se compara con un regex "ignore case" solo al
// MOMENTO DE BUSCAR (login, chequeo de duplicados) — el dato guardado no se
// toca, cero riesgo de romper nada existente.
function regexEmailExactoInsensible(email) {
    if (typeof email !== 'string' || email.length === 0) {
        // Rechazar cualquier cosa que no sea un string (ej. un operador de
        // Mongo como { $gt: '' } mandado a mano en el body) ACÁ, antes de
        // que llegue a una query, es más explícito y más seguro que dejar
        // que Mongoose lo castee o lo interprete — ver
        // tests/security/nosqlInjection.e2e.test.js.
        return null;
    }
    // Escapamos los caracteres especiales de regex: si no lo hiciéramos,
    // un email con "forma" de patrón (ej. con un punto suelto) podría
    // matchear de más de lo que el usuario realmente escribió. Anclado con
    // ^...$ para que sea SIEMPRE un match exacto de todo el string, nunca
    // "contiene".
    const escapado = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapado}$`, 'i');
}

module.exports = { regexEmailExactoInsensible };
