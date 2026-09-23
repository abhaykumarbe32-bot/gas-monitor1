const { Expo } = require("expo-server-sdk");
const User = require("../models/User");
const Device = require("../models/Device");

const expo = new Expo();

async function sendNotification(deviceId, gas, level) {
  try {
    console.log(`\n🔔 Preparing Push Notification for Device: ${deviceId}, Gas: ${gas} ppm, Level: ${level}`);

    // Find the device
    const device = await Device.findOne({ deviceId });

    if (!device) {
      console.log("❌ Device not found in database");
      return;
    }

    // Find the owner
    const user = await User.findById(device.userId);

    if (!user || !user.expoPushTokens || user.expoPushTokens.length === 0) {
      console.log("❌ No Push Tokens Found for user");
      return;
    }

    // Keep only valid Expo push tokens
    const validTokens = user.expoPushTokens.filter((token) =>
      Expo.isExpoPushToken(token)
    );

    if (validTokens.length === 0) {
      console.log("❌ No Valid Expo Push Tokens Found in user record");
      return;
    }

    console.log(`📱 Target Expo Push Tokens (${validTokens.length}):`, validTokens);

    // Create a message for every push token (MUST include channelId for Android 8.0+)
    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      channelId: "default", // Must match Android Notification Channel ID created on mobile
      priority: "high",
      title:
        level === "Critical"
          ? "🚨 Critical Gas Leak"
          : "⚠️ Gas Warning",

      body:
        level === "Critical"
          ? `Gas level is ${gas} ppm.\nClose the valve immediately!`
          : `Gas level reached ${gas} ppm.`,

      data: {
        deviceId,
        gas,
        level,
      },
    }));

    // Chunk and send notifications to Expo's Push Server
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("❌ Error sending notification chunk to Expo:", error);
      }
    }

    console.log(`🎟️ Expo Push Tickets Received (${tickets.length}):`, JSON.stringify(tickets, null, 2));

    const receiptIds = [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        console.log(`✅ Push Ticket [${index}] OK - ID: ${ticket.id}`);
        if (ticket.id) {
          receiptIds.push(ticket.id);
        }
      } else if (ticket.status === "error") {
        console.error(`❌ Push Ticket [${index}] ERROR: ${ticket.message}`);
        if (ticket.details && ticket.details.error) {
          console.error(`   Error code: ${ticket.details.error}`);
          if (ticket.details.error === "DeviceNotRegistered") {
            console.warn(`   ⚠️ Token ${validTokens[index]} is invalid / unregistered.`);
          }
        }
      }
    });

    console.log(`✅ Push Notification sent to Expo Push Server for ${validTokens.length} device(s)`);

    // Fetch receipts asynchronously to confirm FCM delivery status
    if (receiptIds.length > 0) {
      console.log(`⏳ Scheduled Expo Receipt verification in 5 seconds...`);
      setTimeout(() => {
        checkReceipts(receiptIds);
      }, 5000);
    }

  } catch (err) {
    console.error("❌ Push Notification System Error:", err.message);
  }
}

async function checkReceipts(receiptIds) {
  try {
    console.log(`\n🧾 Checking ${receiptIds.length} Expo Push Receipt(s)...`);
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptIdChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log("🧾 Raw Push Receipts:", JSON.stringify(receipts, null, 2));

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === "ok") {
          console.log(`🎉 [SUCCESS] Notification delivered to device! Receipt ID: ${receiptId}`);
        } else if (receipt.status === "error") {
          console.error(`💥 [FAILURE] Notification delivery failed! Receipt ID: ${receiptId}`);
          console.error(`   Message: ${receipt.message}`);
          if (receipt.details) {
            console.error(`   Error details:`, receipt.details);
            if (receipt.details.error === "InvalidCredentials") {
              console.error("   🔥 CRITICAL: FCM Credentials mismatch or missing in EAS project configuration!");
            } else if (receipt.details.error === "DeviceNotRegistered") {
              console.error("   ⚠️ Token is no longer registered on phone.");
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error retrieving push receipts:", error);
  }
}

module.exports = {
  sendNotification,
};