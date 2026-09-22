const pool = require("../config/database");

async function verifyOwnership(businessId, userId) {
    const result = await pool.query(
        `SELECT b.id
         FROM businesses b
         JOIN profiles p ON p.id = b.profile_id
         WHERE b.id = $1
         AND p.user_id = $2`,
        [businessId, userId]
    );

    return result.rows.length > 0;
}

function trendPercent(current, previous) {

    const curr = Number(current || 0);
    const prev = Number(previous || 0);

    if (prev === 0) {
        return curr > 0 ? 100 : 0;
    }

    return Number((((curr - prev) / prev) * 100).toFixed(1));

}

async function getDashboard(req, res) {
    const businessId = req.params.businessId;

    if (!(await verifyOwnership(businessId, req.user.id))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    const [
        purchaseSummary,
        paymentSummary,
        purchaseCount,
        paymentCount,
        itemCount,
        branchCount,
        transactionSummary,
        recentPurchases,
        business,
        purchaseSyncState,
        chartData,
        activityFeed,
        purchaseThisMonth,
        purchaseLastMonth,
        paymentThisMonth,
        paymentLastMonth,
        topSuppliers,
        paymentChart
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
                COALESCE(SUM(amount),0) AS total_amount
             FROM payments
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (
                    WHERE created_at >= CURRENT_DATE
                )::int AS today
             FROM purchases
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM payments
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM items
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT COUNT(*)::int AS count
             FROM branches
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'matched')::int AS matched,
                COUNT(*) FILTER (WHERE status = 'unmatched')::int AS unmatched
             FROM transactions
             WHERE business_id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT
                invoice_number,
                supplier_name,
                total_amount,
                transaction_date,
                created_at
             FROM purchases
             WHERE business_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [businessId]
        ),

        pool.query(
            `SELECT business_name, status, environment, branch_id
             FROM businesses
             WHERE id = $1`,
            [businessId]
        ),

        pool.query(
            `SELECT updated_at
             FROM sync_state
             WHERE business_id = $1
             AND sync_type = 'purchases'`,
            [businessId]
        ),

        pool.query(
            `SELECT
                TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*)::int AS count
             FROM purchases
             WHERE business_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '13 days'
             GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
             ORDER BY day`,
            [businessId]
        ),

        pool.query(
            `(
                SELECT
                    'purchase' AS type,
                    supplier_name AS title,
                    total_amount AS amount,
                    invoice_number AS reference,
                    created_at AS event_time
                FROM purchases
                WHERE business_id = $1
                ORDER BY created_at DESC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT
                    'payment' AS type,
                    mpesa_recipient_name AS title,
                    amount,
                    mpesa_receipt_no AS reference,
                    created_at AS event_time
                FROM payments
                WHERE business_id = $1
                ORDER BY created_at DESC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT
                    'matched' AS type,
                    kra_seller_name AS title,
                    amount,
                    invoice_no AS reference,
                    matched_at AS event_time
                FROM transactions
                WHERE business_id = $1
                AND status = 'matched'
                AND matched_at IS NOT NULL
                ORDER BY matched_at DESC
                LIMIT 5
            )
            ORDER BY event_time DESC
            LIMIT 8`,
            [businessId]
        ),

        // Calendar-month comparisons, powering the "vs last month"
        // trend arrows on the KPI cards.
        pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total
             FROM purchases
             WHERE business_id = $1
             AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
            [businessId]
        ),

        pool.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total
             FROM purchases
             WHERE business_id = $1
             AND date_trunc('month', created_at) =
                date_trunc('month', CURRENT_DATE - INTERVAL '1 month')`,
            [businessId]
        ),

        pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total
             FROM payments
             WHERE business_id = $1
             AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
            [businessId]
        ),

        pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total
             FROM payments
             WHERE business_id = $1
             AND date_trunc('month', created_at) =
                date_trunc('month', CURRENT_DATE - INTERVAL '1 month')`,
            [businessId]
        ),

        pool.query(
            `SELECT
                supplier_name,
                COALESCE(SUM(total_amount), 0) AS total
             FROM purchases
             WHERE business_id = $1
             AND supplier_name IS NOT NULL
             GROUP BY supplier_name
             ORDER BY total DESC
             LIMIT 5`,
            [businessId]
        ),

        pool.query(
            `SELECT
                TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
                COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE business_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
             ORDER BY day`,
            [businessId]
        )
    ]);

    const biz = business.rows[0] || {};

    const purchaseTrend = trendPercent(
        purchaseThisMonth.rows[0].total,
        purchaseLastMonth.rows[0].total
    );

    const paymentTrend = trendPercent(
        paymentThisMonth.rows[0].total,
        paymentLastMonth.rows[0].total
    );

    res.json({
        success: true,
        summary: {
            purchase_count: purchaseCount.rows[0].count,
            purchase_today: purchaseCount.rows[0].today,
            purchase_total: purchaseSummary.rows[0].total_amount,
            purchase_trend_pct: purchaseTrend,
            purchase_this_month: purchaseThisMonth.rows[0].total,
            purchase_last_month: purchaseLastMonth.rows[0].total,
            payment_count: paymentCount.rows[0].count,
            payment_total: paymentSummary.rows[0].total_amount,
            payment_trend_pct: paymentTrend,
            item_count: itemCount.rows[0].count,
            branch_count: branchCount.rows[0].count,
            transaction_total: transactionSummary.rows[0].total,
            transaction_matched: transactionSummary.rows[0].matched,
            transaction_unmatched: transactionSummary.rows[0].unmatched
        },
        connection: {
            business_name: biz.business_name || "-",
            branch_id: biz.branch_id || "-",
            environment: biz.environment || "test",
            kra_status: biz.status || "pending",
            kra_last_sync:
                purchaseSyncState.rows[0]?.updated_at || null,
            mpesa_status:
                paymentCount.rows[0].count > 0 ?
                    "active" :
                    "awaiting_data",
            database_status: "healthy"
        },
        chart: chartData.rows,
        paymentChart: paymentChart.rows,
        topSuppliers: topSuppliers.rows,
        activity: activityFeed.rows,
        recentPurchases: recentPurchases.rows
    });
}

