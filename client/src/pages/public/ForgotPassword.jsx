
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import { ArrowLeft, KeyRound, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { forgotPasswordSchema } from '../../validation/schem';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { forgotPassword } = useAuth();

  const formik = useFormik({
    initialValues: {
      identifier: searchParams.get('identifier') || '',
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);

      const result = await forgotPassword(values.identifier.trim());

      if (!result?.success) {
        helpers.setStatus(
          result?.message || 'Unable to send a reset code. Please try again.',
        );
        return;
      }

      const destination = result.identifier || values.identifier.trim();

      navigate(
        `/verify-otp?purpose=reset&identifier=${encodeURIComponent(destination)}`,
        {
          state: {
            notice: result.message || 'Your password reset code has been sent.',
          },
        },
      );
    },
  });

  const identifierError =
    formik.touched.identifier && formik.errors.identifier
      ? formik.errors.identifier
      : '';

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7f7] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#00a96f]">
          <KeyRound size={25} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00a96f]">
          Password recovery
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#063b49]">
          Forgot password?
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the email address or phone number associated with your account.
          We’ll send you a code to verify your identity before you set a new
          password.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-[#00a96f]"
          />
          <p className="text-xs leading-5 text-slate-600">
            Your verification code expires in 10 minutes. Never share it with
            anyone.
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

        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email or phone number
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or +14155552671"
                value={formik.values.identifier}
                onChange={(event) => {
                  formik.handleChange(event);
                  formik.setStatus(undefined);
                }}
                onBlur={formik.handleBlur}
                aria-invalid={Boolean(identifierError)}
                aria-describedby={
                  identifierError ? 'identifier-error' : undefined
                }
                className="h-12 rounded-xl border-slate-200 pl-11 text-sm focus-visible:border-[#00d98b] focus-visible:ring-[#00d98b]/20"
              />
            </div>

            {identifierError && (
              <p
                id="identifier-error"
                className="mt-2 text-xs text-red-600"
              >
                {identifierError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className="h-12 w-full rounded-xl bg-[#063b49] font-semibold text-white transition hover:bg-[#052f3a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? (
              <>
                <LoaderCircle size={18} className="mr-2 animate-spin" />
                Sending code...
              </>
            ) : (
              <>
                Send reset code
                <ArrowLeft className="ml-2 rotate-180" size={18} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-sm text-slate-500">
            Remembered your password?
          </p>

          <Link
            to="/login"
            className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#063b49] transition hover:text-[#00a96f]"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
