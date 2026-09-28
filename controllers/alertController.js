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