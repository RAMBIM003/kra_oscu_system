const pool = require("../config/database");

async function getProfiles(req, res) {
    const result = await pool.query(
        `SELECT
            p.id,
            p.profile_name,
            p.profile_type,
            p.created_at,
            COUNT(b.id)::int AS business_count
         FROM profiles p
         LEFT JOIN businesses b ON b.profile_id = p.id
         WHERE p.user_id = $1
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [req.user.id]
    );

    res.json({
        success: true,
        profiles: result.rows
    });
}

async function createProfile(req, res) {
    const { profileName, profileType } = req.body;

    if (!profileName || !profileType) {
        return res.status(400).json({
            success: false,
            message: "Profile name and profile type are required"
        });
    }

    if (!["business", "personal"].includes(profileType)) {
        return res.status(400).json({
            success: false,
            message: "Profile type must be business or personal"
        });
    }

    const result = await pool.query(
        `INSERT INTO profiles
            (user_id, profile_name, profile_type)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
            req.user.id,
            profileName.trim(),
            profileType
        ]
    );

    res.status(201).json({
        success: true,
        profile: result.rows[0]
    });
}

async function getProfile(req, res) {
    const result = await pool.query(
        `SELECT *
         FROM profiles
         WHERE id = $1
         AND user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({
            success: false,
            message: "Profile not found"
        });
    }

    res.json({
        success: true,
        profile: result.rows[0]
    });
}

async function deleteProfile(req, res) {
    const result = await pool.query(
        `DELETE FROM profiles
         WHERE id = $1
         AND user_id = $2
         RETURNING id`,
        [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({
            success: false,
            message: "Profile not found"
        });
    }

    res.json({
        success: true,
        message: "Profile deleted"
    });
}

module.exports = {
    getProfiles,
    createProfile,
    getProfile,
    deleteProfile
};
