import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Crown, LoaderCircle, Sparkles, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, jsonBody } from '../../lib/api';
import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

const idOf = (entity) => (typeof entity === 'string' ? entity : entity?._id);

const initialAiQuiz = {
  title: '',
  description: '',
  category: 'Programming',
  topic: '',
  difficulty: 'Easy',
  questionCount: '5',
  questionTypes: ['MCQ'],
};

const BattleRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [question, setQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [battleWinner, setBattleWinner] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  const [aiQuiz, setAiQuiz] = useState(initialAiQuiz);
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isHost = idOf(room?.host) === user?._id;
  const currentPlayer = room?.players?.find((player) => idOf(player.user) === user?._id);
  const currentQuestion = question?.question;
  const playerAnswers = room?.players || [];
  const myBattleResult = leaderboard.find((player) => idOf(player.user) === user?._id);
  const myRank = leaderboard.findIndex((player) => idOf(player.user) === user?._id) + 1;
  const didWin = myBattleResult && idOf(battleWinner) === user?._id;

  useEffect(() => {
    if (!showAiQuizModal) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) setShowAiQuizModal(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showAiQuizModal, busy]);

  const loadRoom = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const roomData = await apiRequest(`/room/${roomId}`);
      setRoom(roomData);

      if (roomData.status === 'Started') {
        if (roomData.myResponseId && roomData.quiz) {
          navigate(`/quiz/${idOf(roomData.quiz)}/attempt/${roomData.myResponseId}`, {
            replace: true,
            state: { roomId },
          });
          return;
        }
        const current = await apiRequest(`/room/${roomId}/current-question`);
        setQuestion(current);
        setSelectedQuiz(idOf(roomData.quiz) || '');
      } else {
        setQuestion(null);
      }

      if (roomData.status === 'Completed') {
        const data = await apiRequest(`/room/${roomId}/leaderboard`);
        setLeaderboard(data.leaderboard || []);
        setBattleWinner(data.winner || roomData.winner || null);
      }
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [navigate, roomId]);

  useEffect(() => {
    loadRoom(true);
    const timer = window.setInterval(() => loadRoom(false), 4000);
    return () => window.clearInterval(timer);
  }, [loadRoom, pollKey]);

  useEffect(() => {
    let active = true;
    apiRequest('/quiz/list')
      .then((data) => { if (active) setQuizzes(data.quizzes || []); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const runAction = async (path, successText, method = 'PUT', body = {}) => {
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiRequest(path, { method, body: jsonBody(body) });
      setSuccessMessage(successText);
      await loadRoom(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const generateBattleQuiz = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMessage('');

    try {
      const generated = await apiRequest('/quiz/generate-ai', {
        method: 'POST',
        body: jsonBody({
          ...aiQuiz,
          questionCount: Number(aiQuiz.questionCount),
          questionTime: 30,
        }),
      });
      const quiz = generated.quiz;
      if (!quiz?._id) {
        throw new Error(generated.message || 'The server did not return the generated quiz.');
      }

      await apiRequest(`/room/${roomId}/select-quiz`, {
        method: 'PUT',
        body: jsonBody({ quizId: quiz._id }),
      });
      setQuizzes((items) => [quiz, ...items.filter((item) => item._id !== quiz._id)]);
      setSelectedQuiz(quiz._id);
      await loadRoom(false);
      setAiQuiz(initialAiQuiz);
      setShowAiQuizModal(false);
      setSuccessMessage('Your AI quiz is ready and selected for this battle.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAiQuestionType = (type) => {
    setAiQuiz((form) => ({
      ...form,
      questionTypes: form.questionTypes.includes(type)
        ? form.questionTypes.filter((item) => item !== type)
        : [...form.questionTypes, type],
    }));
  };

  const leaveRoom = async () => {
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiRequest(`/room/${roomId}/leave`, { method: 'DELETE' });
      navigate('/battle', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  };

  const sendAnswer = async (event) => {
    event.preventDefault();
    if (!currentQuestion || submitted) return;
    const body = { roomId, questionId: currentQuestion._id };
    if (currentQuestion.questionType === 'MCQ' || currentQuestion.questionType === 'IMAGE') {
      if (answer === '') return setError('Select an answer first.');
      body.selectedOption = Number(answer);
    } else if (currentQuestion.questionType === 'TRUE_FALSE') {
      if (answer === '') return setError('Select true or false first.');
      body.trueFalseAnswer = answer === 'true';
    } else if (currentQuestion.questionType === 'FILL') {
      if (!answer.trim()) return setError('Enter your answer first.');
      body.fillBlankAnswer = answer.trim();
    } else if (currentQuestion.questionType === 'LONG') {
      if (!answer.trim()) return setError('Enter your response first.');
      body.longAnswer = answer.trim();
    } else {
      if (!answer.trim()) return setError('Enter your code first.');
      body.codingAnswer = answer;
      body.codingLanguage = currentQuestion.coding?.language || '';
    }
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiRequest('/room/submit-answer', { method: 'POST', body: jsonBody(body) });
      sessionStorage.setItem(`battle-submitted-${roomId}-${currentQuestion._id}`, 'true');
      setSubmitted(true);
      setAnswer('');
      setPollKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const choices = useMemo(
    () => (currentQuestion?.options || []).map((option) => option.text || option),
    [currentQuestion],
  );

  useEffect(() => {
    setAnswer('');
    const submittedKey = `battle-submitted-${roomId}-${currentQuestion?._id}`;
    setSubmitted(Boolean(currentQuestion?._id && sessionStorage.getItem(submittedKey)));
  }, [roomId, currentQuestion?._id, question?.questionNumber]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room?.roomCode || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy the room code. Select and copy it manually.');
    }
  };

  if (loading) return <LoadingState label="Joining battle room..." />;

  return (
    <PageFrame eyebrow="Battle room" title={room?.roomName || 'Battle room'} description="Room updates refresh automatically every few seconds.">
      {error && !showAiQuizModal && <div className="mb-5"><Notice>{error}</Notice></div>}
      {successMessage && <div className="mb-5"><Notice tone="success">{successMessage}</Notice></div>}
      {!room && !error && <Notice>Room data is unavailable.</Notice>}
      {room && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invite code</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-[#063b49]">{room.roomCode}</span>
                <button type="button" onClick={copyCode} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100" aria-label="Copy room code">
                  {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{room.status}</span>
          </div>

          {room.status === 'Waiting' && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#063b49]">Players</h2>
                  <span className="inline-flex items-center gap-1 text-sm text-slate-500"><Users className="h-4 w-4" /> {room.players?.length || 0}/{room.maxPlayers}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {playerAnswers.map((player, index) => (
                    <div key={idOf(player.user) || index} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {(player.isHost || idOf(player.user) === idOf(room.host)) && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
                        <span className="truncate text-sm font-semibold text-slate-800">{player.user?.name || (idOf(player.user) === user?._id ? user.name : 'Player')}</span>
                        {idOf(player.user) === user?._id && <span className="text-xs text-slate-500">(you)</span>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${player.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{player.isReady ? 'Ready' : 'Not ready'}</span>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="font-bold text-[#063b49]">Room setup</h2>
                <p className="mt-2 text-sm text-slate-600">{isHost ? 'As host, select a quiz and start once all players are ready.' : 'Mark yourself ready while the host chooses a quiz.'}</p>
                {isHost && (
                  <div className="mt-5 space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Published quiz
                      <select value={selectedQuiz || idOf(room.quiz) || ''} onChange={(event) => setSelectedQuiz(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                        <option value="">Choose a quiz</option>
                        {quizzes.map((quiz) => <option key={quiz._id} value={quiz._id}>{quiz.title}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => { setError(''); setSuccessMessage(''); setShowAiQuizModal(true); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100">
                      <Sparkles className="h-4 w-4" /> Create quiz with AI
                    </button>
                  </div>
                )}
                <div className="mt-5 flex flex-col gap-2">
                  {isHost && (
                    <button type="button" disabled={busy || !selectedQuiz} onClick={() => runAction(`/room/${roomId}/select-quiz`, 'Quiz selected for this battle.', 'PUT', { quizId: selectedQuiz })} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
                      {busy ? 'Saving...' : 'Select quiz'}
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => runAction(`/room/${roomId}/ready`, currentPlayer?.isReady ? 'You are marked as not ready.' : 'You are ready for the battle.')} className="min-h-11 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50">
                    {currentPlayer?.isReady ? 'Mark not ready' : 'I’m ready'}
                  </button>
                  {isHost && (
                    <button type="button" disabled={busy || !room.quiz} onClick={() => runAction(`/room/${roomId}/start`, 'The battle has started.')} className="min-h-11 rounded-xl bg-[#063b49] px-3 text-sm font-bold text-white disabled:opacity-50">
                      Start battle
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={leaveRoom} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Leave room</button>
                </div>
              </aside>
            </div>
          )}

          {room.status === 'Started' && currentQuestion && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-7">
                <p className="text-sm font-semibold text-slate-500">Question {question.questionNumber} of {question.totalQuestions}</p>
                <h2 className="mt-4 break-words text-lg font-bold leading-7 text-[#063b49] sm:text-xl">{currentQuestion.question}</h2>
                {currentQuestion.image && <img src={currentQuestion.image} alt="Question illustration" className="mt-4 max-h-64 w-full rounded-xl object-contain" />}
                {submitted ? (
                  <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">Your answer is in. Wait for the host to move to the next question.</div>
                ) : (
                  <form onSubmit={sendAnswer} className="mt-6">
                    {(currentQuestion.questionType === 'MCQ' || currentQuestion.questionType === 'IMAGE') ? (
                      <div className="space-y-3">
                        {choices.map((option, index) => <label key={index} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${answer === String(index) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}><input type="radio" name="battle-answer" value={index} checked={answer === String(index)} onChange={(event) => setAnswer(event.target.value)} className="mt-0.5 accent-emerald-600" /><span className="break-words">{option}</span></label>)}
                      </div>
                    ) : currentQuestion.questionType === 'TRUE_FALSE' ? (
                      <div className="grid gap-3 sm:grid-cols-2">{['true', 'false'].map((option) => <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" name="battle-answer" value={option} checked={answer === option} onChange={(event) => setAnswer(event.target.value)} className="accent-emerald-600" />{option}</label>)}</div>
                    ) : (
                      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={currentQuestion.questionType === 'CODING' ? 12 : 6} placeholder={currentQuestion.coding?.starterCode || 'Enter your response'} className={`w-full rounded-xl border border-slate-200 p-3 text-sm ${currentQuestion.questionType === 'CODING' ? 'bg-slate-950 font-mono text-emerald-100' : ''}`} />
                    )}
                    <button disabled={busy} className="mt-5 min-h-11 w-full rounded-xl bg-[#063b49] px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Submitting...' : 'Submit answer'}</button>
                  </form>
                )}
              </section>
              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-[#063b49]">Battle status</h2>
                <p className="mt-2 text-sm text-slate-600">Answers are scored by the existing battle service. Coding and written answers may be pending evaluation.</p>
                <h3 className="mt-5 text-sm font-semibold text-slate-700">Scores</h3>
                <ol className="mt-2 space-y-2">
                  {[...playerAnswers].sort((a, b) => (b.score || 0) - (a.score || 0)).map((player, index) => <li key={idOf(player.user) || index} className="flex justify-between gap-3 text-sm"><span className="truncate">{player.user?.name || 'Player'}</span><span className="font-bold">{player.score || 0}</span></li>)}
                </ol>
                {isHost && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const isLastQuestion = question.questionNumber >= question.totalQuestions;
                      return runAction(
                        isLastQuestion ? `/room/${roomId}/end` : `/room/${roomId}/next-question`,
                        isLastQuestion ? 'Battle ended. Here is the final leaderboard.' : 'The next question is ready.',
                      );
                    }}
                    className="mt-5 min-h-11 w-full rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {question.questionNumber >= question.totalQuestions ? 'End battle & view results' : 'Next question'}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={leaveRoom} className="mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Leave battle</button>
              </aside>
            </div>
          )}

          {room.status === 'Completed' && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="rounded-2xl bg-gradient-to-br from-[#063b49] to-emerald-800 p-5 text-white sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Your battle result</p>
                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  {didWin ? 'You won!' : myBattleResult ? 'Battle complete' : 'Result unavailable'}
                </h2>
                {myBattleResult ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/10 p-4">
                      <p className="text-xs font-medium text-white/70">Your score</p>
                      <p className="mt-1 text-2xl font-extrabold">{myBattleResult.score || 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-4">
                      <p className="text-xs font-medium text-white/70">Final position</p>
                      <p className="mt-1 text-2xl font-extrabold">#{myRank}</p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-white/10 p-4 sm:col-span-1">
                      <p className="text-xs font-medium text-white/70">Players</p>
                      <p className="mt-1 text-2xl font-extrabold">{leaderboard.length}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/80">Your account was not found in this battle’s final results.</p>
                )}
              </div>

              <h3 className="mt-7 text-lg font-bold text-[#063b49]">Final leaderboard</h3>
              <ol className="mt-4 space-y-3">
                {leaderboard.map((player, index) => {
                  const isCurrentUser = idOf(player.user) === user?._id;
                  const isWinner = idOf(player.user) === idOf(battleWinner);
                  return (
                    <li key={idOf(player.user) || index} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${isCurrentUser ? 'border-emerald-300 bg-emerald-50' : 'border-transparent bg-slate-50'}`}>
                      <span className="min-w-0 truncate font-semibold text-slate-800">
                        #{index + 1} {isCurrentUser ? `${player.user?.name || user?.name || 'Player'} (you)` : player.user?.name || 'Player'}
                        {isWinner && <span className="ml-2 text-amber-700">(winner)</span>}
                      </span>
                      <span className="shrink-0 font-bold text-[#063b49]">{player.score || 0}</span>
                    </li>
                  );
                })}
              </ol>
              <Link to="/battle" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#063b49] px-4 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> Battle lobby</Link>
            </section>
          )}

          {room.status === 'Started' && !currentQuestion && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Waiting for the current question...</div>
          )}

          {showAiQuizModal && isHost && room.status === 'Waiting' && (
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) setShowAiQuizModal(false);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="ai-quiz-title"
                className="my-auto flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
              >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h2 id="ai-quiz-title" className="text-lg font-bold text-[#063b49] sm:text-xl">Create a battle quiz with AI</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">The quiz will be added to the library and selected for this room.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowAiQuizModal(false)} disabled={busy} aria-label="Close AI quiz form" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
                </header>

                <form onSubmit={generateBattleQuiz} className="min-h-0 overflow-y-auto">
                  <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
                    {error && <Notice>{error}</Notice>}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-slate-700">Quiz title
                        <input required maxLength={120} value={aiQuiz.title} onChange={(event) => setAiQuiz((form) => ({ ...form, title: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">Topic
                        <input required value={aiQuiz.topic} onChange={(event) => setAiQuiz((form) => ({ ...form, topic: event.target.value }))} placeholder="e.g. JavaScript arrays" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">Category
                        <select value={aiQuiz.category} onChange={(event) => setAiQuiz((form) => ({ ...form, category: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                          {['Programming', 'Database', 'Web Development', 'AI & ML', 'Networking', 'Operating System', 'Aptitude', 'General Knowledge', 'Others'].map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">Difficulty
                        <select value={aiQuiz.difficulty} onChange={(event) => setAiQuiz((form) => ({ ...form, difficulty: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                          {['Easy', 'Medium', 'Hard'].map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">Number of questions
                        <input type="number" min="1" max="30" required value={aiQuiz.questionCount} onChange={(event) => setAiQuiz((form) => ({ ...form, questionCount: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
                        <input value={aiQuiz.description} onChange={(event) => setAiQuiz((form) => ({ ...form, description: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
                      </label>
                    </div>
                    <fieldset>
                      <legend className="text-sm font-semibold text-slate-700">Question types</legend>
                      <p className="mt-1 text-xs text-slate-500">Choose one or more types for the battle.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {['MCQ', 'TRUE_FALSE', 'FILL'].map((type) => (
                          <label key={type} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700">
                            <input type="checkbox" checked={aiQuiz.questionTypes.includes(type)} onChange={() => toggleAiQuestionType(type)} className="accent-violet-700" />
                            {type.replace('_', ' ')}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  <footer className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                    <button type="button" onClick={() => setShowAiQuizModal(false)} disabled={busy} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={busy || aiQuiz.questionTypes.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white disabled:opacity-50">
                      {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Creating quiz...</> : <><Sparkles className="h-4 w-4" /> Generate and select quiz</>}
                    </button>
                  </footer>
                </form>
              </section>
            </div>
          )}
        </>
      )}
    </PageFrame>
  );
};

export default BattleRoom;
