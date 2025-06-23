// Caminho: aiot-saas-backend/src/config/db.js

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  // SSL é necessário para conexões remotas com serviços como Supabase/Heroku/etc.
  ssl: connectionString ? { rejectUnauthorized: false } : false
});

// --- NOVA FUNÇÃO PARA TESTAR A CONEXÃO ---
const testDbConnection = async () => {
    try {
        await pool.query('SELECT NOW()'); // Faz uma consulta simples para testar
        console.log('Backend conectado ao Banco de Dados (Supabase) com sucesso!');
    } catch (error) {
        console.error('*** ERRO: Falha ao conectar com o Banco de Dados (Supabase) ***');
        console.error(error.message);
        // Encerra a aplicação se não conseguir conectar ao banco, pois ela não funcionará corretamente.
        process.exit(1);
    }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  testDbConnection // Exportamos a nova função
};