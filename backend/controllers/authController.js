const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        process.env.JWT_SECRET || "kra-development-secret",
        {
            expiresIn: "7d"
        }
    );
}

async function register(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (existing.rows.length) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
            [email.toLowerCase().trim(), passwordHash]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            message: "Account created",
            user,
            token: createToken(user)
        });
    } catch (error) {
        throw error;
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            `SELECT id, email, password_hash, created_at
             FROM users
             WHERE LOWER(email) = LOWER($1)`,
            [email.trim()]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const valid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        delete user.password_hash;

        res.json({
            success: true,
            message: "Login successful",
            user,
            token: createToken(user)
        });
    } catch (error) {
        throw error;
    }
}

async function me(req, res) {
    const result = await pool.query(
        `SELECT id, email, created_at
         FROM users
         WHERE id = $1`,
        [req.user.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    res.json({
        success: true,
        user: result.rows[0]
    });
}

module.exports = {
    register,
    login,
    me
};
