const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true
    },
    gas: {
        type: Number,
        required: true
    },
    level: {
        type: String,
        enum: ["Warning", "Critical"],
        required: true
    },
    notificationCleared: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Alert", alertSchema);