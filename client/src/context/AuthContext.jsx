
import {
  createContext,
  useState,
  useEffect,
  useContext,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiRequest, jsonBody } from '../lib/api';

const AuthContext = createContext();

/* =========================
   Toast Helpers
========================= */

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallback;

const getSuccessMessage = (response, fallback) =>
  response?.message ||
  response?.data?.message ||
  fallback;

const showSuccessToast = (response, fallback) => {
  toast.success(getSuccessMessage(response, fallback));
};

const showErrorToast = (error, fallback) => {
  toast.error(getErrorMessage(error, fallback));
};

/* =========================
   Auth Provider
========================= */

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     Restore Session
  ========================= */

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      try {
        const currentUser = await apiRequest('/auth/me');

        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  /* =========================
     Unauthorized Event
  ========================= */

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    };

    window.addEventListener(
      'quizarena:unauthorized',
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        'quizarena:unauthorized',
        handleUnauthorized
      );
    };
  }, []);

  /* =========================
     Login
  ========================= */

  const login = async (identifier, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: jsonBody({
          identifier,
          password,
        }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      setUser(data);

      showSuccessToast(data, 'Login successful! Welcome back.');

      return {
        success: true,
        user: data,
        message: getSuccessMessage(
          data,
          'Login successful! Welcome back.'
        ),
      };
    } catch (error) {
      showErrorToast(error, 'Unable to log in. Please try again.');

      return {
        success: false,
        message: getErrorMessage(
          error,
          'Unable to log in. Please try again.'
        ),
        code: error.code,
        identifier: error.identifier,
        purpose: error.purpose,
      };
    }
  };

  /* =========================
     Register
  ========================= */

  const register = async (
    name,
    email,
    phone,
    password,
    confirmPassword,
    otpChannel = 'email'
  ) => {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: jsonBody({
          name,
          email,
          phone,
          password,
          confirmPassword,
          otpChannel,
        }),
      });

      showSuccessToast(
        data,
        'Account created successfully. Please verify your account.'
      );

      return {
        success: true,
        identifier: data.identifier || email,
        purpose: data.purpose || 'verify',
        message: getSuccessMessage(
          data,
          'Account created successfully. Please verify your account.'
        ),
      };
    } catch (error) {
      const message = getErrorMessage(
        error,
        'Unable to create your account. Please try again.'
      );

      // If the backend created the account but failed to deliver
      // the OTP, let the page navigate to the OTP screen.
      if (error.code === 'OTP_SEND_FAILED' && error.identifier) {
        toast.error(message);

        return {
          success: false,
          message,
          code: error.code,
          identifier: error.identifier,
          purpose: error.purpose || 'verify',
        };
      }

      showErrorToast(
        error,
        'Unable to create your account. Please try again.'
      );

      return {
        success: false,
        message,
        code: error.code,
        identifier: error.identifier,
        purpose: error.purpose,
      };
    }
  };

  /* =========================
     Shared Auth Request
  ========================= */

  const authRequest = async (
    path,
    payload,
    {
      successFallback = 'Request completed successfully.',
      errorFallback = 'Something went wrong. Please try again.',
    } = {}
  ) => {
    try {
      const data = await apiRequest(path, {
        method: 'POST',
        body: jsonBody(payload),
      });

      showSuccessToast(data, successFallback);

      return {
        success: true,
        ...data,
        message: getSuccessMessage(data, successFallback),
      };
    } catch (error) {
      const message = getErrorMessage(error, errorFallback);

      showErrorToast(
        error,
        errorFallback
      );

      return {
        success: false,
        message,
        code: error.code,
        identifier: error.identifier,
        purpose: error.purpose,
      };
    }
  };

  /* =========================
     Verify OTP
  ========================= */

  const verifyOtp = (identifier, otp, purpose) =>
    authRequest(
      '/auth/verify-otp',
      {
        identifier,
        otp,
        purpose,
      },
      {
        successFallback:
          purpose === 'reset'
            ? 'OTP verified successfully.'
            : 'Your account has been verified successfully.',
        errorFallback: 'OTP verification failed. Please try again.',
      }
    );

  /* =========================
     Resend OTP
  ========================= */

  const resendOtp = (identifier, purpose) =>
    authRequest(
      '/auth/resend-otp',
      {
        identifier,
        purpose,
      },
      {
        successFallback: 'A new OTP has been sent successfully.',
        errorFallback: 'Unable to resend OTP. Please try again.',
      }
    );

  /* =========================
     Forgot Password
  ========================= */

  const forgotPassword = (identifier) =>
    authRequest(
      '/auth/forgot-password',
      {
        identifier,
      },
      {
        successFallback:
          'If your account exists, password reset instructions have been sent.',
        errorFallback:
          'Unable to process your request. Please try again.',
      }
    );

  /* =========================
     Reset Password
  ========================= */

  const resetPassword = (
    identifier,
    resetToken,
    password,
    confirmPassword
  ) =>
    authRequest(
      '/auth/reset-password',
      {
        identifier,
        resetToken,
        password,
        confirmPassword,
      },
      {
        successFallback: 'Your password has been reset successfully.',
        errorFallback: 'Unable to reset your password. Please try again.',
      }
    );

  /* =========================
     Logout
  ========================= */

  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);

    try {
      const response = await apiRequest('/auth/logout', {
        method: 'POST',
      });

      showSuccessToast(response, 'Logged out successfully.');
    } catch (error) {
      // The local session is already cleared, so logout still
      // completes if the server request fails.
      console.error('Server logout failed:', error.message);
      toast.success('Logged out successfully.');
    }

    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

/* =========================
   Custom Hook
========================= */

export const useAuth = () => useContext(AuthContext);
