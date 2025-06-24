// Caminho: aiot-saas-backend/src/auth/authController.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');

// --- Função de Registro ---
const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        await db.query(
            'INSERT INTO users (email, password_hash, email_verification_token) VALUES ($1, $2, $3)',
            [email, passwordHash, verificationToken]
        );

        const verificationUrl = `${process.env.BASE_URL}/v1/auth/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: email,
            subject: 'Bem-vindo! Por favor, confirme seu e-mail',
            html: `<h1>Bem-vindo à Plataforma AIoT!</h1><p>Obrigado por se registrar. Por favor, clique no link abaixo para ativar sua conta:</p><a href="${verificationUrl}" target="_blank">Ativar Minha Conta</a><p>Se você não se registrou, por favor ignore este e-mail.</p>`
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

// --- Função de Login ---
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

        if (!user.is_email_verified) {
            return res.status(403).json({ error: 'Por favor, verifique seu e-mail antes de fazer o login.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const payload = { userId: user.id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: 'Login bem-sucedido!', token: token });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// --- Função de Verificação de E-mail ---
const verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('<h1>Erro: Token de verificação não fornecido.</h1>');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userEmail = decoded.email;

        const userResult = await db.query('SELECT * FROM users WHERE email = $1 AND email_verification_token = $2', [userEmail, token]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).send('<h1>Erro: Token inválido ou já utilizado.</h1>');
        }

        await db.query(
            'UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL WHERE email = $1',
            [userEmail]
        );
        
        res.redirect('/verification-success.html');

    } catch (error) {
        console.error('Erro de verificação de token:', error);
        res.status(400).send('<h1>Erro: Token inválido ou expirado.</h1>');
    }
};

// --- Função de Solicitação de Redefinição de Senha (COM RATE LIMITING) ---
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'O campo de e-mail é obrigatório.' });
    }

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1 AND is_email_verified = TRUE', [email]);
        const user = userResult.rows[0];

        if (user) {
            // ==========================================================
            // === LÓGICA DE RATE LIMITING ADICIONADA AQUI ===
            // ==========================================================
            const COOLDOWN_MINUTES = 5;
            const cooldownMillis = COOLDOWN_MINUTES * 60 * 1000;

            if (user.last_password_reset_request_at) {
                const timeSinceLastRequest = Date.now() - new Date(user.last_password_reset_request_at).getTime();

                if (timeSinceLastRequest < cooldownMillis) {
                    const timeLeft = Math.ceil((cooldownMillis - timeSinceLastRequest) / 1000 / 60);
                    const errorMessage = `Você já solicitou uma redefinição de senha recentemente. Por favor, aguarde aproximadamente ${timeLeft} minuto(s).`;
                    return res.status(429).json({ error: errorMessage }); // 429: Too Many Requests
                }
            }
            // ==========================================================
            
            const resetToken = jwt.sign({ userId: user.id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            // Atualiza o banco com o novo token E a data da solicitação
            await db.query(
                'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2, last_password_reset_request_at = NOW() WHERE id = $3',
                [resetToken, expiresAt, user.id]
            );

            const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${resetToken}`;

            await sendEmail({
                to: user.email,
                subject: 'Redefinição de Senha',
                html: `<h1>Solicitação de Redefinição de Senha</h1><p>Clique no link abaixo para criar uma nova senha. Este link é válido por 15 minutos.</p><a href="${resetUrl}" target="_blank">Redefinir Minha Senha</a><p>Se você não solicitou isso, por favor ignore este e-mail.</p>`
            });
        }

        res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição foi enviado.' });

    } catch (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// --- Função de Redefinição de Senha ---
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'password-reset') {
            return res.status(400).json({ error: 'Token inválido para esta ação.' });
        }

        const userResult = await db.query(
            'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()',
            [token]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await db.query(
            'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    register,
    login,
    verifyEmail,
    requestPasswordReset,
    resetPassword
};