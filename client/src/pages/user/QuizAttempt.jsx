import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Clock3, Send } from 'lucide-react';
import { apiRequest, jsonBody } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const questionIdOf = (answer) => (
  typeof answer.question === 'string' ? answer.question : answer.question?._id
);

const answerToDraft = (answer) => {
  const questionId = questionIdOf(answer);
  return [questionId, {
    selectedOption: answer.selectedOption == null ? '' : String(answer.selectedOption),
    trueFalseAnswer: typeof answer.trueFalseAnswer === 'boolean' ? String(answer.trueFalseAnswer) : '',
    fillBlankAnswer: answer.fillBlankAnswer || '',
    longAnswer: answer.longAnswer || '',
    codingAnswer: answer.codingAnswer || '',
  }];
};

const hasAnswer = (question, answer = {}) => {
  if (question.questionType === 'MCQ' || question.questionType === 'IMAGE') return answer.selectedOption !== '';
  if (question.questionType === 'TRUE_FALSE') return answer.trueFalseAnswer === 'true' || answer.trueFalseAnswer === 'false';
  if (question.questionType === 'FILL') return Boolean(answer.fillBlankAnswer?.trim());
  if (question.questionType === 'LONG') return Boolean(answer.longAnswer?.trim());
  if (question.questionType === 'CODING') return Boolean(answer.codingAnswer?.trim());
  return false;
};

