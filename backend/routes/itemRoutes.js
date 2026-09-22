const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getItems,
    createItem,
    syncItems
} = require("../controllers/itemController");

router.use(auth);

router.post("/sync", syncItems);
router.get("/business/:businessId", getItems);
router.post("/business/:businessId", createItem);

module.exports = router;
