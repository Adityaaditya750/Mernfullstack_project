const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  logoutUser,
  getMe,
} = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe); // Protected route example

module.exports = router;