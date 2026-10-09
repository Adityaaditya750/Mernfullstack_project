const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../model/User");
const { sendOtp } = require("../utils/otpService");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/* =========================================
   Helper: JWT secret
========================================= */

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return process.env.JWT_SECRET;
};

/* =========================================
   Helper: Generate JWT
========================================= */

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    getSecret(),
    { expiresIn: "30d" }
  );
};

/* =========================================
   Helper: Normalize identifier
   Email or phone number
========================================= */

const normalizeIdentifier = (identifier) => {
  if (typeof identifier !== "string") {
    return null;
  }

  const value = identifier.trim();

  if (!value) {
    return null;
  }

  if (value.includes("@")) {
    return {
      email: value.toLowerCase(),
      channel: "email",
    };
  }

  return {
    phone: value.replace(/[\s()-]/g, ""),
    channel: "sms",
  };
};

/* =========================================
   Helper: Find user by email or phone
========================================= */

const findUserByIdentifier = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return null;
  }

  if (normalized.channel === "email") {
    return User.findOne({ email: normalized.email });
  }

  return User.findOne({ phone: normalized.phone });
};

/* =========================================
   Helper: Hash OTP or reset token
========================================= */

const hashValue = (value, userId) => {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${userId}:${value}`)
    .digest("hex");
};

/* =========================================
   Helper: Safely compare hashes
========================================= */

const matchesHash = (value, expectedHash, userId) => {
  if (!value || !expectedHash || !userId) {
    return false;
  }

  const actualHash = Buffer.from(hashValue(value, userId), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualHash, expected);
};

/* =========================================
   Helper: Generate six-digit OTP
========================================= */

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/* =========================================
   Helper: Clear verification OTP
========================================= */

const clearVerificationOtp = (user) => {
  user.verificationOtpHash = undefined;
  user.verificationOtpExpiresAt = undefined;
  user.verificationOtpAttempts = 0;
};

/* =========================================
   Helper: Clear password-reset OTP
========================================= */

const clearPasswordResetOtp = (user) => {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpAttempts = 0;
};

/* =========================================
   Helper: Deliver OTP

   channel: email or sms
   purpose: verify or reset
========================================= */

const deliverOtp = async (user, channel, purpose) => {
  if (!["email", "sms"].includes(channel)) {
    throw new Error("Choose email or SMS for OTP delivery.");
  }

  if (!["verify", "reset"].includes(purpose)) {
    throw new Error("Invalid OTP purpose.");
  }

  const destination =
    channel === "email" ? user.email : user.phone;

  if (!destination) {
    throw new Error(
      channel === "email"
        ? "No email address is available for this account."
        : "No phone number is available for this account."
    );
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const otpHash = hashValue(otp, user._id.toString());

  if (purpose === "verify") {
    user.verificationOtpHash = otpHash;
    user.verificationOtpExpiresAt = expiresAt;
    user.verificationOtpAttempts = 0;
  } else {
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = expiresAt;
    user.passwordResetOtpAttempts = 0;
  }

  await user.save();

  try {
    await sendOtp({
      channel,
      destination,
      otp,
      purpose,
    });
  } catch (error) {
    if (purpose === "verify") {
      clearVerificationOtp(user);
    } else {
      clearPasswordResetOtp(user);
    }

    await user.save();

    throw error;
  }

  return destination;
};

/* =========================================
   REGISTER USER
   POST /api/auth/register
========================================= */

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      otpChannel = "email",
    } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, and confirm password are required.",
      });
    }

    if (!["email", "sms"].includes(otpChannel)) {
      return res.status(400).json({
        success: false,
        message: "Choose email or SMS for OTP delivery.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone =
      typeof phone === "string"
        ? phone.replace(/[\s()-]/g, "")
        : "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+[1-9]\d{7,14}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (otpChannel === "sms" && !phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid phone number with country code, such as +911234567890.",
      });
    }

    if (phone && !phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid phone number with country code, such as +911234567890.",
      });
    }

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({
        phone: normalizedPhone,
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "An account with this phone number already exists.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      password: hashedPassword,
      isVerified: false,
      role: "user",
    });

    try {
      await deliverOtp(user, otpChannel, "verify");

      return res.status(201).json({
        success: true,
        message: `Account created. Enter the verification code sent to your ${
          otpChannel === "email" ? "email address" : "phone number"
        }.`,
        identifier:
          otpChannel === "email" ? user.email : user.phone,
        purpose: "verify",
        channel: otpChannel,
      });
    } catch (error) {
      console.error("Registration OTP delivery failed:", error.message);

      return res.status(503).json({
        success: false,
        message:
          "Your account was created, but OTP delivery failed. Please request a new code.",
        code: "OTP_SEND_FAILED",
        identifier:
          otpChannel === "email" ? user.email : user.phone,
        purpose: "verify",
        channel: otpChannel,
      });
    }
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email or phone number is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register your account.",
    });
  }
};

/* =========================================
   LOGIN USER
   POST /api/auth/login
========================================= */

const loginUser = async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;

    const loginIdentifier = identifier || email || phone;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number and password are required.",
      });
    }

    const user = await findUserByIdentifier(loginIdentifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    if (!user.isVerified) {
      const normalized = normalizeIdentifier(loginIdentifier);

      // A phone-based login sends the verification code by SMS.
      // An email-based login sends the verification code by email.
      try {
        await deliverOtp(user, normalized.channel, "verify");
      } catch (error) {
        console.error("Login OTP delivery failed:", error.message);

        return res.status(503).json({
          success: false,
          message: "Unable to send the verification code. Please try again.",
          code: "OTP_SEND_FAILED",
        });
      }

      return res.status(403).json({
        success: false,
        code: "OTP_REQUIRED",
        message: "Please verify your account before logging in.",
        identifier: loginIdentifier,
        purpose: "verify",
        channel: normalized.channel,
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
};

/* =========================================
   VERIFY OTP
   POST /api/auth/verify-otp
========================================= */

const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp, purpose = "verify" } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: "Identifier and OTP are required.",
      });
    }

    if (!["verify", "reset"].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP purpose.",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid six-digit OTP.",
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (purpose === "verify" && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Your account is already verified.",
      });
    }

    const isVerification = purpose === "verify";

    const expectedHash = isVerification
      ? user.verificationOtpHash
      : user.passwordResetOtpHash;

    const expiresAt = isVerification
      ? user.verificationOtpExpiresAt
      : user.passwordResetOtpExpiresAt;

    const attempts = isVerification
      ? user.verificationOtpAttempts || 0
      : user.passwordResetOtpAttempts || 0;

    if (!expectedHash || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please request a new code.",
      });
    }

    if (attempts >= MAX_OTP_ATTEMPTS) {
      if (isVerification) {
        clearVerificationOtp(user);
      } else {
        clearPasswordResetOtp(user);
      }

      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      if (isVerification) {
        clearVerificationOtp(user);
      } else {
        clearPasswordResetOtp(user);
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new code.",
      });
    }

    const validOtp = matchesHash(
      String(otp),
      expectedHash,
      user._id.toString()
    );

    if (!validOtp) {
      if (isVerification) {
        user.verificationOtpAttempts = attempts + 1;
      } else {
        user.passwordResetOtpAttempts = attempts + 1;
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP.",
        attemptsRemaining: Math.max(
          0,
          MAX_OTP_ATTEMPTS - attempts - 1
        ),
      });
    }

    if (purpose === "verify") {
      user.isVerified = true;
      clearVerificationOtp(user);

      await user.save();

      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: "Your account has been verified successfully.",
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    }

    // A valid password-reset OTP generates a temporary reset token.
    clearPasswordResetOtp(user);

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetTokenHash = hashValue(
      resetToken,
      user._id.toString()
    );

    user.resetTokenExpiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MS
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified. You can now reset your password.",
      identifier,
      resetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP.",
    });
  }
};

/* =========================================
   RESEND OTP
   POST /api/auth/resend-otp

   Body:
   { identifier, purpose, channel? }

   channel can be "email" or "sms".
========================================= */

const resendOtp = async (req, res) => {
  try {
    const {
      identifier,
      purpose = "verify",
      channel,
    } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required.",
      });
    }

    if (!["verify", "reset"].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP purpose.",
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (purpose === "verify" && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Your account is already verified.",
      });
    }

    if (purpose === "reset" && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first.",
      });
    }

    const normalized = normalizeIdentifier(identifier);
    const otpChannel = channel || normalized.channel;

    if (!["email", "sms"].includes(otpChannel)) {
      return res.status(400).json({
        success: false,
        message: "Choose email or SMS for OTP delivery.",
      });
    }

    if (otpChannel === "sms" && !user.phone) {
      return res.status(400).json({
        success: false,
        message: "No phone number is registered for this account.",
      });
    }

    await deliverOtp(user, otpChannel, purpose);

    return res.status(200).json({
      success: true,
      message: `A new OTP has been sent to your ${
        otpChannel === "email" ? "email address" : "phone number"
      }.`,
      identifier:
        otpChannel === "email" ? user.email : user.phone,
      purpose,
      channel: otpChannel,
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.status(503).json({
      success: false,
      message: "Unable to send OTP. Please try again.",
    });
  }
};

/* =========================================
   FORGOT PASSWORD
   POST /api/auth/forgot-password
========================================= */

const forgotPassword = async (req, res) => {
  try {
    const { identifier, channel } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required.",
      });
    }

    const user = await findUserByIdentifier(identifier);

    // Use a generic response for accounts that do not exist.
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account matches those details, a password-reset OTP will be sent.",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account before resetting your password.",
      });
    }

    const normalized = normalizeIdentifier(identifier);
    const otpChannel = channel || normalized.channel;

    if (!["email", "sms"].includes(otpChannel)) {
      return res.status(400).json({
        success: false,
        message: "Choose email or SMS for OTP delivery.",
      });
    }

    if (otpChannel === "sms" && !user.phone) {
      return res.status(400).json({
        success: false,
        message: "No phone number is registered for this account.",
      });
    }

    await deliverOtp(user, otpChannel, "reset");

    return res.status(200).json({
      success: true,
      message: `A password-reset OTP has been sent to your ${
        otpChannel === "email" ? "email address" : "phone number"
      }.`,
      identifier:
        otpChannel === "email" ? user.email : user.phone,
      purpose: "reset",
      channel: otpChannel,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(503).json({
      success: false,
      message: "Unable to send the password-reset OTP.",
    });
  }
};

/* =========================================
   RESET PASSWORD
   POST /api/auth/reset-password

   Body:
   {
     identifier,
     resetToken,
     password,
     confirmPassword
   }
========================================= */

const resetPassword = async (req, res) => {
  try {
    const {
      identifier,
      resetToken,
      password,
      confirmPassword,
    } = req.body;

    if (
      !identifier ||
      !resetToken ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (!user.resetTokenHash || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Reset session is invalid. Request a new OTP.",
      });
    }

    if (
      new Date(user.resetTokenExpiresAt).getTime() <= Date.now()
    ) {
      user.resetTokenHash = undefined;
      user.resetTokenExpiresAt = undefined;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Reset session expired. Request a new OTP.",
      });
    }

    const validToken = matchesHash(
      resetToken,
      user.resetTokenHash,
      user._id.toString()
    );

    if (!validToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password.",
    });
  }
};

/* =========================================
   GET CURRENT USER
   GET /api/auth/me
========================================= */

const getMe = async (req, res) => {
  try {
    // Supports middleware that attaches either req.user or req.user.id.
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(userId).select(
      "-password " +
        "-verificationOtpHash " +
        "-verificationOtpExpiresAt " +
        "-verificationOtpAttempts " +
        "-passwordResetOtpHash " +
        "-passwordResetOtpExpiresAt " +
        "-passwordResetOtpAttempts " +
        "-resetTokenHash " +
        "-resetTokenExpiresAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user details.",
    });
  }
};

/* =========================================
   LOGOUT USER
   POST /api/auth/logout
========================================= */

const logoutUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Logout successful. Please clear the authentication token on the client.",
  });
};

/* =========================================
   EXPORT CONTROLLERS
========================================= */

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  logoutUser,
  getMe,
};