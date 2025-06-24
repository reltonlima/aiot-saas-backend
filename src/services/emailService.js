// Caminho: aiot-saas-backend/src/services/emailService.js

const nodemailer = require('nodemailer');
require('dotenv').config();

// Configura o "transportador" de e-mail usando as credenciais SMTP do .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Pluga.Shop AIoT" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });
        console.log("E-mail de teste SMTP enviado com sucesso: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Erro ao tentar enviar e-mail via SMTP:", error);
        throw error;
    }
};

const testSmtpConnection = async () => {
    try {
        await transporter.verify();
        console.log('Serviço de E-mail (SMTP) configurado e pronto para uso.');
    } catch (error) {
        console.error('*******************************************************************');
        console.error('*** ATENÇÃO: Falha ao conectar com o serviço de E-mail (SMTP) ***');
        console.error(`*** ERRO: ${error.message} ***`);
        console.error('*** Verifique as credenciais SMTP no .env e as regras de firewall (ufw). ***');
        console.error('*******************************************************************');
    }
};

module.exports = { 
    sendEmail,
    testSmtpConnection // Exporta a função de teste SMTP
};