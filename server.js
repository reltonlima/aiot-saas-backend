// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/api/routes');
require('./src/services/mqttClient'); // Importa e inicializa o cliente MQTT

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS para desenvolvimento local
// Permite que o frontend (ex: http://127.0.0.1:5500) acesse a API.
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
    res.send('API do AIoT SaaS (DEV) está no ar!');
});

// Rotas principais da API
app.use('/v1', apiRoutes);

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor de desenvolvimento rodando em http://localhost:${PORT}`);
});