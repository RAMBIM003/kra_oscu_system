const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getDashboard,
    getMonthlyData
} = require("../controllers/dashboardController");

router.use(auth);

router.get("/:businessId", getDashboard);
router.get("/:businessId/monthly", getMonthlyData);

module.exports = router;
