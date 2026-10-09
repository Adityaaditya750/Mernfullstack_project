
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { resetPasswordSchema } from '../../validation/schem';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { resetPassword } = useAuth();

  const identifier = searchParams.get('identifier') || '';
  const resetToken = location.state?.resetToken || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);

      if (!identifier || !resetToken) {
        helpers.setStatus(
          'Your password reset session is missing or expired. Please request a new code.',
        );
        return;
      }

      const result = await resetPassword(
        identifier,
        resetToken,
        values.password,
        values.confirmPassword,
      );

      if (!result?.success) {
        helpers.setStatus(
          result?.message || 'Unable to reset your password. Please try again.',
        );
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          notice:
            'Your password was reset successfully. Please log in with your new password.',
        },
      });
    },
  });

  const fieldError = (field) =>
    formik.touched[field] && formik.errors[field]
      ? formik.errors[field]
      : '';

  const inputClass =
    'h-12 rounded-xl border-slate-200 bg-white pr-11 text-sm focus-visible:border-[#00d98b] focus-visible:ring-[#00d98b]/20';

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7f7] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#00a96f]">
          <KeyRound size={24} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00a96f]">
          Password recovery
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#063b49]">
          Set a new password
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Choose a strong new password with at least 8 characters.
        </p>

        {identifier && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-[#00a96f]"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#063b49]">
                Resetting password for
              </p>
              <p className="mt-1 break-all text-sm text-slate-600">
                {identifier}
              </p>
            </div>
          </div>
        )}

        {!identifier || !resetToken ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
          >
            Your password reset session is missing or expired. Please request
            a new code to continue.
          </div>
        ) : null}

        {formik.status && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {formik.status}
          </p>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <LockKeyhole
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your new password"
                value={formik.values.password}
                onChange={(event) => {
                  formik.handleChange(event);
                  formik.setStatus(undefined);
                }}
                onBlur={formik.handleBlur}
                aria-invalid={Boolean(fieldError('password'))}
                aria-describedby={
                  fieldError('password') ? 'password-error' : undefined
                }
                className={`pl-11 ${inputClass}`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-[#063b49]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {fieldError('password') && (
              <p
                id="password-error"
                className="mt-2 text-xs text-red-600"
              >
                {fieldError('password')}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Confirm new password
            </label>

            <div className="relative">
              <LockKeyhole
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={formik.values.confirmPassword}
                onChange={(event) => {
                  formik.handleChange(event);
                  formik.setStatus(undefined);
                }}
                onBlur={formik.handleBlur}
                aria-invalid={Boolean(fieldError('confirmPassword'))}
                aria-describedby={
                  fieldError('confirmPassword')
                    ? 'confirmPassword-error'
                    : undefined
                }
                className={`pl-11 ${inputClass}`}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-[#063b49]"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {fieldError('confirmPassword') && (
              <p
                id="confirmPassword-error"
                className="mt-2 text-xs text-red-600"
              >
                {fieldError('confirmPassword')}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              formik.isSubmitting ||
              !identifier ||
              !resetToken
            }
            className="h-12 w-full rounded-xl bg-[#063b49] font-semibold text-white transition hover:bg-[#052f3a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving password...
              </>
            ) : (
              <>
                Reset password
                <KeyRound size={17} className="ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need another code?{' '}
          <Link
            to="/forgot-password"
            className="font-semibold text-[#063b49] transition hover:text-[#00a96f]"
          >
            Request another code
          </Link>
        </p>

        <Link
          to="/login"
          className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#063b49]"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </section>
    </main>
  );
};

export default ResetPassword;