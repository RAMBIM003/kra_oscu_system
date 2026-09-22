const pool = require("../config/database");

// Normalizes a variety of date shapes down to "YYYY-MM-DD" so a KRA
// purchase's invoice_date (free-text, format depends on KRA's raw
// response) can be compared against a payment's payment_time
// (a real timestamp). Returns null if nothing recognizable is found.
function normalizeDate(raw) {
    if (!raw) {
        return null;
    }

    if (raw instanceof Date) {
        return raw.toISOString().slice(0, 10);
    }

    const str = String(raw).trim();

    // YYYYMMDD or YYYYMMDDHHmmss
    let match = str.match(/^(\d{4})(\d{2})(\d{2})/);

    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // YYYY-MM-DD (optionally with a time part after it)
    match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // DD/MM/YYYY
    match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (match) {
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        return `${match[3]}-${month}-${day}`;
    }

    const parsed = new Date(str);

    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return null;
}

// Every purchase should have a matching transactions row, created as
// unmatched the moment the purchase is pulled from KRA. This keeps
// Transactions as a full mirror of Purchases, not just the matched
// subset.
async function ensureTransactionRows(businessId) {
    await pool.query(
        `INSERT INTO transactions
            (
                business_id,
                purchase_id,
                kra_seller_name,
                invoice_no,
                invoice_date,
                taxable_amt,
                vat_amt,
                status
            )
         SELECT
            p.business_id,
            p.id,
            p.supplier_name,
            p.invoice_number,
            p.transaction_date,
            p.taxable_amount,
            p.tax_amount,
            'unmatched'
         FROM purchases p
         WHERE p.business_id = $1
         AND NOT EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.purchase_id = p.id
         )`,
        [businessId]
    );
}

// The match engine. Deliberately amount + date only - KRA's
// seller_name and M-Pesa's registered recipient name frequently
// describe the same supplier with different strings, so name is
// never used to decide a match. Both names are kept and shown
// side by side instead, for a human to visually confirm.
async function runMatching(businessId) {
    await ensureTransactionRows(businessId);

    const [
        openTransactionsResult,
        openPaymentsResult
    ] = await Promise.all([
        pool.query(
            `SELECT * FROM transactions
             WHERE business_id = $1
             AND status = 'unmatched'`,
            [businessId]
        ),

        pool.query(
            `SELECT * FROM payments
             WHERE business_id = $1
             AND status = 'unmatched'`,
            [businessId]
        )
    ]);

    const openTransactions = openTransactionsResult.rows;
    const openPayments = openPaymentsResult.rows;

    const usedPaymentIds = new Set();
    let matchedCount = 0;

    for (const txn of openTransactions) {
        const txnAmount =
            Number(txn.taxable_amt || 0) +
            Number(txn.vat_amt || 0);

        const txnDate = normalizeDate(txn.invoice_date);

        if (!txnDate) {
            continue;
        }

        let candidate = null;

        for (const payment of openPayments) {

            if (usedPaymentIds.has(payment.id)) {
                continue;
            }

            const paymentDate = normalizeDate(payment.payment_time);

            if (paymentDate !== txnDate) {
                continue;
            }

            const diff = Math.abs(
                Number(payment.amount) - txnAmount
            );

            if (diff === 0) {
                candidate = payment;
                break;
            }

            if (diff <= 1 && !candidate) {
                candidate = payment;
            }
        }

        if (candidate) {
            usedPaymentIds.add(candidate.id);

            await pool.query(
                `UPDATE transactions
                 SET
                    payment_id = $1,
                    mpesa_recipient_name = $2,
                    amount = $3,
                    mpesa_receipt_no = $4,
                    payment_time = $5,
                    status = 'matched',
                    matched_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = $6`,
                [
                    candidate.id,
                    candidate.mpesa_recipient_name,
                    candidate.amount,
                    candidate.mpesa_receipt_no,
                    candidate.payment_time,
                    txn.id
                ]
            );

            await pool.query(
                `UPDATE payments
                 SET status = 'matched'
                 WHERE id = $1`,
                [candidate.id]
            );

            matchedCount++;
        }
    }

    return {
        matched: matchedCount,
        stillUnmatched: openTransactions.length - matchedCount
    };
}

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

async function getTransactions(req, res) {
    const businessId = req.params.businessId;

    if (!(await verifyOwnership(businessId, req.user.id))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    const result = await pool.query(
        `SELECT *
         FROM transactions
         WHERE business_id = $1
         ORDER BY created_at DESC`,
        [businessId]
    );

    res.json({
        success: true,
        transactions: result.rows
    });
}

async function rematch(req, res) {
    const businessId = req.params.businessId;

    if (!(await verifyOwnership(businessId, req.user.id))) {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }

    const result = await runMatching(businessId);

    res.json({
        success: true,
        ...result
    });
}

module.exports = {
    runMatching,
    getTransactions,
    rematch
};
