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
        } else if (gas > WARNING_LEVEL) {
            currentState = "Warning";
        }

        // Always update current alertState on Device model
        device.alertState = currentState;

        if (currentState === "Normal") {

            // Reset both notification flags when device returns to Normal
            device.warningNotificationSent = false;
            device.criticalNotificationSent = false;

        } else if (currentState === "Warning") {

            if (!device.warningNotificationSent) {

                await Alert.create({
                    deviceId,
                    gas,
                    level: "Warning"
                });

                await sendNotification(deviceId, gas, "Warning");

                device.warningNotificationSent = true;
                console.log(`⚠️ Warning Alert Saved & Notification Sent for ${deviceId}`);
            }

        } else if (currentState === "Critical") {

            if (!device.criticalNotificationSent) {

                await Alert.create({
                    deviceId,
                    gas,
                    level: "Critical"
                });

                await sendNotification(deviceId, gas, "Critical");

                device.criticalNotificationSent = true;
                device.warningNotificationSent = true;
                console.log(`🚨 Critical Alert Saved & Notification Sent for ${deviceId}`);
            }

        }

        await device.save();
}catch (error) {

        console.log("Message Error:", error.message);

    }

}

module.exports = handleMessage;