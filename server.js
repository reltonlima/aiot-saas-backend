// Caminho: aiot-saas-backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'src', 'public')));

// =====================================================================
// === NOVO MIDDLEWARE DE LOG PARA DEPURAR ===
// =====================================================================
// Este middleware será executado para TODAS as requisições que chegarem.
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Rota recebida: ${req.method} ${req.originalUrl}`);
    // Se a requisição tiver um corpo (body), também o logamos
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('   Corpo da requisição:', req.body);
    }
    next(); // Passa a requisição para o próximo handler (nossas rotas da API)
});
// =====================================================================


// Rotas principais da API (com prefixo /v1)
app.use('/v1', apiRoutes);

// Rota final para servir a landing page na raiz
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