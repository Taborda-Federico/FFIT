// tests/setup/env.js
//
// Variables de entorno para la suite de tests. Se cargan ANTES de que
// se importe cualquier módulo de la app (Jest `setupFiles`), así
// jsonwebtoken/adminSecret tienen algo determinístico para comparar.
// Nunca deben apuntar a credenciales reales.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-nunca-usar-en-produccion';
process.env.ADMIN_REGISTRATION_SECRET = 'test-admin-bootstrap-secret';
process.env.EMAIL_USER = 'test@ffit.test';
process.env.EMAIL_PASS = 'test-pass-dummy';
