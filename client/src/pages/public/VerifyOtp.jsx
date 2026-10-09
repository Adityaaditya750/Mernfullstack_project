
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { otpSchema } from '../../validation/schem';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { verifyOtp, resendOtp } = useAuth();

  const purpose = searchParams.get('purpose') === 'reset' ? 'reset' : 'verify';
  const identifier = searchParams.get('identifier') || '';

  const [notice, setNotice] = useState(location.state?.notice || '');
  const [resending, setResending] = useState(false);

  const formik = useFormik({
    initialValues: {
      otp: '',
    },
    validationSchema: otpSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      setNotice('');

      if (!identifier) {
        helpers.setStatus(
          'Your account identifier is missing. Please return and try again.',
        );
        return;
      }

      const result = await verifyOtp(identifier, values.otp, purpose);

      if (!result?.success) {
        helpers.setStatus(
          result?.message || 'Unable to verify the code. Please try again.',
        );
        return;
      }

      if (purpose === 'reset') {
        if (!result.resetToken) {
          helpers.setStatus(
            'The reset token was not returned. Please request a new password reset code.',
          );
          return;
        }

        navigate(
          `/reset-password?identifier=${encodeURIComponent(identifier)}`,
          {
            replace: true,
            state: { resetToken: result.resetToken },
          },
        );
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          notice: 'Your account is verified. You can now log in.',
        },
      });
    },
  });

  const handleResend = async () => {
    if (!identifier || resending) return;

    setResending(true);
    setNotice('');
    formik.setStatus(undefined);

    try {
      const result = await resendOtp(identifier, purpose);

      if (result?.success) {
        setNotice(result.message || 'A new verification code has been sent.');
        formik.setFieldValue('otp', '');
        formik.setFieldTouched('otp', false);
      } else {
        formik.setStatus(
          result?.message || 'Unable to resend the code. Please try again.',
        );
      }
    } finally {
      setResending(false);
    }
  };

  const otpError =
    formik.touched.otp && formik.errors.otp ? formik.errors.otp : '';

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7f7] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#00a96f]">
          {purpose === 'verify' ? (
            <ShieldCheck size={25} />
          ) : (
            <KeyRound size={25} />
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00a96f]">
          {purpose === 'verify' ? 'Account verification' : 'Password recovery'}
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#063b49]">
          Enter your OTP
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the six-digit code sent to{' '}
          <span className="break-all font-semibold text-slate-700">
            {identifier || 'your account'}
          </span>
          . The code expires in 10 minutes.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Mail size={18} className="mt-0.5 shrink-0 text-[#00a96f]" />
          <p className="text-xs leading-5 text-slate-600">
            Check your inbox or messages. If you cannot find the code, you can
            request another one below.
          </p>
        </div>

        {formik.status && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {formik.status}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </p>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Six-digit code
            </label>

            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={formik.values.otp}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
                formik.setFieldValue('otp', digits);
                formik.setStatus(undefined);
                setNotice('');
              }}
              onBlur={formik.handleBlur}
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? 'otp-error' : undefined}
              className="h-14 rounded-xl border-slate-200 text-center text-2xl font-semibold tracking-[0.5em] text-[#063b49] placeholder:text-slate-300 focus-visible:border-[#00d98b] focus-visible:ring-[#00d98b]/20"
            />

            {otpError && (
              <p id="otp-error" className="mt-2 text-xs text-red-600">
                {otpError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={formik.isSubmitting || !identifier}
            className="h-12 w-full rounded-xl bg-[#063b49] font-semibold text-white transition hover:bg-[#052f3a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? (
              <>
                <LoaderCircle size={18} className="mr-2 animate-spin" />
                Verifying code...
              </>
            ) : (
              <>
                Verify code
                <ShieldCheck size={18} className="ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-slate-500">
            Didn't receive the code?
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !identifier}
            className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#00a96f] transition hover:text-[#063b49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {resending ? 'Sending code...' : 'Resend code'}
          </button>
        </div>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#063b49]"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </section>
    </main>
  );
};

export default VerifyOtp;
