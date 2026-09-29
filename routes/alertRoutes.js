const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getAlerts,
    getUserAlerts,
    deleteAlerts,
    deleteSingleAlert
} = require("../controllers/alertController");

router.get("/user", auth, getUserAlerts);
router.delete("/single/:alertId", auth, deleteSingleAlert);
router.get("/:deviceId", auth, getAlerts);
router.delete("/:deviceId", auth, deleteAlerts);

module.exports = router;