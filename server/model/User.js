const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
 username: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  lowercase: true,
  minlength: 3,
  maxlength: 20,
  match: /^[a-z0-9_]+$/,
},
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    index: { unique: true, sparse: true }
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationOtpHash: String,
  verificationOtpExpiresAt: Date,
  verificationOtpAttempts: {
    type: Number,
    default: 0
  },
  passwordResetOtpHash: String,
  passwordResetOtpExpiresAt: Date,
  passwordResetOtpAttempts: {
    type: Number,
    default: 0
  },
  resetTokenHash: String,
  resetTokenExpiresAt: Date,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);