import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CircleX, Clock3, Trophy } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const answerText = (answer) => {
  if (Number.isInteger(answer.selectedOption)) {
    const option = answer.question?.options?.[answer.selectedOption];
    return option?.text || option || 'No answer';
  }
  if (typeof answer.trueFalseAnswer === 'boolean') return answer.trueFalseAnswer ? 'True' : 'False';
  return answer.fillBlankAnswer || answer.longAnswer || answer.codingAnswer || 'No answer';
};

const QuizResult = () => {
  const { responseId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/submit/result/${responseId}`);
        if (active) setResult(data.result);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [responseId]);

  if (loading) return <LoadingState label="Loading your result..." />;

  return (
    <PageFrame
      eyebrow={result?.room ? 'Battle quiz result' : 'Quiz result'}
      title={result?.quiz?.title || 'Your result'}
      description={result?.room?.roomName
        ? `Your result for ${result.room.roomName}. Review your score and submitted answers.`
        : 'Review your score and submitted answers.'}
    >
      {error && <Notice>{error}</Notice>}
      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#063b49] p-5 text-white sm:p-6">
              <Trophy className="h-6 w-6 text-emerald-300" />
              <p className="mt-4 text-sm text-white/70">Score</p>
              <p className="mt-1 text-3xl font-extrabold">{result.obtainedMarks} <span className="text-base font-semibold text-white/60">/ {result.totalMarks}</span></p>
              <p className="mt-1 text-sm text-emerald-200">{Number(result.percentage || 0).toFixed(1)}%</p>
            </div>
            {[
              ['Correct', result.correctAnswers, 'text-emerald-700'],
              ['Incorrect', result.wrongAnswers, 'text-rose-700'],
              ['Unanswered', result.unanswered, 'text-slate-700'],
            ].map(([label, number, color]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className={`mt-2 text-3xl font-extrabold ${color}`}>{number}</p>
                <p className="mt-1 text-xs text-slate-500">of {result.totalQuestions} questions</p>
              </div>
            ))}
          </div>

          {!result.submitted && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-900">This attempt is still in progress. Resume it to finish answering.</p>
              <Link to={`/quiz/${result.quiz?._id}/attempt/${responseId}`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white">Resume attempt</Link>
            </div>
          )}
          {result.autoSubmitted && <div className="mt-5"><Notice tone="success">Time expired and your quiz was submitted automatically.</Notice></div>}

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-bold text-[#063b49]">Answer review</h2>
            {result.answers?.length ? result.answers.map((answer, index) => (
              <article key={`${answer.question?._id || index}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  {answer.aiFeedback === 'Pending AI Evaluation'
                    ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    : answer.isCorrect
                      ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      : <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-slate-900">{index + 1}. {answer.question?.question || 'Question'}</h3>
                    <p className="mt-2 break-words text-sm text-slate-600">Your answer: {answerText(answer)}</p>
                    <p className={`mt-1 text-xs font-semibold ${answer.aiFeedback === 'Pending AI Evaluation' ? 'text-amber-700' : answer.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {answer.aiFeedback === 'Pending AI Evaluation'
                        ? 'Pending evaluation'
                        : `${answer.obtainedMarks} / ${answer.maxMarks} marks`}
                      {answer.evaluatedByAI && answer.aiFeedback ? ` · ${answer.aiFeedback}` : ''}
                    </p>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No answers were recorded for this attempt.</div>
            )}
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/quizzes" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" /> Browse quizzes</Link>
            <Link to="/my-results" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#063b49]">My quiz results</Link>
            <Link to="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#063b49] px-4 text-sm font-semibold text-white">Back to profile</Link>
          </div>
        </>
      )}
    </PageFrame>
  );
};

export default QuizResult;
