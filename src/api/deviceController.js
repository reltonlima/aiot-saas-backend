// Caminho: aiot-saas-backend/src/api/deviceController.js

const db = require('../config/db');
const mqttClient = require('../services/mqttClient');

// listDevices e getDeviceById continuam iguais...
const listDevices = async (req, res) => {
    const ownerId = req.user.userId;
    try {
        const result = await db.query('SELECT uuid, name, created_at FROM devices WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
        res.status(200).json(result.rows);
    } catch (error) { res.status(500).json({ error: 'Erro interno do servidor.' }); }
};

const getDeviceById = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.params;
    try {
        const result = await db.query('SELECT uuid, name, created_at FROM devices WHERE uuid = $1 AND owner_id = $2', [uuid, ownerId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Dispositivo não encontrado ou você não tem permissão.' });
        res.status(200).json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Erro interno do servidor.' }); }
};

// claimDevice continua igual...
const claimDevice = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.body;
    if (!uuid) return res.status(400).json({ error: 'O UUID do dispositivo é obrigatório.' });
    try {
        const result = await db.query('UPDATE devices SET owner_id = $1 WHERE uuid = $2 AND owner_id IS NULL RETURNING uuid, name', [ownerId, uuid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Dispositivo não encontrado ou já reivindicado.' });
        res.status(200).json({ message: 'Dispositivo reivindicado com sucesso!', device: result.rows[0] });
    } catch (error) { res.status(500).json({ error: 'Erro interno do servidor.' }); }
};


// --- FUNÇÃO ATUALIZADA ---
const sendDeviceCommand = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.params;
    const { rele, estado, comando } = req.body; // Agora podemos receber 'comando'

    try {
        const deviceResult = await db.query('SELECT uuid FROM devices WHERE uuid = $1 AND owner_id = $2', [uuid, ownerId]);
        if (deviceResult.rowCount === 0) {
            return res.status(403).json({ error: 'Acesso negado. Você não é o dono deste dispositivo.' });
        }

        let payload;
        let successMessage;

        // Nova lógica para criar o payload correto
        if (comando && (comando === 'all_on' || comando === 'all_off')) {
            payload = JSON.stringify({ comando });
            successMessage = `Comando geral '${comando}' enviado com sucesso.`;
        } else if (rele && estado) {
            payload = JSON.stringify({ rele, estado });
            successMessage = `Comando '${estado}' para o relé ${rele} enviado com sucesso.`;
        } else {
            return res.status(400).json({ error: 'Payload da requisição inválido.' });
        }

        const topic = `pluga-shop/devices/${uuid}/comando`;
        
        mqttClient.publish(topic, payload, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao enviar comando para o dispositivo.' });
            }
            res.status(200).json({ message: successMessage });
        });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


module.exports = {
    listDevices,
    getDeviceById,
    claimDevice,
    sendDeviceCommand
};