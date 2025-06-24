// Caminho: aiot-saas-backend/src/config/db.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- NOVA FUNÇÃO DE QUERY EXPLÍCITA E ROBUSTA ---
const query = async (text, params) => {
    const start = Date.now();
    const client = await pool.connect(); // 1. Pega um cliente do pool
    try {
        const res = await client.query(text, params); // 2. Executa a query
        const duration = Date.now() - start;
        console.log('[DB] Query executada:', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('[DB] Erro na query:', { text });
        throw error;
    } finally {
        client.release(); // 3. O MAIS IMPORTANTE: sempre libera o cliente de volta para o pool
    }
};

const testDbConnection = async () => {
    try {
        // Agora o teste também usa nossa função de query robusta
        await query('SELECT NOW()');
        console.log('Backend conectado ao Banco de Dados (Supabase) com sucesso!');
    } catch (error) {
        console.error('*** ERRO: Falha ao conectar com o Banco de Dados (Supabase) ***');
        // Não precisamos mais do process.exit(1) aqui, pois a função query já lança o erro
    }
};

module.exports = {
  query, // Exportamos a nova função de query
  testDbConnection
};