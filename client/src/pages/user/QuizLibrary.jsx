
"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Search,
  RotateCcw,
} from "lucide-react";

import { apiRequest } from "../../lib/api";

const difficulties = ["Any", "Easy", "Medium", "Hard"];

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

function getDifficulty(quiz) {
  const value = String(
    quiz?.difficulty || quiz?.level || "Medium"
  ).toLowerCase();

  if (value.includes("easy") || value.includes("beginner")) {
    return {
      label: "Easy",
    };
  }

  if (value.includes("hard") || value.includes("difficult")) {
    return {
      label: "Hard",
    };
  }

  return {
    label: "Medium",
  };
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
  const [selectedDifficulty, setSelectedDifficulty] = useState("Any");

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

      const matchesDifficulty =
        selectedDifficulty === "Any" ||
        getDifficulty(quiz).label === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [quizzes, search, selectedCategory, selectedDifficulty]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedDifficulty("Any");
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#0b0c10] text-[#f4f4f6]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-12 pt-6 sm:px-8 sm:pt-8 md:px-6 lg:px-10 lg:pb-16">
        <header>
          <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-[42px]">
            Quiz Library
          </h1>
          <p className="mt-2 text-xs text-[#a2a4b1] sm:text-sm">
            Pick a subject, choose a difficulty and start practising.
          </p>
        </header>

        <section className="mt-6 sm:mt-7 lg:mt-9" aria-label="Quiz filters">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quizzes"
              aria-label="Search quizzes"
              className="h-10 w-full rounded-xl border border-[#292b35] bg-[#101115] px-4 text-xs text-[#f4f4f6] outline-none transition placeholder:text-[#777a88] focus:border-[#c4f52c] sm:h-12 sm:text-sm"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => {
              const selected = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition sm:text-xs ${
                    selected
                      ? "border-[#c4f52c] bg-[#c4f52c] text-[#101109]"
                      : "border-[#292b35] bg-[#191a21] text-[#d9dae0] hover:border-[#c4f52c] hover:text-[#c4f52c]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] text-[#a2a4b1]">Difficulty</span>
            {difficulties.map((difficulty) => {
              const selected = selectedDifficulty === difficulty;

              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => setSelectedDifficulty(difficulty)}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition sm:text-xs ${
                    selected
                      ? "border-[#c4f52c] bg-[#c4f52c] text-[#101109]"
                      : "border-[#292b35] bg-[#191a21] text-[#d9dae0] hover:border-[#c4f52c] hover:text-[#c4f52c]"
                  }`}
                >
                  {difficulty}
                </button>
              );
            })}

            {(search || selectedCategory !== "All" || selectedDifficulty !== "Any") && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium text-[#a2a4b1] transition hover:text-[#c4f52c]"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </section>

        {loading && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[180px] animate-pulse rounded-2xl border border-[#24262d] bg-[#14151b] xl:h-[222px]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 rounded-2xl border border-rose-900/70 bg-[#171317] p-5 sm:p-6">
            <h2 className="font-semibold text-rose-300">
              We couldn't load the quizzes
            </h2>
            <p className="mt-2 break-words text-sm text-[#c5aeb4]">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#c4f52c] px-4 py-2 text-xs font-semibold text-[#101109] transition hover:bg-[#d2ff43]"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredQuizzes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
            {filteredQuizzes.map((quiz, index) => {
              const difficulty = getDifficulty(quiz);
              const quizId = getQuizId(quiz);

              return (
                <article
                  key={quizId || `${getQuizTitle(quiz)}-${index}`}
                  className="flex min-h-[178px] min-w-0 flex-col items-start rounded-2xl border border-[#24262d] bg-[#17181f] p-4 transition hover:border-[#3a3d48] sm:p-5 xl:min-h-[222px] xl:p-6"
                >
                  <span className="max-w-full truncate rounded-full border border-[#292b35] bg-[#20212a] px-3 py-1 text-[10px] font-semibold text-[#e2e3e7] xl:text-xs">
                    {getCategoryName(quiz)}
                  </span>
                  <h2 className="mt-3 line-clamp-1 text-sm font-bold text-[#f4f4f6] sm:text-base xl:mt-4">
                    {getQuizTitle(quiz)}
                  </h2>
                  <p className="mt-1 text-xs text-[#a2a4b1] xl:text-sm">
                    {difficulty.label}
                  </p>

                  {quizId ? (
                    <Link
                      to={`/quiz/${quizId}`}
                      className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-[#c4f52c] px-4 text-[11px] font-semibold text-[#101109] transition hover:bg-[#d2ff43] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c4f52c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17181f] xl:mt-5 xl:h-10 xl:px-6 xl:text-sm"
                    >
                      Start quiz
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3 h-8 cursor-not-allowed rounded-full bg-[#292b35] px-4 text-[11px] font-semibold text-[#777a88] xl:mt-5 xl:h-10 xl:px-6 xl:text-sm"
                    >
                      Quiz unavailable
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredQuizzes.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[#343641] bg-[#14151b] px-5 py-12 text-center sm:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#20212a] text-[#c4f52c]">
              <Search size={20} />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#f4f4f6]">
              No quizzes found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#a2a4b1]">
              Try a different search or choose another subject or difficulty.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c4f52c] px-4 py-2 text-xs font-semibold text-[#101109] transition hover:bg-[#d2ff43]"
            >
              Clear filters
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
