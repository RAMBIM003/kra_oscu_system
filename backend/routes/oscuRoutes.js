const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    initialize,
    status
} = require("../controllers/oscuController");

router.use(auth);

router.post("/initialize", initialize);
router.get("/status/:businessId", status);

module.exports = router;
