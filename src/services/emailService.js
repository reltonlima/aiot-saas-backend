// Caminho: aiot-saas-backend/src/services/emailService.js

const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

// Função de teste para verificar a conexão com a API
const testApiConnection = async () => {
    try {
        // 1. Instancia-se diretamente a API que queremos usar (AccountApi para o teste)
        const apiInstance = new Brevo.AccountApi();
        
        // 2. O método .setApiKey() é chamado NA INSTÂNCIA para autenticá-la.
        // Ele recebe o TIPO da chave e a CHAVE em si.
        apiInstance.setApiKey(Brevo.AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY);

        // 3. Executa a chamada com a instância autenticada.
        await apiInstance.getAccount();
        console.log('Serviço de E-mail (API Brevo) configurado e pronto para uso.');
    } catch (error) {
        console.error('*******************************************************************');
        console.error('*** ATENÇÃO: Falha ao conectar com a API do Brevo. ***');
        console.error('*** Verifique se a BREVO_API_KEY no arquivo .env está correta. ***');
        console.error('*******************************************************************');
    }
};

// Função para enviar os e-mails
const sendEmail = async ({ to, subject, html }) => {
    try {
        // Repetimos o mesmo padrão para a API de e-mails
        const apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

        const sendSmtpEmail = new Brevo.SendSmtpEmail();

        sendSmtpEmail.sender = {
            email: 'hello@pluga.shop', // IMPORTANTE: Coloque seu e-mail de remetente aqui
            name: 'Pluga.Shop AIoT'
        };
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = html;

        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("E-mail enviado com sucesso via API Brevo:", response.body);
        return response;
    } catch (error) {
        console.error("Erro ao enviar e-mail via API Brevo:", error.response ? error.response.text : error.message);
        throw error;
    }
};

module.exports = { 
    sendEmail,
    testApiConnection
};