const axios = require('axios');
const nodemailer = require('nodemailer');

const sendOtp = async ({ channel, destination, otp, purpose }) => {
  const subject = purpose === 'verify' ? 'Verify your QuizArena account' : 'Reset your QuizArena password';
  const intro = purpose === 'verify'
    ? 'Use this code to verify your QuizArena account:'
    : 'Use this code to reset your QuizArena password:';

  if (channel === 'email') {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are required to send email OTPs.');
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || SMTP_USER,
      to: destination,
      subject,
      text: `${intro} ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<p>${intro}</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes.</p>`,
    });
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required to send SMS OTPs.');
  }

  const body = new URLSearchParams({
    To: destination,
    From: TWILIO_PHONE_NUMBER,
    Body: `${intro} ${otp}. This code expires in 10 minutes.`,
  });
  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    body.toString(),
    {
      auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    },
  );
};

module.exports = { sendOtp };
