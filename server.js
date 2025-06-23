// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Importa o módulo 'path' do Node.js
const apiRoutes = require('./src/api/routes');
require('./src/services/mqttClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS (continua útil para flexibilidade)
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Middlewares padrões
app.use(express.json());

// =====================================================================
// === NOVA DIRETIVA PARA SERVIR O FRONTEND ===
// =====================================================================
// Diz ao Express para servir qualquer arquivo estático que esteja na pasta 'src/public'
app.use(express.static(path.join(__dirname, 'src', 'public')));
// =====================================================================


// Rotas principais da API (com prefixo /v1)
app.use('/v1', apiRoutes);

// --- NOVA ROTINA DE INICIALIZAÇÃO ---
const startServer = async () => {
    // db.testDbConnection() não é mais necessário aqui pois a conexão é feita sob demanda
    app.listen(PORT, () => {
        console.log(`Servidor full-stack rodando! Acesse o frontend em http://localhost:${PORT}/login.html`);
    });
};

startServer();