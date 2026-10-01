const Alert = require("../models/Alert");
const Device = require("../models/Device");

const { sendNotification } = require("../services/notificationService");

const WARNING_LEVEL = 500;
const CRITICAL_LEVEL = 900;

// Notification spam se bachne ke liye
const notificationCooldown = {};
const COOLDOWN_TIME = 1 * 60 * 1000; // 5 minutes

async function handleMessage(io, topic, message) {

    try {

        const data = JSON.parse(message.toString());

        const {
            deviceId,
            gas,
            relay,
            temperature,
            battery,
            mode,
            valve,
            alert
        } = data;

        // Required fields check
        if (!deviceId || gas === undefined) {

            console.log("Invalid MQTT Data");
            return;

        }

        // Find device
        const device = await Device.findOne({ deviceId });
        console.log("Device Found:", device);
        if (!device) {

            console.log("Unknown Device:", deviceId);
            return;

        }

        // Update latest device status
        device.gas = gas;
        device.lastHeat = temperature;
        device.relay = relay;
        device.mode = mode;
        device.valve = valve;
        device.alert = alert;
        device.status = "online";
        device.lastSeen = new Date();

        await device.save();

        // Send live data only to device owner
        io.to(device.userId.toString()).emit("gas-data", data);
        console.log("Sending Socket Data:", data);

        // Determine Alert Level & Abnormal Cycle Logic
        let currentState = "Normal";

        if (gas >= CRITICAL_LEVEL) {
            currentState = "Critical";
        } else if (gas >= 501) {
            currentState = "Warning";
        }

        // Always update current alertState on Device model
        device.alertState = currentState;

        // Handle single-notification cycle per abnormal period
        if (currentState === "Normal") {

            // Reset notification cycle flag when gas returns to Normal
            if (device.alertNotificationSent) {
                device.alertNotificationSent = false;
                console.log(`🔄 Alert notification cycle reset to Normal for ${deviceId}`);
            }
            await device.save();

        } else if (!device.alertNotificationSent) {

            // First abnormal reading of this cycle -> Send 1 notification & create 1 Alert document
            device.alertNotificationSent = true;
            await device.save();

            await Alert.create({
                deviceId,
                gas,
                level: currentState
            });

            console.log(`⚠️ Alert Saved (${currentState}) for ${deviceId}`);

            await sendNotification(deviceId, gas, currentState);
            console.log(`📱 Push Notification Sent (${currentState}) for ${deviceId}`);

        } else {

            // Still in active abnormal cycle (Warning ↔ Critical) -> Save state without creating duplicate alert
            await device.save();

        }
}catch (error) {

        console.log("Message Error:", error.message);

    }

}

module.exports = handleMessage;