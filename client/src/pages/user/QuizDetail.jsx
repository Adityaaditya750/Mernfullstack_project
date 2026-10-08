import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock3 } from 'lucide-react';
import { apiRequest, jsonBody } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const QuizDetail = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [quizData, questionData] = await Promise.all([
          apiRequest(`/quiz/${quizId}`),
          apiRequest(`/question/${quizId}/attempt`),
        ]);
        if (active) {
          setQuiz(quizData.quiz);
          setQuestionCount(questionData.total ?? questionData.questions?.length ?? 0);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [quizId]);

  const startQuiz = async () => {
    setStarting(true);
    setError('');
    try {
      const data = await apiRequest('/submit/start', {
        method: 'POST',
        body: jsonBody({ quizId }),
      });
      const attempt = data.response;
      sessionStorage.setItem(`quiz-started-${attempt._id}`, attempt.startedAt);
      navigate(`/quiz/${quizId}/attempt/${attempt._id}`, {
        state: { startedAt: attempt.startedAt },
      });
    } catch (requestError) {
      setError(requestError.message);
      setStarting(false);
    }
  };

  if (loading) return <LoadingState label="Loading quiz details..." />;

  return (
    <PageFrame eyebrow="Challenge details" title={quiz?.title || 'Quiz not found'} description={quiz?.description || 'Review the challenge details before starting.'}>
      {error && <Notice>{error}</Notice>}
      {!error && quiz && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{quiz.category}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{quiz.difficulty}</span>
              {quiz.generatedByAI && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">AI generated</span>}
            </div>
            <h2 className="mt-5 text-xl font-bold text-[#063b49] sm:text-2xl">{quiz.topic}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
              {quiz.description || 'Work through each question and submit your answers to see your result.'}
            </p>
            <Link to="/quizzes" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-[#063b49]">
              <ArrowLeft className="h-4 w-4" /> Back to quizzes
            </Link>
          </section>

          <aside className="h-fit rounded-2xl bg-[#063b49] p-5 text-white shadow-lg sm:p-6">
            <h2 className="text-lg font-bold">Before you begin</h2>
            <div className="mt-5 space-y-4 text-sm text-white/85">
              <p className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-emerald-300" />{questionCount} questions</p>
              <p className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-emerald-300" />{quiz.quizDuration || 20} minutes</p>
            </div>
            <p className="mt-5 text-xs leading-5 text-white/65">All questions appear together. Review your answers, then submit the quiz to see your result.</p>
            <button
              type="button"
              onClick={startQuiz}
              disabled={starting || questionCount === 0}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00d98b] px-4 py-3 text-sm font-bold text-[#063b49] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? 'Starting...' : 'Start quiz'} {!starting && <ArrowRight className="h-4 w-4" />}
            </button>
            {questionCount === 0 && <p className="mt-3 text-xs text-amber-200">This quiz has no questions yet.</p>}
          </aside>
        </div>
      )}
    </PageFrame>
  );
};

export default QuizDetail;
