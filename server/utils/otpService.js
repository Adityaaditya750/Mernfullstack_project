
const axios = require('axios');
const { Resend } = require('resend');

const sendOtp = async ({ channel, destination, otp, purpose }) => {
  const subject =
    purpose === 'verify'
      ? 'Verify your QuizArena account'
      : 'Reset your QuizArena password';

  const intro =
    purpose === 'verify'
      ? 'Use this code to verify your QuizArena account:'
      : 'Use this code to reset your QuizArena password:';

  if (channel === 'email') {
    const { RESEND_API_KEY, EMAIL_FROM } = process.env;

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required to send email OTPs.');
    }

    if (!EMAIL_FROM) {
      throw new Error('EMAIL_FROM is required to send email OTPs.');
    }

    const resend = new Resend(RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: destination,
      subject,
      text: `${intro} ${otp}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
          <h2>QuizArena</h2>
          <p>${intro}</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend email delivery failed:', {
        statusCode: error.statusCode,
        name: error.name,
        message: error.message,
      });

      throw new Error('Unable to send OTP email.');
    }

    console.log('OTP email accepted by Resend:', data?.id);
    return;
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
  } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_PHONE_NUMBER
  ) {
    throw new Error(
      'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required to send SMS OTPs.'
    );
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
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    }
  );
};

module.exports = { sendOtp };
