// Caminho completo: aiot-saas-backend/src/api/routes.js

const express = require('express');
const router = express.Router();

const authController = require('../auth/authController');
const deviceController = require('./deviceController');
const authenticateToken = require('../auth/authMiddleware');

// --- Rotas de Autenticação (Públicas) ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// --- Rotas de Dispositivos (Protegidas por Autenticação) ---
router.get('/devices', authenticateToken, deviceController.listDevices);
router.get('/devices/:uuid', authenticateToken, deviceController.getDeviceById); // <-- ROTA ADICIONADA
router.post('/devices/claim', authenticateToken, deviceController.claimDevice);
router.post('/devices/:uuid/comando', authenticateToken, deviceController.sendDeviceCommand);

module.exports = router;