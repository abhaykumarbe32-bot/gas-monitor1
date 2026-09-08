const mqtt = require("mqtt");
const Device = require("../models/Device");
const Alert = require("../models/Alert");
const { sendNotification } = require("../services/notificationService");

function startMQTT(io) {

    const client = mqtt.connect(process.env.MQTT_URL);

    const notificationCooldown = {};

    const COOLDOWN = 1 * 60 * 1000; // 5 Minutes

    client.on("connect", () => {

        console.log("✅ MQTT Connected");

        client.subscribe("sensor/+/gas");
client.subscribe("sensor/+/relay");
 client.subscribe("sensor/+/mode");

console.log("Subscribed : sensor/+/gas");
console.log("Subscribed : sensor/+/relay");
console.log("Subscribed : sensor/+/mode");

    });

    client.on("message", async (topic, message) => {

        try {

            // Parse JSON Payload
            const data = JSON.parse(message.toString());

            // Extract Device ID from Topic
            const deviceId = topic.split("/")[1];
            const topicType = topic.split("/")[2];


            console.log("--------------------------------");
            console.log("Topic :", topic);
            console.log("Device :", deviceId);
            console.log("Payload :", data);

            // Find Registered Device
            const device = await Device.findOne({ deviceId });

            if (!device) {

                console.log(`❌ Unknown Device : ${deviceId}`);

                return;

            }
            if (topicType === "relay") {

    device.relay = data.relay;
    device.status = "online";
    device.lastSeen = new Date();

    await device.save();

    io.to(device.userId.toString()).emit("gas-data", {
        deviceId: device.deviceId,
        relay: device.relay,
        status: "online",
        lastSeen: device.lastSeen,
    });

    console.log("Relay Status Updated");

    return;
}
if (topicType === "mode") {

    if (data.mode !== "AUTO" && data.mode !== "MANUAL") {
        console.log("❌ Invalid Mode:", data.mode);
        return;
    }

    device.mode = data.mode;
    device.status = "online";
    device.lastSeen = new Date();

    await device.save();

    io.to(device.userId.toString()).emit("gas-data", {
        deviceId: device.deviceId,
        mode: device.mode,
        gas: device.gas,
        relay: device.relay,
        valve: device.valve,
        status: "online",
        lastSeen: device.lastSeen,
    });

    console.log("✅ ESP32 Mode Updated:", device.mode);

    return;
}

            // Update Device Status
            device.gas= data.gas;
            device.status = "online";
            device.lastSeen = new Date();

            await device.save();
console.log("Sending Socket to:", device.userId.toString());
            // Send Live Data (temporary)
   io.to(device.userId.toString()).emit("gas-data", {
    deviceId: device.deviceId,
    gas: data.gas,
    relay: device.relay,
    valve: device.valve,
    mode: device.mode,
    status: "online",
    lastSeen: device.lastSeen,
});

            // Determine Alert Level
            let level = null;

            if (data.gas >= 900) {

                level = "Critical";

            } else if (data.gas >= 300) {

                level = "Warning";

            }
            device.alertState = level;

await device.save();

            // Save Alert
            if (level) {

                await Alert.create({

                    deviceId,
                     
                    gas: data.gas,

                    level

                });

                console.log(`Alert Saved (${level})`);

            }

            // Critical Notification
            if (level === "Critical") {

                const now = Date.now();

                if (
                    !notificationCooldown[deviceId] ||
                    now - notificationCooldown[deviceId] > COOLDOWN
                ) {

                    await sendNotification(
                        deviceId,
                        data.gas,
                        level
                    );

                    notificationCooldown[deviceId] = now;

                }

            }

        } catch (err) {

            console.log("MQTT Error:", err.message);

        }

    });

    client.on("error", (err) => {

        console.log("MQTT Connection Error:", err.message);

    });

}

module.exports = startMQTT;