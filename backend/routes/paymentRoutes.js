const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    receiveWebhook,
    getPayments
} = require("../controllers/paymentController");

// Public - called by the SMS-forwarding app, protected by a shared
// secret header instead of a user session.
router.post("/webhook", receiveWebhook);

// Authenticated - the app's own Payments page.
router.get("/", auth, getPayments);

module.exports = router;
