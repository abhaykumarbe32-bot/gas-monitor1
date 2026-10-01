const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../services/emailService");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User Registered",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_jwt_secret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email is not registered in our system.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTP(user.email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (err) {
    console.error("Forgot Password Controller Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to send OTP",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || user.otp.toString().trim() !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code. Please try again.",
      });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP code has expired. Please request a new code.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP Verified",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (otp && user.otp && user.otp.toString().trim() !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = "";
    user.otpExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const logout = async (req, res) => {
    try {
        const { expoPushToken } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Remove only the current device token
        if (expoPushToken) {
            user.expoPushTokens = user.expoPushTokens.filter(
                token => token !== expoPushToken
            );

            await user.save();
        }

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (err) {
        console.error("Logout Error:", err);

        res.status(500).json({
            success: false,
            message: "Logout failed"
        });
    }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  logout,
};