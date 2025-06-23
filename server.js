// Caminho: aiot-saas-backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/api/routes');
const db = require('./src/config/db'); // Importamos o objeto db completo
require('./src/services/mqttClient'); // Importa e inicializa o cliente MQTT

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

// Rota de teste
app.get('/', (req, res) => {
    res.send('API do AIoT SaaS v1.1 está no ar!');
});

// Rotas principais da API
app.use('/v1', apiRoutes);

// --- NOVA ROTINA DE INICIALIZAÇÃO ---
const startServer = async () => {
    // 1. Testa a conexão com o banco de dados PRIMEIRO.
    await db.testDbConnection();

    // 2. Se a conexão com o banco for bem-sucedida, inicia o servidor web.
    app.listen(PORT, () => {
        console.log(`Servidor web rodando na porta ${PORT}`);
    });
};

// Inicia todo o processo.
startServer();