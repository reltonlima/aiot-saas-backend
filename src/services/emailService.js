// Caminho: aiot-saas-backend/src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Configura o "transportador" de e-mail usando as credenciais do .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true para a porta 465, false para as outras
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// 2. Cria e exporta uma função para enviar os e-mails
const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Pluga.Shop AIoT" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log("E-mail de produção enviado com sucesso: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Erro ao enviar e-mail de produção:", error);
        throw error;
    }
};

// ==========================================================
// === NOVA FUNÇÃO DE VERIFICAÇÃO DE STATUS (NOSSO NOVO PADRÃO) ===
// ==========================================================
const testSmtpConnection = async () => {
    try {
        await transporter.verify();
        console.log('Serviço de E-mail (SMTP) configurado e pronto para uso.');
    } catch (error) {
        console.error('*** ERRO: Falha ao conectar com o serviço de E-mail (SMTP) ***');
        console.error(error.message);
        process.exit(1);
    }
};

module.exports = { 
    sendEmail,
    testSmtpConnection // Exportamos a nova função
};