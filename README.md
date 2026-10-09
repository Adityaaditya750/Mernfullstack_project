# Mernfullstack_project

## Authentication OTP configuration

Copy `server/.env.example` to `server/.env` and configure the SMTP credentials and
Twilio credentials to enable email and SMS verification codes. Registration sends
the initial verification code by email. Password recovery and verification-code
resends use email addresses or international-format phone numbers (`+` followed
by 8-15 digits). Codes expire after 10 minutes.