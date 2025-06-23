// Caminho: aiot-saas-backend/src/auth/authController.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService'); // Importamos nosso serviço de email

const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Gera um token JWT curto e específico para a verificação de email
        // Usamos o email no token para encontrá-lo depois, mas o ID do usuário seria mais seguro em produção.
        const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Insere o usuário com o token de verificação
        const newUser = await db.query(
            'INSERT INTO users (email, password_hash, email_verification_token) VALUES ($1, $2, $3) RETURNING id, email',
            [email, passwordHash, verificationToken]
        );

        // Constrói a URL de verificação
        // Em produção, usaríamos o domínio real. Para dev, localhost está bom.
        const verificationUrl = `http://localhost:3000/v1/auth/verify-email?token=${verificationToken}`;

        // Envia o e-mail de verificação
        await sendEmail({
            to: email,
            subject: 'Bem-vindo! Por favor, confirme seu e-mail',
            html: `
                <h1>Bem-vindo à Plataforma AIoT!</h1>
                <p>Obrigado por se registrar. Por favor, clique no link abaixo para ativar sua conta:</p>
                <a href="${verificationUrl}" target="_blank">Ativar Minha Conta</a>
                <p>Se você não se registrou, por favor ignore este e-mail.</p>
            `
        });

        res.status(201).json({
            message: 'Registro realizado com sucesso! Verifique sua caixa de entrada para ativar sua conta.'
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Este email já está em uso.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // --- NOVA VERIFICAÇÃO DE E-MAIL ---
        if (!user.is_email_verified) {
            return res.status(403).json({ error: 'Por favor, verifique seu e-mail antes de fazer o login. Um novo link foi enviado.' });
            // Opcional: Reenviar o e-mail de verificação aqui se desejar.
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const payload = { userId: user.id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: 'Login bem-sucedido!', token: token });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// --- NOVA FUNÇÃO PARA VERIFICAR O E-MAIL ---
const verifyEmail = async (req, res) => {
    const { token } = req.query; // Pega o token da URL (ex: ?token=ABC123)
    if (!token) {
        return res.status(400).send('<h1>Erro: Token de verificação não fornecido.</h1>');
    }

    try {
        // Verifica se o token é válido e não expirou
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userEmail = decoded.email;

        // Procura pelo usuário com este token
        const userResult = await db.query('SELECT * FROM users WHERE email = $1 AND email_verification_token = $2', [userEmail, token]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).send('<h1>Erro: Token inválido ou já utilizado.</h1>');
        }

        // Atualiza o status do usuário no banco
        await db.query(
            'UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL WHERE email = $1',
            [userEmail]
        );
        
        // Em vez de mostrar uma página de sucesso aqui, redirecionamos para uma no frontend
        res.redirect('/verification-success.html');

    } catch (error) {
        console.error('Erro de verificação de token:', error);
        res.status(400).send('<h1>Erro: Token inválido ou expirado.</h1>');
    }
};

module.exports = {
    register,
    login,
    verifyEmail // Exporta a nova função
};