const pool = require("../config/database");
const kraService = require("../services/kraService");

async function syncBranches(req, res) {
    return kraService.branches(req, res);
}

async function getBranches(req, res) {
    const result = await pool.query(
        `SELECT
            br.id,
            br.business_id,
            br.branch_id,
            br.branch_name,
            br.address,
            br.phone,
            br.email,
            br.is_main,
            br.created_at
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         JOIN profiles p ON p.id = b.profile_id
         WHERE br.business_id = $1
         AND p.user_id = $2
         ORDER BY br.is_main DESC, br.created_at`,
        [req.params.businessId, req.user.id]
    );

    res.json({
        success: true,
        branches: result.rows
    });
}

async function createBranch(req, res) {
    const {
        branchId,
        branchName,
        address,
        phone,
        email
    } = req.body;

    const ownership = await pool.query(
        `SELECT b.id
         FROM businesses b
         JOIN profiles p ON p.id = b.profile_id
         WHERE b.id = $1
         AND p.user_id = $2`,
        [req.params.businessId, req.user.id]
    );

    if (!ownership.rows.length) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    if (!branchId || !branchName) {
        return res.status(400).json({
            success: false,
            message: "Branch ID and branch name are required"
        });
    }

    const result = await pool.query(
        `INSERT INTO branches
            (business_id, branch_id, branch_name, address, phone, email)
         VALUES
            ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
            req.params.businessId,
            branchId,
            branchName,
            address || null,
            phone || null,
            email || null
        ]
    );

    res.status(201).json({
        success: true,
        branch: result.rows[0]
    });
}

module.exports = {
    getBranches,
    createBranch,
    syncBranches
};
