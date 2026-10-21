
const axios = require('axios');

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
    const {
      MAILJET_API_KEY,
      MAILJET_SECRET_KEY,
      EMAIL_FROM,
      EMAIL_FROM_NAME,
    } = process.env;

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      throw new Error('Mailjet API credentials are required.');
    }

    if (!EMAIL_FROM) {
      throw new Error('EMAIL_FROM is required to send email OTPs.');
    }

    const senderMatch = EMAIL_FROM.match(/^(.*?)\s*<([^<>]+)>$/);

    const senderEmail = senderMatch
      ? senderMatch[2].trim()
      : EMAIL_FROM.trim();

    const senderName =
      EMAIL_FROM_NAME ||
      (senderMatch && senderMatch[1].trim()) ||
      'QuizArena';

    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: senderEmail,
                Name: senderName,
              },
              To: [{ Email: destination }],
              Subject: subject,
              TextPart: `${intro} ${otp}\n\nThis code expires in 10 minutes.`,
              HTMLPart: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
                  <h2>QuizArena</h2>
                  <p>${intro}</p>
                  <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
                  <p>This code expires in 10 minutes.</p>
                  <p>If you did not request this code, you can ignore this email.</p>
                </div>
              `,
            },
          ],
        },
        {
          auth: {
            username: MAILJET_API_KEY,
            password: MAILJET_SECRET_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const message = response.data?.Messages?.[0];

      if (!message || message.Status !== 'success') {
        console.error('Mailjet email delivery failed:', message?.Errors);
        throw new Error('Mailjet did not accept the OTP email.');
      }

      console.log('OTP email accepted by Mailjet.');
      return;
    } catch (error) {
      console.error('Mailjet email delivery failed:', {
        status: error.response?.status,
        message: error.response?.data || error.message,
      });

      throw new Error('Unable to send OTP email.');
    }
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
