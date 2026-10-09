import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFormik } from 'formik';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  User,
  UserPlus,
  Zap,
  Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useAuth } from '../../context/AuthContext';
import { registerSchema } from '../../validation/schem';

/* =========================================
   Register Page
========================================= */

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      otpChannel: 'email',
    },

    validationSchema: registerSchema,

    validateOnBlur: true,
    validateOnChange: true,

    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);

      const result = await register(
        values.name.trim(),
        values.email.trim(),
        values.phone.trim(),
        values.password,
        values.confirmPassword,
        values.otpChannel
      );

      if (
        result.success ||
        (result.code === 'OTP_SEND_FAILED' && result.identifier)
      ) {
        navigate(
          `/verify-otp?purpose=verify&identifier=${encodeURIComponent(
            result.identifier || values.email.trim()
          )}`,
          {
            state: {
              notice: result.message,
            },
          }
        );

        return;
      }

      // AuthContext already displays the backend error toast.
      // Keep the same message visible in the form as well.
      helpers.setStatus(
        result.message || 'Unable to create your account.'
      );
    },
  });

  const fieldError = (field) =>
    formik.touched[field] && formik.errors[field];

  const inputClass = (field) =>
    `h-12 rounded-xl bg-white px-4 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-[#00d98b]/10 ${
      fieldError(field)
        ? 'border-red-400 focus-visible:ring-red-100'
        : 'border-slate-200 focus-visible:border-[#00d98b]'
    }`;

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f7fbfa]">
      {/* Background decoration */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#00d98b]/10 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#063b49]/10 blur-3xl"
        />

        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#063b49]/5" />
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00d98b]/5" />
      </div>

      {/* Main content */}

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(6,59,73,0.10)] lg:min-h-[650px] lg:grid-cols-2">

          {/* =====================================
              LEFT SIDE — REGISTER FORM
          ====================================== */}

          <section className="flex items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14 xl:px-16">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-[480px]"
            >
              {/* Logo */}

              <Link
                to="/"
                className="mb-8 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#063b49] sm:text-2xl"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#063b49] text-white">
                  <BookOpen className="h-5 w-5" />
                </span>

                <span>
                  Quiz<span className="text-[#00d98b]">Arena</span>
                </span>
              </Link>

              {/* Heading */}

              <div className="mb-7">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00d98b]/20 bg-[#e8fff7] px-3 py-1.5 text-xs font-semibold text-[#063b49]">
                  <Sparkles className="h-3.5 w-3.5 text-[#00b875]" />
                  Start your journey
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-[#063b49] sm:text-4xl">
                  Create your account
                </h1>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                  Join QuizArena, test your knowledge, solve coding
                  challenges and compete with other players.
                </p>
              </div>

              {/* Backend error message */}

              {formik.status && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600"
                  role="alert"
                >
                  {formik.status}
                </motion.div>
              )}

              {/* Formik form */}

              <form
                onSubmit={formik.handleSubmit}
                noValidate
                className="space-y-4"
              >
                {/* Full name */}

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={formik.isSubmitting}
                      aria-invalid={Boolean(fieldError('name'))}
                      className={`${inputClass('name')} pl-10`}
                    />
                  </div>

                  {fieldError('name') && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={formik.isSubmitting}
                      aria-invalid={Boolean(fieldError('email'))}
                      className={`${inputClass('email')} pl-10`}
                    />
                  </div>

                  {fieldError('email') && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+911234567890"
                      autoComplete="tel"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={formik.isSubmitting}
                      aria-invalid={Boolean(fieldError('phone'))}
                      className={`${inputClass('phone')} pl-10`}
                    />
                  </div>

                  {fieldError('phone') ? (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.phone}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">
                      Include your country code.
                    </p>
                  )}
                </div>

                {/* OTP delivery method */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Receive verification code via
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        formik.setFieldValue('otpChannel', 'email')
                      }
                      disabled={formik.isSubmitting}
                      aria-pressed={formik.values.otpChannel === 'email'}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                        formik.values.otpChannel === 'email'
                          ? 'border-[#00b875] bg-[#e8fff7] text-[#063b49] ring-2 ring-[#00d98b]/10'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        formik.setFieldValue('otpChannel', 'sms')
                      }
                      disabled={formik.isSubmitting}
                      aria-pressed={formik.values.otpChannel === 'sms'}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
                        formik.values.otpChannel === 'sms'
                          ? 'border-[#00b875] bg-[#e8fff7] text-[#063b49] ring-2 ring-[#00d98b]/10'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Phone className="h-4 w-4" />
                      SMS
                    </button>
                  </div>

                  {fieldError('otpChannel') && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.otpChannel}
                    </p>
                  )}

                  <p className="mt-1.5 text-xs text-slate-400">
                    We'll send your verification code using your selected method.
                  </p>
                </div>

                {/* Password */}

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      autoComplete="new-password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={formik.isSubmitting}
                      aria-invalid={Boolean(fieldError('password'))}
                      className={`${inputClass('password')} pl-10 pr-11`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#063b49]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {fieldError('password') && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm password */}

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled={formik.isSubmitting}
                      aria-invalid={Boolean(
                        fieldError('confirmPassword')
                      )}
                      className={`${inputClass('confirmPassword')} pl-10 pr-11`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#063b49]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {fieldError('confirmPassword') && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {formik.errors.confirmPassword}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-400">
                    Use a strong password to keep your account secure.
                  </p>
                </div>

                {/* Create account button */}

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-1"
                >
                  <Button
                    type="submit"
                    disabled={formik.isSubmitting}
                    className="h-12 w-full rounded-xl bg-[#063b49] px-5 text-sm font-semibold text-white shadow-lg shadow-[#063b49]/15 transition hover:bg-[#052f3a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formik.isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Login link */}

              <p className="mt-7 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#063b49] transition hover:text-[#00a86b]"
                >
                  Login
                </Link>
              </p>

              {/* Security note */}

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00b875]" />

                <span>
                  Your account is protected with secure authentication.
                </span>
              </div>
            </motion.div>
          </section>

          {/* =====================================
              RIGHT SIDE — QUIZARENA VISUAL
          ====================================== */}

          <section className="relative hidden min-h-[650px] overflow-hidden bg-[#063b49] lg:flex lg:items-center lg:justify-center">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#00d98b]/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute -right-24 top-16 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -left-28 bottom-12 h-80 w-80 rounded-full border border-[#00d98b]/10" />

            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute right-14 top-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white backdrop-blur-md"
            >
              <Zap className="h-5 w-5 text-[#00d98b]" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative z-10 mx-6 w-full max-w-[430px]"
            >
              <div className="mb-5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00d98b] shadow-[0_0_12px_rgba(0,217,139,0.8)]" />

                <span className="text-sm font-medium text-white/70">
                  Welcome to QuizArena
                </span>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="mb-7 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#00d98b]/15 text-[#00d98b]"
                >
                  <Trophy className="h-10 w-10" />
                </motion.div>

                <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  Your next challenge
                  <span className="text-[#00d98b]">
                    {' '}starts here.
                  </span>
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-white/65 sm:text-base">
                  Create your account and get ready to learn,
                  compete, solve and grow with QuizArena.
                </p>

                <div className="mt-8 space-y-3">
                  <FeatureRow
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    title="Test your knowledge"
                    description="Challenge yourself with quizzes"
                  />

                  <FeatureRow
                    icon={<Swords className="h-5 w-5" />}
                    title="Compete in battles"
                    description="Take on real-time challenges"
                  />

                  <FeatureRow
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Secure your account"
                    description="Verify your account with an OTP"
                  />
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -bottom-7 right-0 hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-lg xl:flex"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00d98b] text-[#063b49]">
                  <Swords className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-white">
                    Ready to compete?
                  </p>
                  <p className="text-[11px] text-white/50">
                    Join the arena
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </section>
        </div>
      </div>
    </main>
  );
};

/* =========================================
   Feature Row
========================================= */

const FeatureRow = ({ icon, title, description }) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00d98b]/10 text-[#00d98b]">
      {icon}
    </div>

    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/50">{description}</p>
    </div>
  </div>
);

export default Register;
