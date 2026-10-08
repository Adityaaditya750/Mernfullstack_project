import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Trophy } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const QuizHistory = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    apiRequest('/submit/history')
      .then((data) => {
        if (active) setResults(data.results || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Loading your quiz results..." />;

  return (
    <PageFrame
      eyebrow="Your account"
      title="My quiz results"
      description="Your submitted quiz attempts are saved here so you can review them whenever you want."
    >
      {error && <Notice>{error}</Notice>}

      {!error && results.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <Trophy className="mx-auto h-9 w-9 text-emerald-700" />
          <h2 className="mt-4 text-lg font-bold text-[#063b49]">No quiz results yet</h2>
          <p className="mt-2 text-sm text-slate-600">Complete a quiz and your personal result will be saved here.</p>
          <Link to="/quizzes" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#063b49] px-4 text-sm font-semibold text-white">
            Browse quizzes
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((result) => (
            <li key={result._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-base font-bold text-[#063b49] sm:text-lg">
                    {result.quiz?.title || 'Quiz'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {result.room
                      ? `Battle: ${result.room.roomName || 'Battle room'}`
                      : result.quiz?.topic || result.quiz?.category || 'Quiz attempt'}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'Submission date unavailable'}
                    {result.autoSubmitted && <span className="font-semibold text-amber-700">· Auto-submitted</span>}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="font-extrabold text-[#063b49]">
                      {result.obtainedMarks} / {result.totalMarks} marks
                    </p>
                    <p className="text-sm text-slate-600">{Number(result.percentage || 0).toFixed(1)}%</p>
                  </div>
                  <Link
                    to={`/results/${result._id}`}
                    aria-label={`Review result for ${result.quiz?.title || 'quiz'}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#063b49] hover:bg-slate-50"
                  >
                    Review <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
};

export default QuizHistory;
