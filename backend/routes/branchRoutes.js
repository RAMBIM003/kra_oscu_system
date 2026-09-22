const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getBranches,
    createBranch,
    syncBranches
} = require("../controllers/branchController");

router.use(auth);

router.post("/sync", syncBranches);
router.get("/business/:businessId", getBranches);
router.post("/business/:businessId", createBranch);

module.exports = router;
