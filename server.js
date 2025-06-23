// Caminho: aiot-saas-backend/server.js

require('dotenv').config();
const express = require('express');
const cors =require('cors');
const path = require('path'); // Importa o módulo 'path' do Node.js, essencial para caminhos de arquivo
const apiRoutes = require('./src/api/routes');
const db = require('./src/config/db');
const emailService = require('./src/services/emailService');
require('./src/services/mqttClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Middlewares padrões
app.use(express.json());


// =====================================================================
// === CORREÇÃO APLICADA AQUI ===
// =====================================================================
// Diz ao Express para servir qualquer arquivo estático que esteja na pasta 'src/public'.
// Agora, quando uma requisição chegar para /login.html, o Express irá encontrá-lo e entregá-lo.
app.use(express.static(path.join(__dirname, 'src', 'public')));
// =====================================================================


// Rotas principais da API (com prefixo /v1)
app.use('/v1', apiRoutes);

// Rota final para servir a página principal (landing page) na raiz do site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'index.html'));
});


// Rotina de Inicialização
const startServer = async () => {
    await db.testDbConnection();
    await emailService.testSmtpConnection();
    app.listen(PORT, () => {
        console.log(`Servidor full-stack rodando! Acesse a landing page em http://localhost:${PORT}`);
    });
};

startServer();