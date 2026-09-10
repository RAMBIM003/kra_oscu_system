const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getBusinesses,
    createBusiness,
    getBusiness,
    deleteBusiness
} = require("../controllers/businessController");

router.use(auth);

// Get businesses by profile
// Supports: /api/businesses?profileId=2
router.get("/", (req, res, next) => {
    if (req.query.profileId) {
        req.params.profileId = req.query.profileId;
        return getBusinesses(req, res, next);
    }

    return res.status(400).json({
        success: false,
        message: "profileId is required"
    });
});

// Also keep the existing URL format
router.get("/profile/:profileId", getBusinesses);

router.post("/", createBusiness);
router.get("/:id", getBusiness);
router.delete("/:id", deleteBusiness);

module.exports = router;
