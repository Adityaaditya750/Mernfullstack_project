import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Code2,
  Plus,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const subjects = ['Science', 'Commerce', 'Arts', 'Maths', 'Computer Science'];

const Home = () => {
  const { user } = useAuth();

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0c10] text-[#f4f4f6]">
      {/* Hero Section */}
      <section className="mx-auto grid min-h-[430px] max-w-[1400px] min-w-0 items-center gap-12 px-5 pb-16 pt-24 sm:px-8 sm:pt-28 md:grid-cols-2 md:gap-8 md:px-6 md:pb-10 md:pt-24 lg:min-h-[980px] lg:items-start lg:gap-16 lg:px-0 lg:pb-10 lg:pt-[170px]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#272930] bg-[#121318] px-3 py-1.5 text-[11px] font-medium text-[#e2e3e7] lg:gap-2.5 lg:px-4 lg:py-2.5 lg:text-base">
            <span className="h-2 w-2 rounded-full bg-[#c4f52c] shadow-[0_0_10px_#c4f52c]" />
            Live multiplayer battles are here
            <ArrowRight className="ml-1 h-3 w-3" />
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.045em] md:text-[40px] lg:mt-8 lg:text-[clamp(3rem,4.4vw,5rem)]">
            Learn faster.
            <br />
            <span className="text-[#c4f52c]">Win together.</span>
          </h1>

          <p className="mt-4 max-w-md text-sm leading-[1.65] text-[#a2a4b1] lg:mt-6 lg:max-w-[610px] lg:text-[22px] lg:leading-[1.6]">
            Practise quizzes in every subject, challenge friends in real-time
            battles and track your progress, all in one place.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 lg:mt-9 lg:gap-3">
            <Link
              to={user ? '/quizzes' : '/register'}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#c4f52c] px-3.5 text-[11px] font-semibold text-[#101109] transition hover:bg-[#d2ff43] lg:h-14 lg:gap-3 lg:rounded-xl lg:px-7 lg:text-base"
            >
              Start practising <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              to={user ? '/battle/create' : '/register'}
              className="inline-flex h-9 items-center rounded-lg border border-[#24262d] px-3.5 text-[11px] font-semibold text-[#f4f4f6] transition hover:border-[#c4f52c] hover:text-[#c4f52c] lg:h-14 lg:rounded-xl lg:px-7 lg:text-base"
            >
              Create a battle room
            </Link>
          </div>

          <div className="mt-5 flex max-w-[510px] flex-wrap items-center gap-1.5 lg:mt-10 lg:gap-2">
            <span className="mr-1 text-[10px] text-[#a2a4b1] lg:text-base">
              Built for every stream
            </span>

            {subjects.map((subject) => (
              <span
                key={subject}
                className="rounded-full border border-[#24262d] px-2.5 py-1 text-[9px] text-[#a2a4b1] lg:px-4 lg:py-2 lg:text-sm"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        {/* Battle Preview */}
        <div className="relative mx-auto w-full min-w-0 max-w-[410px] px-1 py-8 sm:px-0 sm:py-8 lg:mt-[68px] lg:max-w-[680px]">
          <div className="rounded-2xl border border-[#22242b] bg-[#14151b] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] sm:p-6 lg:rounded-[24px] lg:p-8">
            <h2 className="mb-4 text-xs font-bold lg:mb-7 lg:text-2xl">Physics Showdown</h2>

            {[
              ['You', '90', 'w-[92%]', true],
              ['Player 3', '70', 'w-[72%]', false],
              ['Player 2', '60', 'w-[62%]', false],
              ['Player 4', '40', 'w-[42%]', false],
            ].map(([name, score, width, isUser], index) => (
              <div
                key={name}
                className="mb-3 flex items-center gap-2.5 last:mb-0 lg:mb-6 lg:gap-4"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#252731] text-[9px] font-semibold text-[#e2e3e7] lg:h-10 lg:w-10 lg:text-base">
                  {index === 0 ? 'Y' : 'P'}
                </span>

                <span className="w-[70px] shrink-0 text-[10px] text-[#d9dae0] lg:w-[86px] lg:text-base">
                  {name}
                </span>

                <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#292b35] lg:h-2.5">
                  <span
                    className={`block h-full rounded-full ${width} ${
                      isUser ? 'bg-[#c4f52c]' : 'bg-[#575b70]'
                    }`}
                  />
                </span>

                <span className="w-6 text-right text-[10px] font-semibold text-[#d9dae0] lg:w-9 lg:text-base">
                  {score}
                </span>
              </div>
            ))}
          </div>

          {/* Quiz Notification */}
          <div className="absolute right-0 top-0 flex items-center gap-3 rounded-2xl border border-[#24262d] bg-[#17181f] px-3 py-3 shadow-xl lg:-right-3 lg:-top-3 lg:gap-5 lg:px-6 lg:py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#c4f52c] text-[10px] font-bold lg:h-[72px] lg:w-[72px] lg:text-xl">
              8/10
            </div>

            <div className="text-[9px] leading-4 text-[#a2a4b1] lg:text-base lg:leading-6">
              <strong className="block text-[#f4f4f6]">Quiz complete</strong>
              DBMS
              <br />
              Basics
            </div>
          </div>

          {/* Friend Notification */}
          <div className="absolute bottom-0 left-0 flex max-w-[calc(100%-12px)] items-center gap-2 rounded-xl border border-[#24262d] bg-[#17181f] px-3 py-2.5 shadow-xl lg:-left-5 lg:gap-4 lg:rounded-2xl lg:px-6 lg:py-5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c4f52c] text-[9px] font-bold text-[#101109] lg:h-10 lg:w-10 lg:text-base">
              U
            </span>

            <div className="text-[9px] leading-4 text-[#e2e3e7] lg:text-base lg:leading-6">
              @username accepted your request
              <span className="block font-semibold text-[#c4f52c]">
                Invite to battle
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="mx-auto max-w-[1400px] px-6 pb-14 pt-8 sm:px-8 md:px-[42px] lg:px-0 lg:pb-20 lg:pt-12">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c4f52c] lg:text-base">
            The platform
          </span>

          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-[28px] lg:mt-4 lg:text-[52px]">
            Everything students need to
            <br className="hidden sm:block" /> practise, compete and improve
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#a2a4b1] lg:mt-4 lg:text-xl lg:leading-7">
            One platform for quizzes, multiplayer battles, friends and coding
            practice.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-[1.4fr_1fr] lg:mt-16 lg:gap-6">
          {/* Quiz Library */}
          <article className="rounded-xl border border-[#24262d] bg-[#14151b] p-4 sm:p-5 lg:rounded-[24px] lg:p-9">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1f27] text-[#c4f52c] lg:h-14 lg:w-14">
              <BookOpen className="h-3.5 w-3.5 lg:h-7 lg:w-7" />
            </span>

            <h3 className="mt-3 text-sm font-bold lg:mt-7 lg:text-[28px]">Quiz Library</h3>

            <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-lg lg:leading-7">
              Explore quizzes by subject, topic and difficulty, then see your
              score and answers straight away.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5 lg:mt-6 lg:gap-2">
              {['All', 'Science', 'Commerce', 'Arts'].map((subject, index) => (
                <span
                  key={subject}
                  className={`rounded-full border px-2.5 py-1 text-[9px] lg:px-4 lg:py-2 lg:text-sm ${
                    index === 0
                      ? 'border-[#c4f52c] bg-[#c4f52c] font-semibold text-[#101109]'
                      : 'border-[#292b35] text-[#a2a4b1]'
                  }`}
                >
                  {subject}
                </span>
              ))}
            </div>

            <div className="mt-2 border-t border-[#24262d] lg:mt-3">
              {[
                ['Newton’s Laws', 'Physics · Easy'],
                ['DBMS Basics', 'Computer Science · Medium'],
              ].map(([title, detail]) => (
                <div
                  key={title}
                  className="flex items-center justify-between gap-2 border-b border-[#24262d] py-2 last:border-0 lg:py-4"
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold lg:text-base">{title}</p>
                    <p className="text-[9px] text-[#a2a4b1] lg:text-sm">{detail}</p>
                  </div>

                  <Link
                    to={user ? '/quizzes' : '/login'}
                    className="shrink-0 rounded-lg border border-[#292b35] px-2.5 py-1 text-[9px] font-semibold hover:border-[#c4f52c] lg:px-5 lg:py-2.5 lg:text-sm"
                  >
                    Start
                  </Link>
                </div>
              ))}
            </div>
          </article>

          {/* Battle Rooms */}
          <article className="rounded-xl border border-[#24262d] bg-[#14151b] p-4 sm:p-5 lg:rounded-[24px] lg:p-9">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1f27] text-[#c4f52c] lg:h-14 lg:w-14">
              <Zap className="h-3.5 w-3.5 lg:h-7 lg:w-7" />
            </span>

            <h3 className="mt-3 text-sm font-bold lg:mt-7 lg:text-[28px]">Battle Rooms</h3>

            <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-lg lg:leading-7">
              Host a room, choose the setup and compete on the same questions.
            </p>

            <div className="mt-4 text-[10px] lg:mt-7 lg:text-base">
              {[
                ['Topic', 'Physics'],
                ['Difficulty', 'Medium'],
                ['Questions', '10'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-[#24262d] py-2 text-[#a2a4b1] last:border-0 lg:py-4"
                >
                  {label}
                  <strong className="text-[#f4f4f6]">{value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Feature Cards */}
        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:mt-6 lg:gap-6">
          <article className="rounded-xl border border-[#24262d] bg-[#14151b] p-4 sm:p-5 lg:rounded-[24px] lg:p-9">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1f27] text-[#c4f52c] lg:h-14 lg:w-14">
              <Users className="h-3.5 w-3.5 lg:h-7 lg:w-7" />
            </span>

            <h3 className="mt-3 text-sm font-bold lg:mt-7 lg:text-[24px]">Friends</h3>

            <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-base lg:leading-6">
              Search by username, send requests and bring friends into your
              battles.
            </p>

            <div className="mt-3 flex">
              {['A', 'B', 'C'].map((initial) => (
                <span
                  key={initial}
                  className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#14151b] bg-[#30323d] text-[9px] font-semibold lg:h-10 lg:w-10 lg:text-sm"
                >
                  {initial}
                </span>
              ))}

              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c4f52c] text-[#101109] lg:h-10 lg:w-10">
                <Plus className="h-3 w-3 lg:h-5 lg:w-5" />
              </span>
            </div>
          </article>

          <article className="rounded-xl border border-[#24262d] bg-[#14151b] p-4 sm:p-5 lg:rounded-[24px] lg:p-9">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1f27] text-[#c4f52c] lg:h-14 lg:w-14">
              <Code2 className="h-3.5 w-3.5 lg:h-7 lg:w-7" />
            </span>

            <h3 className="mt-3 text-sm font-bold lg:mt-7 lg:text-[24px]">Coding practice</h3>

            <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-base lg:leading-6">
              Go beyond multiple choice with programming challenges.
            </p>

            <pre className="mt-2 overflow-x-auto rounded-lg border border-[#24262d] bg-[#0b0c10] p-2.5 text-[8px] leading-4 text-[#a2a4b1] lg:mt-5 lg:rounded-xl lg:p-4 lg:text-sm lg:leading-6">
              <code>
                {'function reverse(s) {\n  // your solution\n}'}
              </code>
            </pre>
          </article>

          <article className="rounded-xl border border-[#24262d] bg-[#14151b] p-4 sm:p-5 lg:rounded-[24px] lg:p-9">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1f27] text-[#c4f52c] lg:h-14 lg:w-14">
              <BarChart3 className="h-3.5 w-3.5 lg:h-7 lg:w-7" />
            </span>

            <h3 className="mt-3 text-sm font-bold lg:mt-7 lg:text-[24px]">Leaderboard</h3>

            <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-base lg:leading-6">
              Compare rankings and watch your progress climb.
            </p>

            <div className="mt-3 flex h-10 items-end gap-1.5 lg:mt-5 lg:h-24 lg:gap-3">
              {[
                ['h-4 lg:h-8', false],
                ['h-6 lg:h-12', false],
                ['h-5 lg:h-10', false],
                ['h-8 lg:h-16', false],
                ['h-12 lg:h-24', true],
              ].map(([height, highlight], index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-t bg-[#2b2e3a] ${height} ${
                    highlight ? 'bg-[#c4f52c]' : ''
                  }`}
                />
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Three Steps */}
      <section className="mx-auto max-w-[1400px] px-6 py-10 sm:px-8 lg:px-0 lg:py-24">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-[44px]">
          Start in three simple steps
        </h2>

        <div className="mt-5 grid gap-5 border-t border-[#24262d] pt-4 sm:grid-cols-3 sm:gap-6 lg:mt-10 lg:gap-6 lg:pt-8">
          {[
            [
              '01',
              'Choose what to learn',
              'Pick a subject, topic and difficulty that fits you.',
            ],
            [
              '02',
              'Practise or challenge',
              'Take a quiz alone or invite friends to a live battle.',
            ],
            [
              '03',
              'Track your progress',
              'Review results and climb the leaderboard.',
            ],
          ].map(([number, title, description]) => (
            <div key={number}>
              <span className="text-[10px] font-bold text-[#c4f52c] lg:text-base">
                {number}
              </span>

              <h3 className="mt-2 text-sm font-bold lg:mt-4 lg:text-2xl">{title}</h3>

              <p className="mt-1.5 text-[10px] leading-4 text-[#a2a4b1] lg:mt-3 lg:text-lg lg:leading-7">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="mx-auto max-w-[1400px] px-6 py-10 sm:px-8 lg:px-0 lg:py-14">
          <div className="rounded-2xl bg-[#c4f52c] px-5 py-10 text-center text-[#101109] sm:py-11 lg:rounded-[28px] lg:px-12 lg:py-20">
            <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-[32px] lg:text-[56px]">
              Ready to enter the arena?
            </h2>

            <p className="mt-2 text-xs text-[#30391a] lg:mt-4 lg:text-xl">
              Join QuizArena and make every study session count.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 lg:mt-8 lg:gap-3">
              <Link
                to="/register"
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#0b0c10] px-3.5 text-[10px] font-semibold text-white hover:bg-[#24262d] lg:h-14 lg:gap-3 lg:rounded-xl lg:px-7 lg:text-base"
              >
                Create your account <ArrowRight className="h-3 w-3" />
              </Link>

              <Link
                to="/quizzes"
                className="inline-flex h-8 items-center rounded-lg border border-[#52651d] px-3.5 text-[10px] font-semibold hover:bg-[#d5ff45] lg:h-14 lg:rounded-xl lg:px-7 lg:text-base"
              >
                Browse quizzes
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Responsive Footer */}
      <footer className="border-t border-[#181a20]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-8 gap-y-8 px-6 py-8 sm:grid-cols-4 sm:gap-8 sm:px-8 lg:px-0 lg:py-16">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-bold lg:gap-3 lg:text-2xl"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#c4f52c] text-[10px] font-black text-[#101109] lg:h-10 lg:w-10 lg:text-lg">
                Q
              </span>
              QuizArena
            </Link>

            <p className="mt-2 text-[10px] text-[#a2a4b1] lg:mt-4 lg:text-base">
              Learn, practise and compete.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[10px] font-bold lg:text-lg">Product</h3>

            <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-[#a2a4b1] lg:mt-4 lg:gap-3 lg:text-base">
              <Link to="/quizzes" className="transition hover:text-[#c4f52c]">
                Quizzes
              </Link>

              <Link to="/battle" className="transition hover:text-[#c4f52c]">
                Battles
              </Link>

              <Link to="/coding" className="transition hover:text-[#c4f52c]">
                Coding
              </Link>

              <Link
                to="/my-results"
                className="transition hover:text-[#c4f52c]"
              >
                Leaderboard
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-[10px] font-bold lg:text-lg">Community</h3>

            <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-[#a2a4b1] lg:mt-4 lg:gap-3 lg:text-base">
              <Link
                to={user ? '/profile' : '/login'}
                className="transition hover:text-[#c4f52c]"
              >
                Friends
              </Link>

              <Link
                to={user ? '/profile' : '/login'}
                className="transition hover:text-[#c4f52c]"
              >
                Profile
              </Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[10px] font-bold lg:text-lg">Company</h3>

            <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-[#a2a4b1] lg:mt-4 lg:gap-3 lg:text-base">
              <Link to="/about" className="transition hover:text-[#c4f52c]">
                About
              </Link>

              <Link to="/login" className="transition hover:text-[#c4f52c]">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;