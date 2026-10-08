import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Trophy } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useAuth } from '../../context/AuthContext';

const titleVariants = {
  initial: {
    opacity: 0,
    filter: 'blur(10px)',
    y: -10,
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
  },
  exit: {
    opacity: 0,
    filter: 'blur(10px)',
    y: 10,
  },
};

const cardVariants = {
  email: {
    scale: 1,
    y: 0,
  },
  password: {
    scale: 1,
    y: -5,
  },
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef(null);

  /*
   * ------------------------------------------------------------
   * STEP 1
   * User enters email and clicks Continue.
   * We only reveal the password field here.
   * Backend is NOT called yet.
   * ------------------------------------------------------------
   */
  const handleContinue = (e) => {
    e.preventDefault();

    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setShowPassword(true);
  };

  /*
   * ------------------------------------------------------------
   * STEP 2
   * Now perform the REAL backend login.
   * ------------------------------------------------------------
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      const requestedPath = location.state?.from;
      const destination = requestedPath?.pathname
        && !['/login', '/register'].includes(requestedPath.pathname)
        ? `${requestedPath.pathname}${requestedPath.search || ''}${requestedPath.hash || ''}`
        : result.user.role === 'admin' ? '/admin' : '/profile';
      navigate(destination, { replace: true });
    } else {
      setError(result.message || 'Invalid email or password.');
    }

    setSubmitting(false);
  };

  /*
   * Automatically focus password after animation.
   */
  useEffect(() => {
    if (showPassword) {
      const timer = setTimeout(() => {
        passwordRef.current?.focus();
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [showPassword]);

  /*
   * Allow user to go back to email step.
   */
  const handleBack = () => {
    setShowPassword(false);
    setPassword('');
    setError('');
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] w-full overflow-x-clip bg-[#f4f7f7]">

      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1500px] lg:grid-cols-[1.05fr_0.95fr]">

        {/* =====================================================
            LEFT SIDE — ANIMATED QUIZ ARENA
        ====================================================== */}

        <section className="relative hidden overflow-hidden bg-[#063b49] lg:flex">

          {/* Background glow */}
          <motion.div
            className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#00d98b]/10 blur-3xl"
            animate={{
              x: [0, 35, 0],
              y: [0, 25, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            className="absolute -bottom-48 -right-40 h-[550px] w-[550px] rounded-full bg-[#00d98b]/10 blur-3xl"
            animate={{
              x: [0, -30, 0],
              y: [0, -25, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Small floating circles */}
          <FloatingCircle className="left-[12%] top-[18%]" delay={0} />
          <FloatingCircle className="left-[28%] top-[40%]" delay={1} />
          <FloatingCircle className="right-[18%] top-[20%]" delay={2} />
          <FloatingCircle className="right-[12%] bottom-[24%]" delay={1.5} />
          <FloatingCircle className="left-[15%] bottom-[15%]" delay={2.5} />

          {/* Floating plus symbols */}
          <FloatingPlus className="left-[20%] top-[30%]" delay={0} />
          <FloatingPlus className="right-[20%] top-[45%]" delay={1.5} />

          <div className="relative z-10 flex w-full flex-col px-8 py-10 xl:px-12 xl:py-12 2xl:px-20">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: 'easeOut',
              }}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00d98b] text-[#063b49]">
                <Trophy size={23} strokeWidth={2.5} />
              </div>

              <span className="text-2xl font-bold tracking-tight text-white">
                Quiz<span className="text-[#00d98b]">Arena</span>
              </span>
            </motion.div>

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, x: -35 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.15,
                ease: 'easeOut',
              }}
              className="mt-12 max-w-xl xl:mt-20"
            >
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#00d98b]">
                Multiplayer Quiz Platform
              </p>

              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
                Compete.
                <br />
                Learn.
                <br />

                <span className="text-[#00d98b]">
                  Win Together.
                </span>
              </h1>

              {/* Animated underline */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 62 }}
                transition={{
                  duration: 0.8,
                  delay: 0.8,
                }}
                className="mt-7 h-1 rounded-full bg-[#00d98b]"
              />

              <p className="mt-7 max-w-lg text-base leading-7 text-white/60">
                Challenge yourself with quizzes, battle other players in
                real time, solve coding problems, and climb the leaderboard.
              </p>
            </motion.div>

            {/* =================================================
                FLOATING UI CARDS
            ================================================== */}

            <div className="relative mt-10 h-40 max-w-xl xl:mt-14 xl:h-48">

              {/* Quiz card */}
              <motion.div
                initial={{
                  opacity: 0,
                  x: -50,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: [0, -8, 0],
                }}
                transition={{
                  opacity: {
                    duration: 0.7,
                    delay: 0.5,
                  },
                  x: {
                    duration: 0.7,
                    delay: 0.5,
                  },
                  y: {
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                className="absolute left-0 top-4 w-64 rounded-2xl bg-white p-5 shadow-2xl"
              >
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Live Quiz
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#063b49]">
                      JavaScript Challenge
                    </p>
                  </div>

                  <motion.div
                    animate={{
                      scale: [1, 1.08, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5fff5] text-[#00b879]"
                  >
                    ?
                  </motion.div>
                </div>

                <div className="mt-5 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <motion.div
                      key={item}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        delay: 0.8 + item * 0.08,
                        duration: 0.35,
                      }}
                      className={`h-1.5 flex-1 rounded-full ${
                        item <= 4
                          ? 'bg-[#00d98b]'
                          : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Score card */}
              <motion.div
                initial={{
                  opacity: 0,
                  x: 50,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: [0, 8, 0],
                }}
                transition={{
                  opacity: {
                    duration: 0.7,
                    delay: 0.8,
                  },
                  x: {
                    duration: 0.7,
                    delay: 0.8,
                  },
                  y: {
                    duration: 4.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                className="absolute bottom-0 right-0 w-60 rounded-2xl bg-white p-5 shadow-2xl"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Current ranking
                </p>

                <div className="mt-3 flex items-end justify-between">

                  <div>
                    <p className="text-3xl font-bold text-[#063b49]">
                      #07
                    </p>

                    <p className="mt-1 text-xs text-[#00b879]">
                      ↑ 4 places
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      Score
                    </p>

                    <p className="text-lg font-bold text-[#063b49]">
                      920
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom text */}
            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                delay: 1.1,
              }}
              className="mt-auto flex items-center gap-3 text-xs text-white/45"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#00d98b]" />
              Real-time battles
              <span className="mx-1">•</span>
              Coding challenges
              <span className="mx-1">•</span>
              Live leaderboard
            </motion.div>
          </div>
        </section>

        {/* =====================================================
            RIGHT SIDE — LOGIN
        ====================================================== */}

        <section className="relative flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-6 xl:px-12">

          {/* Mobile background decoration */}
          <motion.div
            className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#00d98b]/10 blur-3xl lg:hidden"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              ease: 'easeOut',
            }}
            className="relative z-10 w-full max-w-[410px]"
          >

            {/* Mobile logo */}
            <motion.div
              initial={{
                opacity: 0,
                y: -15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
              }}
              className="mb-6 flex items-center gap-3 sm:mb-8 lg:hidden"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#063b49] text-[#00d98b]">
                <Trophy size={21} />
              </div>

              <span className="text-xl font-bold text-[#063b49]">
                Quiz<span className="text-[#00b879]">Arena</span>
              </span>
            </motion.div>

            {/* =================================================
                ANIMATED LOGIN CARD
            ================================================== */}

            <motion.div
              variants={cardVariants}
              animate={showPassword ? 'password' : 'email'}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
              }}
            >
              <Card className="w-full overflow-hidden rounded-2xl border border-white/80 bg-[#f8f9f9] p-5 shadow-[0_25px_80px_rgba(6,59,73,0.12)] sm:rounded-[28px] sm:p-7 md:p-9 lg:p-7 xl:p-9">

                {/* Animated title */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {!showPassword ? (
                    <motion.div
                      key="email-title"
                      variants={titleVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{
                        duration: 0.35,
                      }}
                    >
                      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#00a96f]">
                        Sign in
                      </p>

                      <h2 className="text-center text-2xl font-semibold tracking-tight text-[#063b49]">
                        Welcome back
                      </h2>

                      <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                        Enter your email to continue your journey.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="password-title"
                      variants={titleVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{
                        duration: 0.35,
                      }}
                    >
                      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#00a96f]">
                        Almost there
                      </p>

                      <h2 className="text-center text-2xl font-semibold tracking-tight text-[#063b49]">
                        Enter your password
                      </h2>

                      <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                        Welcome back. Let's get you into the arena.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form
                  onSubmit={
                    showPassword
                      ? handleLogin
                      : handleContinue
                  }
                  className="mt-6 sm:mt-8"
                >

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                          y: -8,
                        }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          y: -8,
                        }}
                        className="mb-5 overflow-hidden rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email field */}
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold text-[#063b49]"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        className="h-12 rounded-xl border-black/[0.08] bg-white pl-10 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all placeholder:text-slate-400 focus:border-[#00c982] focus:ring-4 focus:ring-[#00d98b]/10"
                      />
                    </div>
                  </div>

                  {/* =================================================
                      CONDITIONAL PASSWORD FIELD
                  ================================================== */}

                  <AnimatePresence initial={false}>
                    {showPassword && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                          y: -10,
                        }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          y: -10,
                        }}
                        transition={{
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 space-y-2">

                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="password"
                              className="text-xs font-semibold text-[#063b49]"
                            >
                              Password
                            </label>

                            <button
                              type="button"
                              onClick={handleBack}
                              className="text-xs font-medium text-[#00a96f] transition-colors hover:text-[#063b49]"
                            >
                              Change email
                            </button>
                          </div>

                          <div className="relative">
                            <Lock
                              size={17}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <Input
                              ref={passwordRef}
                              id="password"
                              name="password"
                              type={
                                showPasswordText
                                  ? 'text'
                                  : 'password'
                              }
                              required
                              autoComplete="current-password"
                              placeholder="Enter your password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                              }}
                              className="h-12 rounded-xl border-black/[0.08] bg-white pl-10 pr-11 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all placeholder:text-slate-400 focus:border-[#00c982] focus:ring-4 focus:ring-[#00d98b]/10"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswordText(
                                  (prev) => !prev
                                )
                              }
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#063b49]"
                            >
                              {showPasswordText ? (
                                <EyeOff size={17} />
                              ) : (
                                <Eye size={17} />
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Button */}
                  <motion.div
                    layout
                    className="mt-6"
                  >
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group h-12 w-full rounded-xl bg-[#063b49] font-semibold text-white shadow-[0_8px_20px_rgba(6,59,73,0.18)] transition-all hover:bg-[#074757] hover:shadow-[0_12px_25px_rgba(6,59,73,0.23)]"
                    >
                      {submitting ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          {showPassword
                            ? 'Login to Quiz Arena'
                            : 'Continue'}

                          <ArrowRight
                            size={17}
                            className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                {/* Divider */}
                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/[0.06]" />

                  <span className="text-[10px] font-medium tracking-wider text-slate-400">
                    OR
                  </span>

                  <div className="h-px flex-1 bg-black/[0.06]" />
                </div>

                {/* Register */}
                <p className="text-center text-sm text-slate-500">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-[#00a96f] transition-colors hover:text-[#063b49]"
                  >
                    Create account
                  </Link>
                </p>
              </Card>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.8,
              }}
              className="mt-6 text-center text-[11px] text-slate-400"
            >
              Secure access to your Quiz Arena account
            </motion.p>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

/* ============================================================
   FLOATING CIRCLE
============================================================ */

const FloatingCircle = ({ className, delay = 0 }) => {
  return (
    <motion.div
      className={`absolute h-2.5 w-2.5 rounded-full border border-white/25 ${className}`}
      animate={{
        y: [0, -12, 0],
        opacity: [0.2, 0.7, 0.2],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

/* ============================================================
   FLOATING PLUS
============================================================ */

const FloatingPlus = ({ className, delay = 0 }) => {
  return (
    <motion.div
      className={`absolute text-xl font-light text-[#00d98b]/50 ${className}`}
      animate={{
        y: [0, -10, 0],
        rotate: [0, 8, 0],
        opacity: [0.25, 0.7, 0.25],
      }}
      transition={{
        duration: 4.5,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      +
    </motion.div>
  );
};

/* ============================================================
   LOADING SPINNER
============================================================ */

const LoadingSpinner = () => {
  return (
    <motion.div
      className="flex items-center justify-center"
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
    </motion.div>
  );
};

export default Login;