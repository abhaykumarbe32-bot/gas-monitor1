const Device = require("../models/Device");
const Alert = require("../models/Alert");

exports.getDashboard = async (req, res) => {

    try {

        const userId = req.user.id;

        const devices = await Device.find({ userId });

        const latestAlerts = await Alert.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        const totalDevices = devices.length;

        const onlineDevices = devices.filter(
            d => d.status === "online"
        ).length;

        const offlineDevices = devices.filter(
            d => d.status === "offline"
        ).length;

        const safeDevices = devices.filter(
            d => d.gas < 500
        ).length;

        const warningDevices = devices.filter(
            d => d.gas >= 500 && d.gas < 900
        ).length;

        const criticalDevices = devices.filter(
            d => d.gas >= 900
        ).length;

        res.json({

            summary: {

                totalDevices,

                onlineDevices,

                offlineDevices,

                safeDevices,

                warningDevices,

                criticalDevices

            },

            latestAlerts,

            devices

        });

    } catch (err) {

        res.status(500).json({

            message: err.message

        });

    }

};