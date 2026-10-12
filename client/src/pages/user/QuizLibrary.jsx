
"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Play,
  Clock3,
  HelpCircle,
} from "lucide-react";

import { apiRequest } from "../../lib/api";

const gradients = [
  "from-violet-100 to-purple-200",
  "from-sky-100 to-blue-200",
  "from-emerald-100 to-teal-200",
  "from-amber-100 to-orange-200",
  "from-pink-100 to-rose-200",
  "from-indigo-100 to-blue-200",
  "from-cyan-100 to-sky-200",
  "from-fuchsia-100 to-pink-200",
];

const accentColors = [
  "text-violet-700",
  "text-blue-700",
  "text-emerald-700",
  "text-orange-700",
  "text-rose-700",
  "text-indigo-700",
  "text-cyan-700",
  "text-fuchsia-700",
];

function getQuizTitle(quiz) {
  return quiz?.title || quiz?.name || "Untitled Quiz";
}

function getCategoryName(quiz) {
  if (typeof quiz?.category === "string") return quiz.category;

  return (
    quiz?.category?.name ||
    quiz?.topic ||
    "General"
  );
}

function getQuestionCount(quiz) {
  return (
    quiz?.questionCount ??
    quiz?.totalQuestions ??
    quiz?.questionsCount ??
    quiz?.questions?.length ??
    quiz?.numberOfQuestions ??
    null
  );
}

function getDifficulty(quiz) {
  const value = String(
    quiz?.difficulty || quiz?.level || "Medium"
  ).toLowerCase();

  if (value.includes("easy") || value.includes("beginner")) {
    return {
      label: "Easy",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (value.includes("hard") || value.includes("difficult")) {
    return {
      label: "Hard",
      className: "bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Medium",
    className: "bg-amber-50 text-amber-700",
  };
}

function getQuizDescription(quiz) {
  return (
    quiz?.description ||
    `Test your knowledge in ${getCategoryName(quiz)} and see how much you know.`
  );
}

function getQuizId(quiz) {
  return quiz?._id || quiz?.id || quiz?.quizId;
}

export default function QuizLibrary() {
  const [searchParams] = useSearchParams();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(
    searchParams.get("q") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setSelectedCategory(searchParams.get("category") || "All");
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function fetchQuizzes() {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest("/quiz/list");

        const data =
          response?.data?.quizzes ??
          response?.data?.data ??
          response?.data ??
          response?.quizzes ??
          response;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.quizzes)
            ? data.quizzes
            : [];

        if (active) setQuizzes(list);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load quizzes. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchQuizzes();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const names = quizzes
      .map(getCategoryName)
      .filter((name) => typeof name === "string" && name.trim());

    return ["All", ...new Set(names)];
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const searchableText = [
        quiz?.title,
        quiz?.name,
        quiz?.topic,
        quiz?.category?.name,
        quiz?.category,
        quiz?.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term || searchableText.includes(term);

      const matchesCategory =
        selectedCategory === "All" ||
        getCategoryName(quiz) === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [quizzes, search, selectedCategory]);

  const totalQuestions = filteredQuizzes.reduce(
    (total, quiz) =>
      total + (Number(getQuestionCount(quiz)) || 0),
    0
  );

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8FC] text-slate-900">
      {/* Page container */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Simple hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-white via-violet-50 to-sky-100 p-6 shadow-sm sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-200/50 blur-3xl sm:h-72 sm:w-72" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />

          <div className="relative max-w-2xl">
            <span className="inline-flex rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:text-sm">
              Explore · Learn · Compete
            </span>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Find your next
              <span className="block bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                favourite quiz.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              From science and commerce to arts, technology,
              medicine and competitive exams—there is something
              for every curious mind.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2">
                <BookOpen size={16} className="text-violet-600" />
                Learn at your pace
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2">
                <SlidersHorizontal size={16} className="text-blue-600" />
                Choose your topic
              </span>
            </div>
          </div>
        </section>

        {/* Search and filters */}
        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:mt-8 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search quizzes, topics or subjects..."
                aria-label="Search quizzes"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              <RotateCcw size={16} />
              Reset filters
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Browse by subject
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => {
                const selected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quiz heading */}
        <section className="mt-8 sm:mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-600">
                YOUR LEARNING SPACE
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Explore quizzes
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pick a topic and challenge yourself.
              </p>
            </div>

            {!loading && !error && (
              <div className="flex flex-wrap gap-2 text-xs font-medium sm:text-sm">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600">
                  {filteredQuizzes.length}{" "}
                  {filteredQuizzes.length === 1 ? "quiz" : "quizzes"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600">
                  {totalQuestions} questions
                </span>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-28 bg-slate-200 sm:h-32" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                    <div className="h-5 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="h-10 rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 sm:p-8">
              <h3 className="font-semibold text-rose-800">
                We couldn't load the quizzes
              </h3>
              <p className="mt-2 break-words text-sm text-rose-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* Quiz grid */}
          {!loading && !error && filteredQuizzes.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredQuizzes.map((quiz, index) => {
                const difficulty = getDifficulty(quiz);
                const count = getQuestionCount(quiz);
                const quizId = getQuizId(quiz);
                const gradient = gradients[index % gradients.length];
                const accent = accentColors[index % accentColors.length];

                return (
                  <article
                    key={quizId || `${getQuizTitle(quiz)}-${index}`}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60"
                  >
                    {/* Simple gradient artwork — no logos or images */}
                    <div
                      className={`relative flex min-h-28 items-end overflow-hidden bg-gradient-to-br ${gradient} p-5 sm:min-h-32 sm:p-6`}
                    >
                      <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full border-[18px] border-white/20 transition-transform duration-500 group-hover:scale-110" />
                      <div className="pointer-events-none absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/20 blur-xl" />

                      <span className="relative inline-flex max-w-full truncate rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur">
                        {getCategoryName(quiz)}
                      </span>
                    </div>

                    {/* Card content */}
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 break-words text-base font-bold leading-6 text-slate-900 transition group-hover:text-violet-700 sm:text-lg">
                          {getQuizTitle(quiz)}
                        </h3>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${difficulty.className}`}
                        >
                          {difficulty.label}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-3 min-h-[60px] break-words text-sm leading-5 text-slate-500">
                        {getQuizDescription(quiz)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <HelpCircle size={15} className={accent} />
                          {count == null ? "Questions vary" : `${count} questions`}
                        </span>

                        {quiz?.duration != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={15} className={accent} />
                            {quiz.duration} min
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        {quizId ? (
                          <Link
                            to={`/quiz/${quizId}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
                          >
                            <Play size={16} fill="currentColor" />
                            Play Quiz
                            <ArrowRight
                              size={16}
                              className="ml-auto transition-transform group-hover:translate-x-1"
                            />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
                          >
                            Quiz unavailable
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredQuizzes.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Search size={24} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No quizzes found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try a different search or choose another subject.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Clear filters
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs leading-5 text-slate-400">
          Keep learning, keep practising, and celebrate every improvement.
        </p>
      </div>
    </main>
  );
}
