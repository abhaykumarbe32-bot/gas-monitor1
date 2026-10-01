const express = require("express");

const router = express.Router();

const {
 register,login,forgotPassword,verifyOTP, resetPassword,logout,
} = require("../controllers/authController");

router.post("/register",register);
router.post("/login", login);
router.post("/forgot-password",forgotPassword);
router.post("/verify-otp",verifyOTP);
router.post("/reset-password",resetPassword);
router.post("/logout", authMiddleware, logout);
module.exports = router;