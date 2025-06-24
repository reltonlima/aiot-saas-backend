// Caminho: aiot-saas-backend/src/auth/authController.js

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');

// As funções register, login, e verifyEmail permanecem exatamente as mesmas.
const register = async (req, res) => { /* ... código sem alterações ... */ };
const login = async (req, res) => { /* ... código sem alterações ... */ };
const verifyEmail = async (req, res) => { /* ... código sem alterações ... */ };

// --- FUNÇÃO REFINADA COM CONTROLE DE TEMPO ---
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'O campo de e-mail é obrigatório.' });
    }

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1 AND is_email_verified = TRUE', [email]);
        const user = userResult.rows[0];

        // Se não encontrarmos o usuário, ainda retornamos uma mensagem de sucesso
        // para não revelar quais e-mails estão ou não em nosso sistema.
        if (user) {

            // ==========================================================
            // === INÍCIO DO NOSSO NOVO CÓDIGO POÉTICO (A "GUARDA") ===
            // ==========================================================
            const COOLDOWN_MINUTES = 5; // Tempo de espera de 5 minutos
            const cooldownMillis = COOLDOWN_MINUTES * 60 * 1000;

            if (user.last_password_reset_request_at) {
                const timeSinceLastRequest = Date.now() - new Date(user.last_password_reset_request_at).getTime();

                if (timeSinceLastRequest < cooldownMillis) {
                    const timeLeft = Math.ceil((cooldownMillis - timeSinceLastRequest) / 1000 / 60);
                    const errorMessage = `Você já solicitou uma redefinição de senha recentemente. Por favor, aguarde aproximadamente ${timeLeft} minuto(s).`;
                    // Usamos o status 429 "Too Many Requests", que é o padrão para rate limiting.
                    return res.status(429).json({ error: errorMessage });
                }
            }
            // ==========================================================
            // === FIM DO CÓDIGO DA "GUARDA" ===
            // ==========================================================


            // Se a "guarda" permitir, o fluxo continua...
            const resetToken = jwt.sign({ userId: user.id, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            // Atualizamos o banco de dados com o novo token E a data da solicitação
            await db.query(
                'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2, last_password_reset_request_at = NOW() WHERE id = $3',
                [resetToken, expiresAt, user.id]
            );

            const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${resetToken}`;

            await sendEmail({
                to: user.email,
                subject: 'Redefinição de Senha',
                html: `<h1>Solicitação de Redefinição de Senha</h1><p>Você solicitou a redefinição da sua senha. Clique no link abaixo para criar uma nova. Este link é válido por 15 minutos.</p><a href="${resetUrl}" target="_blank">Redefinir Minha Senha</a><p>Se você não solicitou isso, por favor ignore este e-mail.</p>`
            });
        }

        res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição foi enviado.' });

    } catch (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const resetPassword = async (req, res) => { /* ... código sem alterações ... */ };

module.exports = {
    register,
    login,
    verifyEmail,
    requestPasswordReset,
    resetPassword
};