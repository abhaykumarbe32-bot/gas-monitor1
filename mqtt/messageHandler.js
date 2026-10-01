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

        // Determine Alert Level & State Machine Logic
        let newAlertState = "Normal";

        if (gas >= CRITICAL_LEVEL) {
            newAlertState = "Critical";
        } else if (gas >= 501) {
            newAlertState = "Warning";
        }

        const previousAlertState = device.alertState || "Normal";

        // Trigger alert & notification ONLY when alert state changes
        if (previousAlertState !== newAlertState) {

            // Save new state in Device document
            device.alertState = newAlertState;
            await device.save();

            console.log(`Alert State Changed for ${deviceId}: ${previousAlertState} ➡️ ${newAlertState}`);

            // Create Alert document & send push notification for Warning or Critical
            if (newAlertState !== "Normal") {

                await Alert.create({
                    deviceId,
                    gas,
                    level: newAlertState
                });

                console.log(`⚠️ Alert Saved (${newAlertState})`);

                await sendNotification(deviceId, gas, newAlertState);
                console.log(`📱 Push Notification Sent (${newAlertState})`);
            }
        }
}catch (error) {

        console.log("Message Error:", error.message);

    }

}

module.exports = handleMessage;