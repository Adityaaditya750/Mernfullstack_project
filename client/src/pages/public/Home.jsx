import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Code2,
  Crown,
  Layers3,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: 'Take Quizzes',
      description:
        'Challenge yourself with quizzes covering programming, databases, web development, AI and many more topics.',
    },
    {
      icon: Swords,
      title: 'Real-Time Battles',
      description:
        'Create or join a battle room and compete against other players in real time.',
    },
    {
      icon: Code2,
      title: 'Coding Challenges',
      description:
        'Solve coding problems and test your programming skills against different challenges.',
    },
  ];

  const arenaItems = [
    {
      icon: Brain,
      title: 'Quiz Arena',
      description: 'Test your knowledge',
    },
    {
      icon: Swords,
      title: 'Battle Mode',
      description: 'Compete in real time',
    },
    {
      icon: Code2,
      title: 'Coding',
      description: 'Solve coding problems',
    },
    {
      icon: Trophy,
      title: 'Results',
      description: 'Track your performance',
    },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#f7f9fb]">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left green glow */}
        <motion.div
          className="
            absolute
            -left-32
            top-20
            h-64
            w-64
            rounded-full
            bg-[#00d98b]/10
            blur-3xl
            sm:h-80
            sm:w-80
            lg:h-[420px]
            lg:w-[420px]
          "
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

        {/* Right dark glow */}
        <motion.div
          className="
            absolute
            -right-32
            top-[35%]
            h-64
            w-64
            rounded-full
            bg-[#063b49]/10
            blur-3xl
            sm:h-80
            sm:w-80
            lg:h-[450px]
            lg:w-[450px]
          "
          animate={{
            x: [0, -30, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Decorative dot */}
        <motion.div
          className="
            absolute
            right-[12%]
            top-[18%]
            h-2
            w-2
            rounded-full
            bg-[#00d98b]
          "
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
          }}
        />

        {/* Decorative dot */}
        <motion.div
          className="
            absolute
            left-[10%]
            top-[55%]
            h-1.5
            w-1.5
            rounded-full
            bg-[#00d98b]/70
          "
          animate={{
            y: [0, -12, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />
      </div>

      {/* =========================================================
          PAGE WRAPPER
      ========================================================== */}

      <div className="relative mx-auto w-full max-w-[2560px]">
        {/* =======================================================
            HERO
        ======================================================== */}

        <section
          className="
            mx-auto
            grid
            w-full
            max-w-[1700px]
            grid-cols-1
            items-center
            gap-10
            px-4
            pb-16
            pt-24

            sm:gap-12
            sm:px-6
            sm:pb-20
            sm:pt-28

            md:px-8
            md:pt-32

            lg:grid-cols-2
            lg:gap-12
            lg:px-12
            lg:pb-24
            lg:pt-28

            xl:gap-20
            xl:px-16

            2xl:px-20
          "
        >
          {/* =====================================================
              LEFT SIDE
          ====================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
            }}
            className="
              min-w-0
              w-full
              text-center
              lg:text-left
            "
          >
            {/* Badge */}

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 0.15,
                duration: 0.5,
              }}
              className="
                mx-auto
                inline-flex
                max-w-full
                items-center
                gap-2
                rounded-full
                border
                border-[#00d98b]/40
                bg-white
                px-3
                py-2
                text-xs
                font-semibold
                text-[#063b49]
                shadow-sm

                sm:px-4
                sm:text-sm

                lg:mx-0
              "
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    animate-ping
                    rounded-full
                    bg-[#00d98b]
                    opacity-60
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    h-2
                    w-2
                    rounded-full
                    bg-[#00d98b]
                  "
                />
              </span>

              <span className="truncate">
                Welcome to Quiz Arena
              </span>
            </motion.div>

            {/* Heading */}

            <motion.h1
              initial={{
                opacity: 0,
                y: 25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.25,
                duration: 0.7,
              }}
              className="
                mx-auto
                mt-6
                w-full
                max-w-[1000px]
                text-[clamp(2.45rem,8vw,5.8rem)]
                font-extrabold
                leading-[0.97]
                tracking-[-0.045em]
                text-[#063b49]

                sm:mt-7

                lg:mx-0
              "
            >
              Compete.
              <br />

              <span className="relative inline-block px-2 text-[#00d98b] sm:px-3">
                Learn.

                <motion.span
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: '100%',
                  }}
                  transition={{
                    delay: 0.8,
                    duration: 0.7,
                  }}
                  className="
                    absolute
                    bottom-[-5px]
                    left-0
                    h-[3px]
                    rounded-full
                    bg-[#00d98b]

                    sm:bottom-[-7px]
                  "
                />
              </span>

              <br />

              <p className="pt-px">
                Win Together.
              </p>
            </motion.h1>

            {/* Description */}

            <motion.p
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.45,
                duration: 0.7,
              }}
              className="
                mx-auto
                mt-6
                w-full
                max-w-[620px]
                text-[clamp(0.95rem,2.4vw,1.2rem)]
                leading-7
                text-slate-600

                sm:mt-7
                sm:leading-8

                lg:mx-0
              "
            >
              Test your knowledge, challenge your friends,
              solve coding problems and compete in real-time
              quiz battles.
            </motion.p>

            {/* Buttons */}

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.6,
                duration: 0.7,
              }}
              className="
                mx-auto
                mt-7
                flex
                w-full
                max-w-[520px]
                flex-col
                gap-3

                sm:mt-8
                sm:flex-row

                lg:mx-0
              "
            >
              {user ? (
                <Link
                  to={user.role === 'admin' ? '/admin' : '/profile'}
                  className="
                    group
                    flex
                    min-h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-[#00d98b]
                    px-6
                    py-3
                    text-base
                    font-semibold
                    text-[#063b49]
                    shadow-lg
                    shadow-[#00d98b]/20
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-xl
                  "
                >
                  {user.role === 'admin' ? 'Admin Dashboard' : 'Go to Dashboard'}

                  <ArrowRight
                    className="
                      h-5
                      w-5
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="
                      group
                      flex
                      min-h-12
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-2xl
                      bg-[#00d98b]
                      px-6
                      py-3
                      text-base
                      font-semibold
                      text-[#063b49]
                      shadow-lg
                      shadow-[#00d98b]/20
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:shadow-xl
                    "
                  >
                    Get Started

                    <ArrowRight
                      className="
                        h-5
                        w-5
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                    />
                  </Link>

                  <Link
                    to="/login"
                    className="
                      flex
                      min-h-12
                      w-full
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-[#063b49]/20
                      bg-white
                      px-6
                      py-3
                      text-base
                      font-semibold
                      text-[#063b49]
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-[#063b49]
                      hover:shadow-md
                    "
                  >
                    Login
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* =====================================================
              RIGHT SIDE — QUIZ ARENA VISUAL
          ====================================================== */}

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
    delay: 0.35,
    duration: 0.8,
  }}
  className="
    relative
    flex
    min-h-[400px]
    w-full
    items-center
    justify-center
    px-0

    sm:min-h-[470px]

    lg:min-h-[540px]
  "
>
  {/* Outer glow */}

  <motion.div
    animate={{
      scale: [1, 1.05, 1],
      opacity: [0.25, 0.45, 0.25],
    }}
    transition={{
      duration: 5,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className="
      absolute
      h-[260px]
      w-[260px]
      rounded-full
      bg-[#00d98b]/10
      blur-3xl

      sm:h-[350px]
      sm:w-[350px]

      lg:h-[450px]
      lg:w-[450px]
    "
  />

  {/* Outer rotating circle */}

  <motion.div
    animate={{
      rotate: 360,
    }}
    transition={{
      duration: 24,
      repeat: Infinity,
      ease: 'linear',
    }}
    className="
      absolute
      h-[290px]
      w-[290px]
      rounded-full
      border
      border-[#00d98b]/20

      sm:h-[390px]
      sm:w-[390px]

      lg:h-[470px]
      lg:w-[470px]
    "
  />

  {/* Inner rotating circle */}

  <motion.div
    animate={{
      rotate: -360,
    }}
    transition={{
      duration: 30,
      repeat: Infinity,
      ease: 'linear',
    }}
    className="
      absolute
      h-[220px]
      w-[220px]
      rounded-full
      border
      border-[#063b49]/10

      sm:h-[310px]
      sm:w-[310px]

      lg:h-[390px]
      lg:w-[390px]
    "
  />

  {/* =================================================
      QUIZ ARENA CARD
  ================================================== */}

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
      relative
      z-10

      w-full
      max-w-none

      overflow-hidden
      rounded-[28px]
      border
      border-slate-200
      bg-white

      shadow-2xl
      shadow-[#063b49]/10

      lg:max-w-[500px]
    "
  >
    {/* Header */}

    <div
      className="
        flex
        items-center
        justify-between
        border-b
        border-slate-100
        px-4
        py-4

        sm:px-6
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#e8fff7]
          "
        >
          <Brain className="h-5 w-5 text-[#063b49]" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[#063b49]">
            QuizArena
          </p>

          <p className="truncate text-xs text-slate-400">
            Your challenge starts here
          </p>
        </div>
      </div>

      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-[#063b49]
        "
      >
        <Zap className="h-4 w-4 text-[#00d98b]" />
      </div>
    </div>

    {/* Content */}

    <div className="p-5 sm:p-7">
      <div className="mb-6">
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-[#00a96f]
          "
        >
          Explore
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-bold
            tracking-tight
            text-[#063b49]

            sm:text-3xl
          "
        >
          Choose your challenge
        </h2>

        <p
          className="
            mt-2
            max-w-md
            text-sm
            leading-6
            text-slate-500
          "
        >
          Learn new concepts, test your skills and compete
          whenever you are ready.
        </p>
      </div>

      {/* Arena options */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {arenaItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.title}
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.55 + index * 0.08,
                duration: 0.45,
              }}
              whileHover={{
                y: -3,
              }}
              className="
                group
                min-w-0
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/80
                p-4
                transition-all
                duration-300

                hover:border-[#00d98b]/40
                hover:bg-[#e8fff7]/50
                hover:shadow-md
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    shadow-sm
                    ring-1
                    ring-slate-100
                    transition-colors

                    group-hover:bg-[#00d98b]
                  "
                >
                  <Icon
                    className="
                      h-5
                      w-5
                      text-[#063b49]
                    "
                  />
                </div>

                <ArrowRight
                  className="
                    h-4
                    w-4
                    shrink-0
                    text-slate-300
                    transition-all
                    duration-300

                    group-hover:translate-x-1
                    group-hover:text-[#063b49]
                  "
                />
              </div>

              <h3
                className="
                  mt-4
                  text-sm
                  font-bold
                  text-[#063b49]
                "
              >
                {item.title}
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                {item.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom message */}

      <div
        className="
          mt-5
          flex
          items-center
          gap-3
          rounded-2xl
          border
          border-[#00d98b]/20
          bg-[#e8fff7]/60
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-white
          "
        >
          <Target className="h-4 w-4 text-[#063b49]" />
        </div>

        <p
          className="
            text-xs
            font-medium
            leading-5
            text-[#063b49]
          "
        >
          Improve your skills one challenge at a time.
        </p>

        <CheckCircle2
          className="
            ml-auto
            h-4
            w-4
            shrink-0
            text-[#00a96f]
          "
        />
      </div>
    </div>
  </motion.div>
</motion.div>
        </section>

        {/* =========================================================
            FEATURES
        ========================================================== */}

        <section
          className="
            mx-auto
            w-full
            max-w-[1700px]
            px-4
            py-16

            sm:px-6
            sm:py-20

            md:px-8

            lg:px-12

            xl:px-16

            2xl:px-20
          "
        >
          {/* Section heading */}

          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              duration: 0.6,
            }}
            className="
              mx-auto
              w-full
              max-w-2xl
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                w-fit
                items-center
                gap-2
                rounded-full
                bg-[#e8fff7]
                px-3
                py-1.5
                text-xs
                font-semibold
                text-[#063b49]
              "
            >
              <Layers3 className="h-3.5 w-3.5" />

              Everything you need
            </div>

            <h2
              className="
                mt-5
                text-[clamp(1.8rem,5vw,3rem)]
                font-bold
                leading-tight
                tracking-tight
                text-[#063b49]
              "
            >
              One platform.
              <br />

              <span className="text-[#00d98b]">
                Endless challenges.
              </span>
            </h2>

            <p
              className="
                mt-4
                text-sm
                leading-6
                text-slate-600

                sm:text-base
                sm:leading-7
              "
            >
              Learn, compete and improve your skills with everything
              QuizArena has to offer.
            </p>
          </motion.div>

          {/* Feature cards */}

          <div
            className="
              mt-10
              grid
              grid-cols-1
              gap-5

              sm:mt-12
              sm:grid-cols-2

              lg:grid-cols-3
              lg:gap-6
            "
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{
                    opacity: 0,
                    y: 25,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                  }}
                  whileHover={{
                    y: -6,
                  }}
                  className="
                    w-full
                    rounded-3xl
                    border
                    border-slate-200
                    bg-white
                    p-6
                    shadow-sm
                    transition-shadow
                    hover:shadow-xl

                    sm:p-7
                  "
                >
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      bg-[#e8fff7]
                    "
                  >
                    <Icon className="h-6 w-6 text-[#063b49]" />
                  </div>

                  <h3
                    className="
                      mt-5
                      text-lg
                      font-bold
                      text-[#063b49]
                    "
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-slate-600
                    "
                  >
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            CTA
        ========================================================== */}

        {!user && (
          <section
            className="
              mx-auto
              w-full
              max-w-[1700px]
              px-4
              pb-16

              sm:px-6
              sm:pb-20

              md:px-8

              lg:px-12

              xl:px-16

              2xl:px-20
            "
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.7,
              }}
              className="
                w-full
                overflow-hidden
                rounded-[28px]
                bg-[#063b49]
                px-5
                py-12
                text-center

                sm:px-10
                sm:py-16

                lg:px-16
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/10
                "
              >
                <Swords className="h-6 w-6 text-[#00d98b]" />
              </div>

              <h2
                className="
                  mt-5
                  text-[clamp(1.8rem,5vw,3rem)]
                  font-bold
                  tracking-tight
                  text-white
                "
              >
                Ready to test yourself?
              </h2>

              <p
                className="
                  mx-auto
                  mt-4
                  max-w-xl
                  text-sm
                  leading-6
                  text-slate-300

                  sm:text-base
                "
              >
                Create your account and start competing with
                players from around the world.
              </p>

              <Link
                to="/register"
                className="
                  group
                  mt-7
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-[#00d98b]
                  px-7
                  py-3
                  text-sm
                  font-semibold
                  text-[#063b49]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-xl
                "
              >
                Create Account

                <ArrowRight
                  className="
                    h-4
                    w-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                />
              </Link>
            </motion.div>
          </section>
        )}
      </div>
    </main>
  );
};

export default Home;