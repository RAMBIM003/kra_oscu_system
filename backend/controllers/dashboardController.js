const pool = require("../config/database");

async function getDashboard(req, res) {
    const businessId = req.params.businessId;

    const ownership = await pool.query(
        `SELECT b.id
         FROM businesses b
         JOIN profiles p ON p.id = b.profile_id
         WHERE b.id = $1
         AND p.user_id = $2`,
        [businessId, req.user.id]
    );

    if (!ownership.rows.length) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    const [
        purchaseSummary,
        salesSummary,
        purchaseCount,
        salesCount,
        recentPurchases
    ] = await Promise.all([
        pool.query(
            `SELECT
                COALESCE(SUM(taxable_amount),0) AS taxable_amount,
                COALESCE(SUM(tax_amount),0) AS tax_amount,
                COALESCE(SUM(total_amount),0) AS total_amount
             FROM purchases
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT
                COALESCE(SUM(total_amount),0) AS total_amount,
                COALESCE(SUM(tax_amount),0) AS tax_amount
             FROM sales
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM purchases
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM sales
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT
                invoice_number,
                supplier_name,
                total_amount,
                transaction_date
             FROM purchases
             WHERE business_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [businessId]
        )
    ]);

    res.json({
        success: true,
        dashboard: {
            purchases: {
                ...purchaseSummary.rows[0],
                count: purchaseCount.rows[0].count
            },
            sales: {
                ...salesSummary.rows[0],
                count: salesCount.rows[0].count
            },
            recentPurchases: recentPurchases.rows
        }
    });
}

async function getMonthlyData(req, res) {
    const result = await pool.query(
        `SELECT
            month,
            purchase_total,
            sales_total
         FROM monthly_dashboard
         WHERE business_id = $1
         ORDER BY month`,
        [req.params.businessId]
    );

    res.json({
        success: true,
        data: result.rows
    });
}

module.exports = {
    getDashboard,
    getMonthlyData
};
