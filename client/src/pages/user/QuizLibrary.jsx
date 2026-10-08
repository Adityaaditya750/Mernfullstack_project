import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Code2, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const QuizLibrary = ({ codingOnly = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState([]);
  const [codingQuizIds, setCodingQuizIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'All';

  useEffect(() => {
    let active = true;

    const loadQuizzes = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest('/quiz/list');
        const available = data.quizzes || [];
        if (!active) return;
        setQuizzes(available);

        if (codingOnly) {
          const questionsByQuiz = await Promise.all(
            available.map(async (quiz) => {
              const result = await apiRequest(`/question/${quiz._id}`);
              return {
                id: quiz._id,
                hasCoding: (result.questions || []).some(
                  (question) => question.questionType === 'CODING',
                ),
              };
            }),
          );
          if (active) {
            setCodingQuizIds(
              questionsByQuiz.filter((entry) => entry.hasCoding).map((entry) => entry.id),
            );
          }
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadQuizzes();
    return () => {
      active = false;
    };
  }, [codingOnly]);

  const categories = useMemo(
    () => ['All', ...new Set(quizzes.map((quiz) => quiz.category).filter(Boolean))],
    [quizzes],
  );

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = `${quiz.title} ${quiz.topic} ${quiz.category}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = category === 'All' || quiz.category === category;
    const matchesCoding = !codingOnly || codingQuizIds.includes(quiz._id);
    return matchesSearch && matchesCategory && matchesCoding;
  });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === 'category' && value === 'All')) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <PageFrame
      eyebrow={codingOnly ? 'Code and practice' : 'Quiz Arena'}
      title={codingOnly ? 'Coding challenges' : 'Quiz library'}
      description={codingOnly
        ? 'Choose a published quiz that includes coding questions. Write and submit your solution in the challenge flow.'
        : 'Browse published quizzes, review the details, and start a saved attempt when you are ready.'}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => updateParam('q', event.target.value)}
            placeholder="Search by title, topic, or category"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            aria-label="Search quizzes"
          />
        </label>
        <select
          value={category}
          onChange={(event) => updateParam('category', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm sm:w-56"
          aria-label="Filter by category"
        >
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      {error && <Notice>{error}</Notice>}
      {loading && <LoadingState label={codingOnly ? 'Finding published coding challenges...' : 'Loading published quizzes...'} />}

      {!loading && !error && filteredQuizzes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-800">
            {codingOnly ? 'No published coding quizzes yet' : 'No quizzes match your search'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {codingOnly ? 'Check back after an admin publishes a quiz containing a coding question.' : 'Try a different search term or category.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          {filteredQuizzes.map((quiz) => (
            <article key={quiz._id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              {quiz.thumbnail ? (
                <img src={quiz.thumbnail} alt="" className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#063b49] to-emerald-700">
                  {codingOnly ? <Code2 className="h-10 w-10 text-emerald-200" /> : <BookOpen className="h-10 w-10 text-emerald-200" />}
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{quiz.category}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{quiz.difficulty}</span>
                </div>
                <h2 className="mt-3 break-words text-lg font-bold text-[#063b49]">{quiz.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{quiz.topic}</p>
                <p className="mt-3 text-xs text-slate-500">{quiz.questionCount} questions</p>
                <Link
                  to={`/quiz/${quiz._id}`}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#063b49] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#052f3a]"
                >
                  View challenge <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageFrame>
  );
};

export default QuizLibrary;
