const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getTransactions,
    rematch
} = require("../controllers/transactionController");

router.use(auth);

router.get("/:businessId", getTransactions);
router.post("/:businessId/rematch", rematch);

module.exports = router;
