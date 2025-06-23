// Caminho completo: aiot-saas-backend/src/api/deviceController.js

const db = require('../config/db');
const mqttClient = require('../services/mqttClient');

const listDevices = async (req, res) => {
    // req.user.userId é adicionado pelo middleware de autenticação
    const ownerId = req.user.userId;
    try {
        const result = await db.query('SELECT uuid, name, created_at FROM devices WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// --- NOVA FUNÇÃO ADICIONADA NESTA ETAPA ---
const getDeviceById = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.params;

    try {
        const result = await db.query(
            'SELECT uuid, name, created_at FROM devices WHERE uuid = $1 AND owner_id = $2',
            [uuid, ownerId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Dispositivo não encontrado ou você não tem permissão.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar dispositivo:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const claimDevice = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.body;

    if (!uuid) {
        return res.status(400).json({ error: 'O UUID do dispositivo é obrigatório.' });
    }

    try {
        const result = await db.query(
            'UPDATE devices SET owner_id = $1 WHERE uuid = $2 AND owner_id IS NULL RETURNING uuid, name',
            [ownerId, uuid]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Dispositivo não encontrado ou já reivindicado.' });
        }

        res.status(200).json({
            message: 'Dispositivo reivindicado com sucesso!',
            device: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao reivindicar dispositivo:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const sendDeviceCommand = async (req, res) => {
    const ownerId = req.user.userId;
    const { uuid } = req.params;
    const { rele, estado } = req.body;

    if (!rele || !estado) {
        return res.status(400).json({ error: 'O relé e o estado são obrigatórios no corpo da requisição.' });
    }

    try {
        // 1. VERIFICAR A POSSE
        const deviceResult = await db.query('SELECT uuid FROM devices WHERE uuid = $1 AND owner_id = $2', [uuid, ownerId]);
        
        if (deviceResult.rowCount === 0) {
            return res.status(403).json({ error: 'Acesso negado. Você não é o dono deste dispositivo.' });
        }

        // 2. ENVIAR O COMANDO MQTT
        const topic = `pluga-shop/devices/${uuid}/comando`;
        const payload = JSON.stringify({ rele, estado });
        
        mqttClient.publish(topic, payload, (err) => {
            if (err) {
                console.error('Erro ao publicar comando MQTT:', err);
                return res.status(500).json({ error: 'Erro ao enviar comando para o dispositivo.' });
            }
            res.status(200).json({ message: `Comando '${estado}' para o relé ${rele} enviado com sucesso.` });
        });

    } catch (error) {
        console.error('Erro ao enviar comando:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


module.exports = {
    listDevices,
    getDeviceById,
    claimDevice,
    sendDeviceCommand
};