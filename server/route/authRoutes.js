const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getMe } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware'); // See step 5

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe); // Protected route example

module.exports = router;