// Powers the 7D / 30D / 12M chart toggle. Returns a current-period
// series and an immediately-preceding period series of equal
// length, so the chart can draw a two-tone "this vs last" bar pair
// exactly like the reference design - for 12m, grouped by month
// instead of by day (a same-length daily comparison over a year
// would be unreadable), so only a single series is returned there.
async function getChart(req, res) {

    const businessId = req.params.businessId;

    if (!(await verifyOwnership(businessId, req.user.id))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    const period = req.query.period || "30d";

    if (period === "12m") {

        const result = await pool.query(
            `SELECT
                TO_CHAR(months.bucket, 'YYYY-MM') AS bucket,
                COALESCE(SUM(p.total_amount), 0) AS total,
                COUNT(p.id)::int AS count
             FROM generate_series(
                date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
                date_trunc('month', CURRENT_DATE),
                INTERVAL '1 month'
             ) AS months(bucket)
             LEFT JOIN purchases p
                ON p.business_id = $1
                AND date_trunc('month', p.created_at) = months.bucket
             GROUP BY months.bucket
             ORDER BY months.bucket`,
            [businessId]
        );

        return res.json({
            success: true,
            period,
            current: result.rows,
            previous: []
        });

    }

    const days = period === "7d" ? 7 : 30;

    const [currentResult, previousResult] = await Promise.all([
        pool.query(
            `SELECT
                TO_CHAR(d.bucket, 'YYYY-MM-DD') AS bucket,
                COALESCE(SUM(p.total_amount), 0) AS total,
                COUNT(p.id)::int AS count
             FROM generate_series(
                CURRENT_DATE - INTERVAL '${days - 1} days',
                CURRENT_DATE,
                INTERVAL '1 day'
             ) AS d(bucket)
             LEFT JOIN purchases p
                ON p.business_id = $1
                AND date_trunc('day', p.created_at) = d.bucket
             GROUP BY d.bucket
             ORDER BY d.bucket`,
            [businessId]
        ),

        pool.query(
            `SELECT
                TO_CHAR(d.bucket, 'YYYY-MM-DD') AS bucket,
                COALESCE(SUM(p.total_amount), 0) AS total,
                COUNT(p.id)::int AS count
             FROM generate_series(
                CURRENT_DATE - INTERVAL '${(days * 2) - 1} days',
                CURRENT_DATE - INTERVAL '${days} days',
                INTERVAL '1 day'
             ) AS d(bucket)
             LEFT JOIN purchases p
                ON p.business_id = $1
                AND date_trunc('day', p.created_at) = d.bucket
             GROUP BY d.bucket
             ORDER BY d.bucket`,
            [businessId]
        )
    ]);

    res.json({
        success: true,
        period,
        current: currentResult.rows,
        previous: previousResult.rows
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
    getChart,
    getMonthlyData
};
