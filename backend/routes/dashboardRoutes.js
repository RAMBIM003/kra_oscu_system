const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getDashboard,
    getChart,
    getMonthlyData
} = require("../controllers/dashboardController");

router.use(auth);

router.get("/:businessId", getDashboard);
router.get("/:businessId/chart", getChart);
router.get("/:businessId/monthly", getMonthlyData);

module.exports = router;
