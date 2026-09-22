const pool = require("../config/database");
const kraService = require("../services/kraService");

async function syncItems(req, res) {
    return kraService.items(req, res);
}

async function getItems(req, res) {
    const result = await pool.query(
        `SELECT *
         FROM items
         WHERE business_id = $1
         ORDER BY item_name`,
        [req.params.businessId]
    );

    res.json({
        success: true,
        items: result.rows
    });
}

async function createItem(req, res) {
    const {
        itemCode,
        itemName,
        description,
        unitPrice,
        taxRate,
        unit
    } = req.body;

    if (!itemCode || !itemName) {
        return res.status(400).json({
            success: false,
            message: "Item code and item name are required"
        });
    }

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

    const result = await pool.query(
        `INSERT INTO items
            (
                business_id,
                item_code,
                item_name,
                description,
                unit_price,
                tax_rate,
                unit
            )
         VALUES
            ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
            req.params.businessId,
            itemCode,
            itemName,
            description || null,
            Number(unitPrice || 0),
            Number(taxRate || 0),
            unit || null
        ]
    );

    res.status(201).json({
        success: true,
        item: result.rows[0]
    });
}

module.exports = {
    getItems,
    createItem,
    syncItems
};
