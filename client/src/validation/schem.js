
import * as Yup from "yup";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+[1-9]\d{7,14}$/;

const identifierMessage =
  "Enter a valid email address or phone number with country code.";

export const registerSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(60, "Name cannot exceed 60 characters.")
    .required("Full name is required."),

  email: Yup.string()
    .trim()
    .email("Enter a valid email address.")
    .required("Email address is required."),

  phone: Yup.string()
    .required("Phone number is required.")
    .matches(
      phoneRegex,
      "Enter your phone number with country code, e.g. +911234567890."
    ),

  otpChannel: Yup.string()
    .oneOf(["email", "sms"], "Choose email or SMS for OTP delivery.")
    .required("Choose an OTP delivery method."),

  password: Yup.string()
    .min(8, "Password must contain at least 8 characters.")
    .required("Password is required."),

  confirmPassword: Yup.string()
    .required("Please confirm your password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});

export const loginSchema = Yup.object({
  identifier: Yup.string()
    .trim()
    .required("Email address or phone number is required.")
    .test(
      "valid-identifier",
      identifierMessage,
      (value) => {
        if (!value) return false;

        const normalized = value.trim();

        return emailRegex.test(normalized) || phoneRegex.test(normalized);
      }
    ),

  password: Yup.string()
    .required("Password is required."),
});

export const otpSchema = Yup.object({
  otp: Yup.string()
    .required("Enter the OTP.")
    .matches(/^\d{6}$/, "OTP must contain exactly 6 digits."),
});

export const forgotPasswordSchema = Yup.object({
  identifier: Yup.string()
    .trim()
    .required("Email address or phone number is required.")
    .test(
      "valid-identifier",
      identifierMessage,
      (value) => {
        if (!value) return false;

        const normalized = value.trim();

        return emailRegex.test(normalized) || phoneRegex.test(normalized);
      }
    ),
});

export const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .min(8, "Password must contain at least 8 characters.")
    .required("New password is required."),

  confirmPassword: Yup.string()
    .required("Please confirm your new password.")
    .oneOf([Yup.ref("password")], "Passwords do not match."),
});
