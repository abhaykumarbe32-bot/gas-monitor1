const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getAlerts,
    getUserAlerts,
    deleteAlerts,
    clearSingleNotification,
    clearAllNotifications,
} = require("../controllers/alertController");

// User notifications routes (temporary / active notifications view)
router.get("/user", auth, getUserAlerts);
router.put("/clear-all", auth, clearAllNotifications);
router.put("/clear-single/:alertId", auth, clearSingleNotification);
router.delete("/single/:alertId", auth, clearSingleNotification);

// Device-specific Alert History routes (permanent history per device)
router.get("/:deviceId", auth, getAlerts);
router.delete("/:deviceId", auth, deleteAlerts);

module.exports = router;