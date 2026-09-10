const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getPurchases,
    getStoredPurchases
} = require("../controllers/purchaseController");

router.use(auth);

router.post("/", getPurchases);
router.get("/:businessId", getStoredPurchases);

module.exports = router;