const QuizAttempt = () => {
  const { quizId, responseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [draftAnswers, setDraftAnswers] = useState({});
  const [startedAt, setStartedAt] = useState('');
  const [attemptDurationSeconds, setAttemptDurationSeconds] = useState(null);
  const [isBattleAttempt, setIsBattleAttempt] = useState(false);
  const [sharedDeadline, setSharedDeadline] = useState(null);
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [error, setError] = useState('');
  const finishStarted = useRef(false);
  const deadlineTriggered = useRef(false);
  const draftStorageKey = `quiz-draft-${responseId}`;

  const answeredIds = useMemo(
    () => new Set(savedAnswers.map(questionIdOf)),
    [savedAnswers],
  );
  const answeredCount = questions.reduce(
    (count, question) => count + (hasAnswer(question, draftAnswers[question._id]) ? 1 : 0),
    0,
  );

  useEffect(() => {
    let active = true;
    const loadAttempt = async () => {
      setLoading(true);
      setError('');
      try {
        const requestStartedAt = Date.now();
        const [quizData, questionData, resultData] = await Promise.all([
          apiRequest(`/quiz/${quizId}`),
          apiRequest(`/question/${quizId}/attempt`),
          apiRequest(`/submit/result/${responseId}`),
        ]);
        const requestFinishedAt = Date.now();

        if (!active) return;
        const loadedQuestions = questionData.questions || [];
        const result = resultData.result;
        if (result.submitted) {
          navigate(`/results/${responseId}`, { replace: true });
          return;
        }

        const start = result.startedAt || location.state?.startedAt
          || sessionStorage.getItem(`quiz-started-${responseId}`);
        if (!start) throw new Error('Could not restore the start time for this attempt.');

        let cachedDraft = {};
        try {
          cachedDraft = JSON.parse(sessionStorage.getItem(draftStorageKey) || '{}');
        } catch (storageError) {
          console.error('Unable to restore quiz answer draft:', storageError);
          sessionStorage.removeItem(draftStorageKey);
        }

        const persistedAnswers = result.answers || [];
        const persistedDraft = Object.fromEntries(persistedAnswers.map(answerToDraft));
        sessionStorage.setItem(`quiz-started-${responseId}`, start);
        setQuiz(quizData.quiz);
        setQuestions(loadedQuestions);
        setSavedAnswers(persistedAnswers);
        setDraftAnswers({ ...cachedDraft, ...persistedDraft });
        setStartedAt(start);
        setAttemptDurationSeconds(Number(result.durationSeconds) || null);
        setIsBattleAttempt(Boolean(result.room));
        setSharedDeadline(result.room?.quizEndTime || null);
        if (result.serverNow) {
          const requestMidpoint = (requestStartedAt + requestFinishedAt) / 2;
          setServerClockOffset(new Date(result.serverNow).getTime() - requestMidpoint);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAttempt();
    return () => { active = false; };
  }, [draftStorageKey, quizId, responseId, location.state, navigate]);

  useEffect(() => {
    if (!loading) sessionStorage.setItem(draftStorageKey, JSON.stringify(draftAnswers));
  }, [draftAnswers, draftStorageKey, loading]);

  const updateAnswer = (questionId, field, value) => {
    setDraftAnswers((answers) => ({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        [field]: value,
      },
    }));
  };

  const finishAttempt = useCallback(async () => {
    if (finishStarted.current) return;
    finishStarted.current = true;
    setSubmitting(true);
    setError('');

    try {
      const submittedIds = new Set(savedAnswers.map(questionIdOf));
      const pendingAnswers = [];
      for (const question of questions) {
        const questionDraft = draftAnswers[question._id] || {};
        if (submittedIds.has(question._id) || !hasAnswer(question, questionDraft)) continue;

        const answer = { questionId: question._id, timeTaken: 0 };
        if (question.questionType === 'MCQ' || question.questionType === 'IMAGE') {
          answer.selectedOption = Number(questionDraft.selectedOption);
        } else if (question.questionType === 'TRUE_FALSE') {
          answer.trueFalseAnswer = questionDraft.trueFalseAnswer === 'true';
        } else if (question.questionType === 'FILL') {
          answer.fillBlankAnswer = questionDraft.fillBlankAnswer.trim();
        } else if (question.questionType === 'LONG') {
          answer.longAnswer = questionDraft.longAnswer.trim();
        } else if (question.questionType === 'CODING') {
          answer.codingAnswer = questionDraft.codingAnswer;
          answer.codingLanguage = question.coding?.language || '';
        }
        pendingAnswers.push(answer);
      }

      await apiRequest('/submit/complete', {
        method: 'POST',
        body: jsonBody({ responseId, answers: pendingAnswers }),
      });
      sessionStorage.removeItem(draftStorageKey);
      navigate(`/results/${responseId}`, { replace: true });
    } catch (requestError) {
      finishStarted.current = false;
      setError(requestError.message);
      setSubmitting(false);
    }
  }, [draftAnswers, draftStorageKey, navigate, questions, responseId, savedAnswers]);

  useEffect(() => {
    if (!startedAt || !quiz) return undefined;
    const durationSeconds = attemptDurationSeconds || (Number(quiz.quizDuration) || 20) * 60;
    const update = () => {
      const remaining = Math.max(0, sharedDeadline
        ? Math.ceil((new Date(sharedDeadline).getTime() - (Date.now() + serverClockOffset)) / 1000)
        : durationSeconds - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !deadlineTriggered.current) {
        deadlineTriggered.current = true;
        finishAttempt();
      }
    };
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAt, quiz, attemptDurationSeconds, sharedDeadline, serverClockOffset, finishAttempt]);

  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (loading) return <LoadingState label="Restoring your quiz attempt..." />;

  if (error && !questions.length) {
    return (
      <PageFrame eyebrow="Quiz attempt" title="Unable to open this attempt">
        <Notice>{error}</Notice>
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#063b49] px-4 text-sm font-semibold text-white" to="/quizzes">Back to quizzes</Link>
      </PageFrame>
    );
  }

  if (questions.length === 0) {
    return <PageFrame eyebrow="Quiz attempt" title="No questions available"><Notice>This quiz currently has no questions.</Notice></PageFrame>;
  }

  return (
    <PageFrame
      eyebrow={isBattleAttempt ? `Battle quiz · ${quiz?.title || ''}` : quiz?.title || 'Quiz attempt'}
      title="Your challenge"
      description="All questions are shown below. Your answers are saved when you submit the quiz."
    >
      {isBattleAttempt && (
        <div className="sticky top-16 z-30 mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur sm:top-20 sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Shared battle timer</p>
            <p className="mt-0.5 text-xs text-slate-600">The same deadline applies to every player.</p>
          </div>
          <p aria-label={`Time remaining ${secondsLeft === null ? 'loading' : formatTime(secondsLeft)}`} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold ${secondsLeft !== null && secondsLeft < 60 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
            <Clock3 className="h-4 w-4" /> {secondsLeft === null ? '--:--' : formatTime(secondsLeft)}
          </p>
        </div>
      )}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
        <section className="min-w-0 space-y-4">
          {error && <Notice>{error}</Notice>}
          {questions.map((question, index) => {
            const answer = draftAnswers[question._id] || {};
            const isSaved = answeredIds.has(question._id);
            const isChoice = question.questionType === 'MCQ' || question.questionType === 'IMAGE';
            return (
              <article key={question._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Question {index + 1} of {questions.length}</p>
                    <h2 className="mt-2 break-words text-lg font-bold leading-7 text-[#063b49] sm:text-xl">{question.question}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{question.marks} marks</span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">{question.questionType.replace('_', ' ')}</p>
                {question.image && <img className="mt-4 max-h-72 w-full rounded-xl object-contain" src={question.image} alt="Question illustration" />}

                {isSaved && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">This answer was already saved to the attempt.</p>}

                {isChoice ? (
                  <div className="mt-4 space-y-2">
                    {(question.options || []).map((option, optionIndex) => (
                      <label key={`${question._id}-${optionIndex}`} className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 text-sm transition ${Number(answer.selectedOption) === optionIndex && answer.selectedOption !== '' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'} ${isSaved ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                        <input type="radio" name={`answer-${question._id}`} value={optionIndex} checked={answer.selectedOption === String(optionIndex)} disabled={isSaved || submitting} onChange={(event) => updateAnswer(question._id, 'selectedOption', event.target.value)} className="mt-0.5 accent-emerald-600" />
                        <span className="min-w-0 break-words">{option.text || option}</span>
                      </label>
                    ))}
                  </div>
                ) : question.questionType === 'TRUE_FALSE' ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {['true', 'false'].map((option) => (
                      <label key={`${question._id}-${option}`} className={`flex min-h-12 items-center gap-3 rounded-xl border p-4 capitalize ${answer.trueFalseAnswer === option ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'} ${isSaved ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                        <input type="radio" name={`answer-${question._id}`} value={option} checked={answer.trueFalseAnswer === option} disabled={isSaved || submitting} onChange={(event) => updateAnswer(question._id, 'trueFalseAnswer', event.target.value)} className="accent-emerald-600" />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : question.questionType === 'FILL' ? (
                  <input value={answer.fillBlankAnswer || ''} disabled={isSaved || submitting} onChange={(event) => updateAnswer(question._id, 'fillBlankAnswer', event.target.value)} placeholder="Type your answer..." className="mt-4 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50" />
                ) : (
                  <div className="mt-4 space-y-3">
                    {question.questionType === 'CODING' && (
                      <>
                        {question.coding?.constraints?.length > 0 && <ul className="list-inside list-disc rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{question.coding.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>}
                        <p className="text-xs font-medium text-slate-500">Language: {question.coding?.language || 'Not specified'}</p>
                      </>
                    )}
                    <textarea
                      value={question.questionType === 'CODING' ? answer.codingAnswer || '' : answer.longAnswer || ''}
                      disabled={isSaved || submitting}
                      onChange={(event) => updateAnswer(question._id, question.questionType === 'CODING' ? 'codingAnswer' : 'longAnswer', event.target.value)}
                      rows={question.questionType === 'CODING' ? 12 : 6}
                      spellCheck={question.questionType !== 'CODING'}
                      placeholder={question.questionType === 'CODING' ? question.coding?.starterCode || 'Write your solution here...' : 'Type your answer...'}
                      className={`w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50 ${question.questionType === 'CODING' ? 'min-h-64 bg-slate-950 font-mono text-emerald-100' : 'bg-white text-slate-800'}`}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-[#063b49]">Quiz progress</h2>
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${secondsLeft !== null && secondsLeft < 60 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
              <Clock3 className="h-4 w-4" /> {secondsLeft === null ? '--:--' : formatTime(secondsLeft)}
            </p>
          </div>
          <p className="mt-3 text-sm text-slate-600">{answeredCount} of {questions.length} questions answered</p>
          {isBattleAttempt && <p className="mt-2 text-xs leading-5 text-slate-500">This is the shared battle countdown. All players in the room see the same deadline.</p>}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
          <button type="button" onClick={() => setShowFinish(true)} disabled={submitting} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#063b49] px-4 text-sm font-bold text-white disabled:opacity-60">
            {submitting ? 'Submitting answers...' : 'Submit quiz and see result'} {!submitting && <Send className="h-4 w-4" />}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">You can leave questions blank. Your result appears after the quiz is submitted.</p>
        </aside>
      </div>

      {showFinish && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="finish-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h2 id="finish-title" className="text-lg font-bold text-[#063b49]">Submit this quiz?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">You have answered {answeredCount} of {questions.length} questions. Unanswered questions will be counted in your result.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowFinish(false)} disabled={submitting} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Keep working</button>
              <button type="button" disabled={submitting} onClick={finishAttempt} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit and see result'}</button>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
};

export default QuizAttempt;
