// src/auth/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('Cabeçalho de Autorização recebido:', authHeader); // LOG 1

    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.log('Token não encontrado no cabeçalho.');
        return res.sendStatus(401); // Unauthorized
    }

    console.log('Token extraído para verificação:', token); // LOG 2

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('ERRO na verificação do JWT:', err.message); // LOG 3 (ERRO)
            return res.sendStatus(403); // Forbidden
        }
        
        console.log('Token verificado com sucesso. Payload do usuário:', user); // LOG 4 (SUCESSO)
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;