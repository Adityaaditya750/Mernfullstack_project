const streams = [
  "Science",
  "Commerce",
  "Arts",
  "Humanities",
  "Mathematics",
  "Computer Science",
  "General Knowledge",
];

const About = () => (
  <main className="about-reference min-h-[calc(100vh-4rem)] px-5 pb-16 pt-10 text-[#f4f4f6] sm:px-8 lg:px-12 lg:pt-14">
    <div className="mx-auto max-w-[1500px]">
      <header className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-7xl">
          Learning that feels like a game
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#a2a4b1] sm:text-xl sm:leading-8">
          QuizArena makes learning more interactive, competitive and enjoyable
          for students from every stream.
        </p>
      </header>

      <section
        aria-label="Our purpose and vision"
        className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14 lg:gap-6"
      >
        <article className="rounded-3xl border border-[#292b35] bg-[#17181f] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#c4f52c]">Purpose</h2>
          <p className="mt-5 text-base leading-6 text-[#a2a4b1]">
            Let students practise subjects through online quizzes and test
            their knowledge.
          </p>
        </article>
        <article className="rounded-3xl border border-[#292b35] bg-[#17181f] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#65e8d1]">Vision</h2>
          <p className="mt-5 text-base leading-6 text-[#a2a4b1]">
            A complete platform where students learn, practise, compete and
            connect with friends.
          </p>
        </article>
        <article className="rounded-3xl border border-[#292b35] bg-[#17181f] p-6 sm:p-8">
          <h2 className="text-xl font-bold">Educational goals</h2>
          <p className="mt-5 text-base leading-6 text-[#a2a4b1]">
            Help students improve their academic knowledge while enjoying the
            process.
          </p>
        </article>
      </section>

      <section className="mt-12 lg:mt-16" aria-labelledby="streams-title">
        <h2 id="streams-title" className="text-2xl font-bold sm:text-3xl">
          Built for every stream
        </h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {streams.map((stream) => (
            <li
              key={stream}
              className="rounded-full border border-[#30323d] bg-[#1d1f27] px-4 py-2 text-sm font-medium text-[#e2e3e7]"
            >
              {stream}
            </li>
          ))}
        </ul>
      </section>
    </div>
  </main>
);

export default About;
