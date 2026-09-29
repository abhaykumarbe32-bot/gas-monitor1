const Alert = require("../models/Alert");

exports.getAlerts = async (req, res) => {
    try {

        const { deviceId } = req.params;

        const alerts = await Alert.find({ deviceId })
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


// Get all alerts for logged-in user across all devices
exports.getUserAlerts = async (req, res) => {
    try {
        const Device = require("../models/Device");
        const userId = req.user.id;

        const userDevices = await Device.find({ userId }).select("deviceId deviceName location");
        
        const deviceMap = {};
        const deviceIds = userDevices.map((d) => {
            deviceMap[d.deviceId] = d;
            return d.deviceId;
        });

        const alerts = await Alert.find({ deviceId: { $in: deviceIds } })
            .sort({ createdAt: -1 });

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

// Delete a single notification alert by ID
exports.deleteSingleAlert = async (req, res) => {
    try {
        const Device = require("../models/Device");
        const { alertId } = req.params;

        const alert = await Alert.findById(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert notification not found"
            });
        }

        // Verify device ownership
        const device = await Device.findOne({ deviceId: alert.deviceId, userId: req.user.id });
        if (!device) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to delete this alert notification"
            });
        }

        await Alert.findByIdAndDelete(alertId);

        res.json({
            success: true,
            message: "Notification deleted successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Delete all alerts of a device
exports.deleteAlerts = async (req, res) => {
    try {

        const { deviceId } = req.params;

        const result = await Alert.deleteMany({ deviceId });

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