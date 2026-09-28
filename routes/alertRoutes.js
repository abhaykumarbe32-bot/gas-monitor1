const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
    getAlerts,
    deleteAlerts
} = require("../controllers/alertController");

router.get("/:deviceId", auth, getAlerts);

router.delete("/:deviceId", auth, deleteAlerts);

module.exports = router;