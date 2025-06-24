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

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/v1', apiRoutes);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'index.html'));
});

// Rotina de Inicialização Final
const startServer = async () => {
    await db.testDbConnection();
    await emailService.testApiConnection(); // Chama a função de teste da API
    
    app.listen(PORT, () => {
        console.log(`Servidor full-stack rodando! Acesse a landing page em http://localhost:${PORT}`);
    });
};

startServer();