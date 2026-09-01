// __mocks__/nodemailer.js
//
// Mock global de nodemailer para TODA la suite (Jest lo aplica automáticamente
// a cualquier `require('nodemailer')` por estar en __mocks__ junto a node_modules,
// sin necesidad de jest.mock('nodemailer') en cada archivo).
//
// Por qué existe: config/mailer.js crea un transporter real de Gmail. Sin este
// mock, cualquier test que ejercite publicarPlan/createStudent/el cron de
// vencimientos intentaría una conexión SMTP real de verdad — lento, no
// determinístico, y potencialmente enviando emails reales a alumnos de prueba.
let sentMails = [];
let shouldFailAll = false;
let failForRecipients = [];

const transporter = {
    sendMail: jest.fn(async (options) => {
        if (shouldFailAll || failForRecipients.includes(options.to)) {
            throw new Error('Mock SMTP failure (simulado por el test)');
        }
        sentMails.push(options);
        return { messageId: `mock-${sentMails.length}` };
    }),
    verify: jest.fn((cb) => { if (cb) cb(null, true); })
};

module.exports = {
    createTransport: jest.fn(() => transporter),
    __getSentMails: () => sentMails,
    __resetMailMock: () => {
        sentMails = [];
        shouldFailAll = false;
        failForRecipients = [];
        transporter.sendMail.mockClear();
    },
    __setShouldFailAll: (val) => { shouldFailAll = val; },
    __setFailForRecipients: (arr) => { failForRecipients = arr; }
};
