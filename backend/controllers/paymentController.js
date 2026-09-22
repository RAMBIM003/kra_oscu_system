const pool = require("../config/database");

// Parses a standard Safaricom M-Pesa outgoing-payment confirmation SMS.
// Handles the common "sent to" (send money) and "paid to" (Till/PayBill)
// phrasing. Any field that can't be found comes back as null - the raw
// SMS is always stored regardless, so nothing is silently lost.
function parseMpesaSms(text) {
    const receiptMatch =
        text.match(/^([A-Z0-9]{8,12})\s+Confirmed/i);

    const amountMatch =
        text.match(/Ksh\s?([\d,]+(?:\.\d{1,2})?)/i);

    const recipientMatch =
        text.match(
            /(?:sent to|paid to)\s+([A-Za-z0-9 .&'-]+?)(?:\s+for account|\.\s|,\s|\s+on\s)/i
        );

    const dateTimeMatch =
        text.match(
            /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s?[AP]M)/i
        );

    let paymentTime = null;

    if (dateTimeMatch) {
        paymentTime = normalizeMpesaDateTime(
            dateTimeMatch[1],
            dateTimeMatch[2]
        );
    }

    return {
        receiptNo:
            receiptMatch ? receiptMatch[1].toUpperCase() : null,

        amount:
            amountMatch ?
                Number(amountMatch[1].replace(/,/g, "")) :
                null,

        recipientName:
            recipientMatch ? recipientMatch[1].trim() : null,

        paymentTime
    };
}

// M-Pesa SMS dates are typically D/M/YY (e.g. "11/9/26").
function normalizeMpesaDateTime(dateStr, timeStr) {
    const parts = dateStr.split("/").map(Number);
    const day = parts[0];
    const month = parts[1];
    const year =
        parts[2] < 100 ? 2000 + parts[2] : parts[2];

    const timeMatch =
        timeStr.match(/(\d{1,2}):(\d{2})\s?([AP]M)/i);

    let hours = 0;
    let minutes = 0;

    if (timeMatch) {
        hours = Number(timeMatch[1]);
        minutes = Number(timeMatch[2]);

        const period = timeMatch[3].toUpperCase();

        if (period === "PM" && hours !== 12) {
            hours += 12;
        }

        if (period === "AM" && hours === 12) {
            hours = 0;
        }
    }

    const parsedDate =
        new Date(year, month - 1, day, hours, minutes);

    if (isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toISOString();
}

// Public endpoint - an SMS-forwarding app calls this directly, so it
// can't carry a user JWT. Protected instead by a shared secret header.
async function receiveWebhook(req, res) {
    const { businessId, message } = req.body;
    const providedSecret = req.headers["x-webhook-secret"];

    if (
        !process.env.SMS_WEBHOOK_SECRET ||
        providedSecret !== process.env.SMS_WEBHOOK_SECRET
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid or missing webhook secret"
        });
    }

    if (!businessId || !message) {
        return res.status(400).json({
            success: false,
            message: "businessId and message are required"
        });
    }

    const parsed = parseMpesaSms(message);

    if (!parsed.receiptNo || !parsed.amount) {
        return res.status(422).json({
            success: false,
            message: "Could not parse required fields from SMS",
            parsed
        });
    }

    const result = await pool.query(
        `INSERT INTO payments
            (
                business_id,
                mpesa_receipt_no,
                amount,
                mpesa_recipient_name,
                payment_time,
                raw_sms,
                status
            )
         VALUES
            ($1,$2,$3,$4,$5,$6,'unmatched')
         ON CONFLICT (business_id, mpesa_receipt_no)
         DO NOTHING
         RETURNING *`,
        [
            businessId,
            parsed.receiptNo,
            parsed.amount,
            parsed.recipientName,
            parsed.paymentTime,
            message
        ]
    );

    const payment = result.rows[0] || null;

    if (payment) {
        // A fresh payment might match a purchase pulled earlier -
        // attempt matching immediately rather than waiting for the
        // next Purchases sync.
        const transactionController =
            require("./transactionController");

        await transactionController.runMatching(businessId);
    }

    res.json({
        success: true,
        payment,
        duplicate: !payment
    });
}

async function getPayments(req, res) {
    const businessId = req.query.businessId;

    if (!businessId) {
        return res.status(400).json({
            success: false,
            message: "businessId is required"
        });
    }

    const result = await pool.query(
        `SELECT p.*
         FROM payments p
         JOIN businesses b ON b.id = p.business_id
         JOIN profiles pr ON pr.id = b.profile_id
         WHERE p.business_id = $1
         AND pr.user_id = $2
         ORDER BY p.payment_time DESC NULLS LAST,
                  p.created_at DESC`,
        [businessId, req.user.id]
    );

    res.json({
        success: true,
        payments: result.rows
    });
}

module.exports = {
    receiveWebhook,
    getPayments,
    parseMpesaSms
};
