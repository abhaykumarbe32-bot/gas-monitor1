const Alert = require("../models/Alert");
const Device = require("../models/Device");

// Get device-specific alert history (returns all history alerts for selected device)
exports.getAlerts = async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Verify device ownership
        const device = await Device.findOne({
            $or: [{ deviceId: deviceId }, { _id: deviceId }],
            userId: req.user.id
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found or unauthorized"
            });
        }

        // Return ALL alerts for the specific device (Alert History remains intact)
        const alerts = await Alert.find({ deviceId: device.deviceId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            alerts
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Get active (uncleared) notifications for logged-in user across all owned devices
exports.getUserAlerts = async (req, res) => {
    try {
        const userId = req.user.id;

        const userDevices = await Device.find({ userId }).select("deviceId deviceName location");
        
        const deviceMap = {};
        const deviceIds = userDevices.map((d) => {
            deviceMap[d.deviceId] = d;
            return d.deviceId;
        });

        // Query only notifications that have NOT been cleared by user
        const alerts = await Alert.find({
            deviceId: { $in: deviceIds },
            notificationCleared: { $ne: true }
        }).sort({ createdAt: -1 });

        const formattedAlerts = alerts.map((alert) => {
            const dev = deviceMap[alert.deviceId];
            return {
                _id: alert._id,
                deviceId: alert.deviceId,
                deviceName: dev ? dev.deviceName : alert.deviceId,
                location: dev ? dev.location : "",
                gas: alert.gas,
                level: alert.level,
                createdAt: alert.createdAt
            };
        });

        res.json({
            success: true,
            count: formattedAlerts.length,
            alerts: formattedAlerts
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Clear a single notification (marks notificationCleared: true, DOES NOT DELETE ALERT HISTORY DOCUMENT)
exports.clearSingleNotification = async (req, res) => {
    try {
        const { alertId } = req.params;

        const alert = await Alert.findById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Notification alert not found"
            });
        }

        // Verify device ownership
        const device = await Device.findOne({ deviceId: alert.deviceId, userId: req.user.id });
        if (!device) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to clear this notification"
            });
        }

        // Mark notification as cleared without deleting the alert history document
        alert.notificationCleared = true;
        await alert.save();

        res.json({
            success: true,
            message: "Notification cleared successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Clear all notifications for user (marks notificationCleared: true, DOES NOT DELETE ALERT HISTORY DOCUMENTS)
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const userDevices = await Device.find({ userId }).select("deviceId");
        const deviceIds = userDevices.map((d) => d.deviceId);

        const result = await Alert.updateMany(
            { deviceId: { $in: deviceIds }, notificationCleared: { $ne: true } },
            { $set: { notificationCleared: true } }
        );

        res.json({
            success: true,
            message: "All notifications cleared successfully",
            modifiedCount: result.modifiedCount
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Delete all alert history for a specific device (explicit Alert History clear action)
exports.deleteAlerts = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const device = await Device.findOne({
            $or: [{ deviceId: deviceId }, { _id: deviceId }],
            userId: req.user.id
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found or unauthorized"
            });
        }

        const result = await Alert.deleteMany({ deviceId: device.deviceId });

        res.json({
            success: true,
            message: "Alert history deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};