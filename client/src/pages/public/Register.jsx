import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Zap,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const result = await register(name, email, password);

      if (result.success) {
        navigate('/profile');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f7fbfa]">
      {/* =================================================
          BACKGROUND DECORATION
      ================================================== */}

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
          className="
            absolute
            -left-32
            -top-32
            h-80
            w-80
            rounded-full
            bg-[#00d98b]/10
            blur-3xl
          "
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
          className="
            absolute
            -bottom-32
            -right-32
            h-96
            w-96
            rounded-full
            bg-[#063b49]/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[500px]
            w-[500px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-[#063b49]/5
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[700px]
            w-[700px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-[#00d98b]/5
          "
        />
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-4rem)]
          w-full
          max-w-7xl
          items-center
          px-4
          py-8
          sm:px-6
          sm:py-10
          lg:px-8
          lg:py-12
        "
      >
        <div
          className="
            grid
            w-full
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-[0_25px_80px_rgba(6,59,73,0.10)]
            lg:min-h-[650px]
            lg:grid-cols-2
          "
        >
          {/* =================================================
              LEFT SIDE — REGISTER FORM
          ================================================== */}

          <section
            className="
              flex
              items-center
              justify-center
              px-5
              py-10
              sm:px-8
              sm:py-12
              lg:px-12
              xl:px-16
              lg:py-14
            "
          >
            <motion.div
              initial={{
                opacity: 0,
                x: -25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.6,
              }}
              className="w-full max-w-[480px]"
            >
              {/* LOGO */}
              <Link
                to="/"
                className="
                  mb-8
                  inline-flex
                  items-center
                  gap-2
                  text-xl
                  font-bold
                  tracking-tight
                  text-[#063b49]
                  sm:text-2xl
                "
              >
                <span
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#063b49]
                    text-white
                  "
                >
                  <BookOpen className="h-5 w-5" />
                </span>

                <span>
                  Quiz<span className="text-[#00d98b]">Arena</span>
                </span>
              </Link>

              {/* HEADING */}
              <div className="mb-7">
                <div
                  className="
                    mb-3
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#00d98b]/20
                    bg-[#e8fff7]
                    px-3
                    py-1.5
                    text-xs
                    font-semibold
                    text-[#063b49]
                  "
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#00b875]" />
                  Start your journey
                </div>

                <h1
                  className="
                    text-3xl
                    font-extrabold
                    tracking-tight
                    text-[#063b49]
                    sm:text-4xl
                  "
                >
                  Create your account
                </h1>

                <p
                  className="
                    mt-3
                    max-w-md
                    text-sm
                    leading-6
                    text-slate-500
                    sm:text-base
                  "
                >
                  Join QuizArena, test your knowledge, solve coding
                  challenges and compete with other players.
                </p>
              </div>

              {/* ERROR */}
              {error && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="
                    mb-5
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-red-600
                  "
                >
                  {error}
                </motion.div>
              )}

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Full Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      text-sm
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-[#00d98b]
                      focus:ring-4
                      focus:ring-[#00d98b]/10
                    "
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      text-sm
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-[#00d98b]
                      focus:ring-4
                      focus:ring-[#00d98b]/10
                    "
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        pr-12
                        text-sm
                        text-slate-800
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-[#00d98b]
                        focus:ring-4
                        focus:ring-[#00d98b]/10
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      className="
                        absolute
                        right-3
                        top-1/2
                        flex
                        h-8
                        w-8
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        transition
                        hover:bg-slate-100
                        hover:text-[#063b49]
                      "
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use a strong password to keep your account secure.
                  </p>
                </div>

                {/* REGISTER BUTTON */}
                <motion.button
                  whileHover={{
                    scale: 1.01,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  type="submit"
                  disabled={loading}
                  className="
                    flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#063b49]
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-lg
                    shadow-[#063b49]/15
                    transition
                    hover:bg-[#052f3a]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading ? (
                    <>
                      <span
                        className="
                          h-4
                          w-4
                          animate-spin
                          rounded-full
                          border-2
                          border-white/30
                          border-t-white
                        "
                      />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* LOGIN */}
              <p
                className="
                  mt-7
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="
                    font-semibold
                    text-[#063b49]
                    transition
                    hover:text-[#00a86b]
                  "
                >
                  Login
                </Link>
              </p>

              {/* SECURITY NOTE */}
              <div
                className="
                  mt-6
                  flex
                  items-start
                  gap-2
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-3
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00b875]" />

                <span>
                  Your account is protected with secure authentication.
                </span>
              </div>
            </motion.div>
          </section>

          {/* =================================================
              RIGHT SIDE — QUIZARENA VISUAL
          ================================================== */}

          <section
            className="
              relative
              hidden
              min-h-[650px]
              overflow-hidden
              bg-[#063b49]
              lg:flex
              lg:items-center
              lg:justify-center
            "
          >
            {/* Background glow */}
            <div
              className="
                absolute
                -right-24
                -top-24
                h-80
                w-80
                rounded-full
                bg-[#00d98b]/20
                blur-3xl
              "
            />

            <div
              className="
                absolute
                -bottom-32
                -left-24
                h-96
                w-96
                rounded-full
                bg-white/10
                blur-3xl
              "
            />

            {/* Decorative circles */}
            <div
              className="
                absolute
                -right-24
                top-16
                h-72
                w-72
                rounded-full
                border
                border-white/10
              "
            />

            <div
              className="
                absolute
                -left-28
                bottom-12
                h-80
                w-80
                rounded-full
                border
                border-[#00d98b]/10
              "
            />

            {/* Small floating icon */}
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
              className="
                absolute
                right-14
                top-20
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/10
                text-white
                backdrop-blur-md
              "
            >
              <Zap className="h-5 w-5 text-[#00d98b]" />
            </motion.div>

            {/* Main visual card */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                delay: 0.15,
              }}
              className="
                relative
                z-10
                mx-0
                w-full
                min-w-0
                max-w-[430px]
                sm:mx-2
                lg:mx-0
              "
            >
              {/* Top badge */}
              <div className="mb-5 flex items-center gap-2">
                <span
                  className="
                    flex
                    h-2
                    w-2
                    rounded-full
                    bg-[#00d98b]
                    shadow-[0_0_12px_rgba(0,217,139,0.8)]
                  "
                />

                <span className="text-sm font-medium text-white/70">
                  Welcome to QuizArena
                </span>
              </div>

              {/* Glass card */}
              <div
                className="
                  rounded-[2rem]
                  border
                  border-white/10
                  bg-white/[0.07]
                  p-7
                  shadow-2xl
                  backdrop-blur-xl
                  sm:p-9
                "
              >
                {/* Icon */}
                <motion.div
                  animate={{
                    y: [0, -7, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="
                    mb-7
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-2xl
                    bg-[#00d98b]/15
                    text-[#00d98b]
                  "
                >
                  <Trophy className="h-10 w-10" />
                </motion.div>

                <h2
                  className="
                    max-w-md
                    text-3xl
                    font-extrabold
                    leading-tight
                    tracking-tight
                    text-white
                    sm:text-4xl
                  "
                >
                  Your next challenge
                  <span className="text-[#00d98b]"> starts here.</span>
                </h2>

                <p
                  className="
                    mt-5
                    max-w-md
                    text-sm
                    leading-7
                    text-white/65
                    sm:text-base
                  "
                >
                  Create your account and get ready to learn,
                  compete, solve and grow with QuizArena.
                </p>

                {/* Feature rows */}
                <div className="mt-8 space-y-3">
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      border
                      border-white/10
                      bg-white/[0.05]
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#00d98b]/10
                        text-[#00d98b]
                      "
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Test your knowledge
                      </p>

                      <p className="mt-0.5 text-xs text-white/50">
                        Challenge yourself with quizzes
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      border
                      border-white/10
                      bg-white/[0.05]
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#00d98b]/10
                        text-[#00d98b]
                      "
                    >
                      <Swords className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Compete in battles
                      </p>

                      <p className="mt-0.5 text-xs text-white/50">
                        Take on real-time challenges
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom floating card */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="
                  absolute
                  -bottom-7
                  -right-3
                  hidden
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/10
                  px-4
                  py-3
                  shadow-xl
                  backdrop-blur-lg
                  xl:flex
                  xl:items-center
                  xl:gap-3
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#00d98b]
                    text-[#063b49]
                  "
                >
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

export default Register;