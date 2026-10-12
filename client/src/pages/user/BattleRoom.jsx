

import { useCallback, useEffect, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';

import {

  ArrowLeft,

  Check,

  Copy,

  Crown,

  LoaderCircle,

  Sparkles,

  Users,

  X,

} from 'lucide-react';



import { useAuth } from '../../context/AuthContext';

import { apiRequest, jsonBody } from '../../lib/api';

import { LoadingState, Notice, PageFrame } from '../../components/PageFrame';

import socket from '../../socket';



const idOf = (entity) =>

  typeof entity === 'string' ? entity : entity?._id;



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

  const [answers, setAnswers] = useState({});

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [copied, setCopied] = useState(false);

  const [aiQuiz, setAiQuiz] = useState(initialAiQuiz);

  const [showAiQuizModal, setShowAiQuizModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');

  const [timeLeft, setTimeLeft] = useState(null);

  const [serverClockOffset, setServerClockOffset] = useState(0);



  const currentUser = user?.user || user;



  // Support populated user objects and plain MongoDB IDs.

  const isHost =

    Boolean(room && currentUser?._id) &&

    String(idOf(room.host)) === String(currentUser._id);



  const currentPlayer = room?.players?.find(

    (player) =>

      String(idOf(player.user)) === String(currentUser?._id),

  );



  const questions = question?.questions || [];

  const playerAnswers = room?.players || [];



  const activePlayers = playerAnswers.filter(

    (player) => !player.isRemoved,

  );



  const activePlayerCount = activePlayers.length;



  const myBattleResult = leaderboard.find(

    (player) =>

      String(idOf(player.user)) === String(currentUser?._id),

  );



  const myRank =

    leaderboard.findIndex(

      (player) =>

        String(idOf(player.user)) === String(currentUser?._id),

    ) + 1;



  const didWin =

    Boolean(myBattleResult) &&

    String(idOf(battleWinner)) === String(currentUser?._id);



  // Load room data and normalize the possible API response formats.

  const loadRoom = useCallback(

    async (showLoading = false) => {

      if (showLoading) setLoading(true);



      try {

        const response = await apiRequest(`/room/${roomId}`);



        const roomData =

          response?.room ??

          response?.data?.room ??

          response?.data ??

          response;



        if (!roomData?._id) {

          throw new Error(

            'Room details could not be loaded. Check the GET /room/:roomId response.',

          );

        }



        setRoom(roomData);

        setSelectedQuiz(idOf(roomData.quiz) || '');



        if (roomData.status === 'Started') {

          const battleQuestions = await apiRequest(

            `/room/${roomId}/questions`,

          );

          setQuestion(battleQuestions);

          setHasSubmitted(Boolean(battleQuestions.submitted));

          setTimeLeft(Number(battleQuestions.remainingTime));

          setServerClockOffset(

            Number(battleQuestions.serverTime) - Date.now(),

          );

        } else {

          setQuestion(null);

          setTimeLeft(null);

          setHasSubmitted(false);

        }



        if (roomData.status === 'Completed') {

          const result = await apiRequest(

            `/room/${roomId}/leaderboard`,

          );



          setLeaderboard(result?.leaderboard || []);

          setBattleWinner(

            result?.winner || roomData.winner || null,

          );

        }



        setError('');

      } catch (requestError) {

        setError(

          requestError?.message || 'Unable to load the battle room.',

        );

      } finally {

        if (showLoading) setLoading(false);

      }

    },

    [roomId],

  );



  useEffect(() => {

    if (room?.status !== 'Started' || !room.quizEndTime) return undefined;



    const updateCountdown = () => {

      const remaining = Math.max(

        0,

        Math.ceil(

          (new Date(room.quizEndTime).getTime() -

            (Date.now() + serverClockOffset)) /

          1000,

        ),

      );

      setTimeLeft(remaining);

    };



    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);

  }, [room?.quizEndTime, room?.status, serverClockOffset]);



  useEffect(() => {

    loadRoom(true);



    const interval = window.setInterval(

      () => loadRoom(false),

      4000,

    );



    return () => window.clearInterval(interval);

  }, [loadRoom]);



  // Socket.IO live room and timer updates.

  useEffect(() => {

    const token = localStorage.getItem('token');



    if (!token || !room?.roomCode) return undefined;



    socket.auth = { token };



    const joinRoom = () => {

      socket.emit('join-room', {

        roomCode: room.roomCode,

      });

    };



    const refreshRoom = () => {

      loadRoom(false);

    };



    const handleTimer = ({ timeLeft: remaining } = {}) => {

      const value = Number(remaining);



      if (Number.isFinite(value)) {

        setTimeLeft(Math.max(0, value));

      }

    };



    if (!socket.connected) socket.connect();



    socket.on('connect', joinRoom);

    socket.on('room-updated', refreshRoom);

    socket.on('battle-started', refreshRoom);

    socket.on('next-question', refreshRoom);

    socket.on('timer', handleTimer);

    socket.on('timer-ended', refreshRoom);

    socket.on('leaderboard-updated', refreshRoom);

    socket.on('battle-ended', refreshRoom);



    if (socket.connected) joinRoom();



    return () => {

      socket.off('connect', joinRoom);

      socket.off('room-updated', refreshRoom);

      socket.off('battle-started', refreshRoom);

      socket.off('next-question', refreshRoom);

      socket.off('timer', handleTimer);

      socket.off('timer-ended', refreshRoom);

      socket.off('leaderboard-updated', refreshRoom);

      socket.off('battle-ended', refreshRoom);

    };

  }, [room?.roomCode, loadRoom]);



  // Load published quizzes.

  useEffect(() => {

    let active = true;



    apiRequest('/quiz/list')

      .then((data) => {

        if (active) setQuizzes(data?.quizzes || []);

      })

      .catch((requestError) => {

        if (active) {

          setError(

            requestError?.message || 'Unable to load quizzes.',

          );

        }

      });



    return () => {

      active = false;

    };

  }, []);



  const runAction = async (

    path,

    successText,

    method = 'PUT',

    body = {},

  ) => {

    setBusy(true);

    setError('');

    setSuccessMessage('');



    try {

      await apiRequest(path, {

        method,

        body: jsonBody(body),

      });



      setSuccessMessage(successText);

      await loadRoom(false);

    } catch (requestError) {

      setError(

        requestError?.message || 'The requested action failed.',

      );

    } finally {

      setBusy(false);

    }

  };



  // Start battle: host, two or more active players, selected quiz.

  const handleStartBattle = async () => {

    if (!room || !isHost || busy) return;



    const playersNow = (room.players || []).filter(

      (player) => !player.isRemoved,

    );



    if (playersNow.length < 2) {

      setError(

        'At least two players are required to start the battle.',

      );

      return;

    }



    const quizId = idOf(room.quiz) || selectedQuiz;



    if (!quizId) {

      setError('Please select a quiz before starting the battle.');

      return;

    }



    if (room.status !== 'Waiting') {

      setError('This room is no longer waiting to start.');

      return;

    }



    const maxPlayers = Number(room.maxPlayers || 0);

    const roomIsFull =

      maxPlayers > 0 && playersNow.length >= maxPlayers;



    if (!roomIsFull) {

      const confirmed = window.confirm(

        `Only ${playersNow.length} of ${maxPlayers || '?'} players have joined. Start the battle now?`,

      );



      if (!confirmed) return;

    }



    await runAction(

      `/room/${roomId}/start`,

      'The battle has started.',

    );

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



      const quiz = generated?.quiz;



      if (!quiz?._id) {

        throw new Error(

          generated?.message ||

          'The server did not return the generated quiz.',

        );

      }



      await apiRequest(`/room/${roomId}/select-quiz`, {

        method: 'PUT',

        body: jsonBody({ quizId: quiz._id }),

      });



      setQuizzes((items) => [

        quiz,

        ...items.filter((item) => item._id !== quiz._id),

      ]);



      setSelectedQuiz(quiz._id);

      await loadRoom(false);



      setAiQuiz(initialAiQuiz);

      setShowAiQuizModal(false);

      setSuccessMessage(

        'Your AI quiz is ready and selected for this battle.',

      );

    } catch (requestError) {

      setError(

        requestError?.message || 'Unable to generate the AI quiz.',

      );

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

      await apiRequest(`/room/${roomId}/leave`, {

        method: 'DELETE',

      });



      navigate('/battle', { replace: true });

    } catch (requestError) {

      setError(

        requestError?.message || 'Unable to leave this room.',

      );

      setBusy(false);

    }

  };



  const submitAttempt = async (event) => {

    event.preventDefault();



    if (!questions.length || hasSubmitted || busy || timeLeft === 0) return;



    const answerPayload = questions.map((item) => {

      const value = answers[item._id] ?? '';

      const payload = { questionId: item._id };



      if (item.questionType === 'MCQ' || item.questionType === 'IMAGE') {

        payload.selectedOption = value === '' ? null : Number(value);

      } else if (item.questionType === 'TRUE_FALSE') {

        payload.trueFalseAnswer = value === '' ? null : value === 'true';

      } else if (item.questionType === 'FILL') {

        payload.fillBlankAnswer = value.trim();

      } else if (item.questionType === 'LONG') {

        payload.longAnswer = value.trim();

      } else {

        payload.codingAnswer = value;

        payload.codingLanguage = item.coding?.language || '';

      }



      return payload;

    });



    setBusy(true);

    setError('');

    setSuccessMessage('');



    try {

      const result = await apiRequest('/room/submit-attempt', {

        method: 'POST',

        body: jsonBody({ roomId, answers: answerPayload }),

      });



      setHasSubmitted(true);

      setSuccessMessage(

        result.message || 'Answers submitted. Waiting for the other players.',

      );

      await loadRoom(false);

    } catch (requestError) {

      setError(

        requestError?.message || 'Unable to submit your answers.',

      );

    } finally {

      setBusy(false);

    }

  };



  const copyCode = async () => {

    try {

      await navigator.clipboard.writeText(room?.roomCode || '');

      setCopied(true);

      window.setTimeout(() => setCopied(false), 1600);

    } catch {

      setError(

        'Could not copy the room code. Select and copy it manually.',

      );

    }

  };



  if (loading) {

    return <LoadingState label="Joining battle room..." />;

  }



  return (

    <PageFrame

      eyebrow="Battle room"

      title={room?.roomName || 'Battle room'}

      description="Play together with live room, timer, and leaderboard updates."

    >

      {error && !showAiQuizModal && (

        <div className="mb-5">

          <Notice>{error}</Notice>

        </div>

      )}



      {successMessage && (

        <div className="mb-5">

          <Notice tone="success">{successMessage}</Notice>

        </div>

      )}



      {!room && !error && (

        <Notice>Room data is unavailable.</Notice>

      )}



      {room && (

        <>

          {/* Invite code */}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-4 sm:p-5">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">

                Invite code

              </p>



              <div className="mt-1 flex items-center gap-2">

                <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-[#101b45]">

                  {room.roomCode || 'Unavailable'}

                </span>



                <button

                  type="button"

                  onClick={copyCode}

                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"

                  aria-label="Copy room code"

                >

                  {copied ? (

                    <Check className="h-4 w-4 text-emerald-700" />

                  ) : (

                    <Copy className="h-4 w-4" />

                  )}

                  {copied ? 'Copied' : 'Copy'}

                </button>

              </div>

            </div>



            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">

              {room.status}

            </span>

          </div>



          {/* Waiting room */}

          {room.status === 'Waiting' && (

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">

              <section className="rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-5 sm:p-7">

                <div className="flex items-center justify-between gap-3">

                  <h2 className="text-lg font-bold text-[#101b45]">

                    Players

                  </h2>



                  <span className="inline-flex items-center gap-1 text-sm text-slate-500">

                    <Users className="h-4 w-4" />

                    {activePlayerCount}/{room.maxPlayers}

                  </span>

                </div>



                <div className="mt-4 space-y-2">

                  {playerAnswers.map((player, index) => (

                    <div

                      key={idOf(player.user) || index}

                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-indigo-50/50 px-4 py-3"

                    >

                      <div className="flex min-w-0 items-center gap-2">

                        {(player.isHost ||

                          String(idOf(player.user)) ===

                          String(idOf(room.host))) && (

                            <Crown className="h-4 w-4 shrink-0 text-amber-500" />

                          )}



                        <span className="truncate text-sm font-semibold text-slate-800">

                          {player.user?.name ||

                            (String(idOf(player.user)) ===

                              String(currentUser?._id)

                              ? currentUser?.name

                              : 'Player')}

                        </span>



                        {String(idOf(player.user)) ===

                          String(currentUser?._id) && (

                            <span className="text-xs text-slate-500">

                              (you)

                            </span>

                          )}

                      </div>



                      <span

                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${player.isReady

                            ? 'bg-emerald-100 text-emerald-800'

                            : 'bg-slate-200 text-slate-600'

                          }`}

                      >

                        {player.isReady ? 'Ready' : 'Not ready'}

                      </span>

                    </div>

                  ))}



                  {activePlayerCount < 2 && (

                    <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">

                      Share the invite code and wait for at least one more player to join.

                    </p>

                  )}

                </div>

              </section>



              <aside className="h-fit rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-5 sm:p-6">

                <h2 className="font-bold text-[#101b45]">

                  Room setup

                </h2>



                <p className="mt-2 text-sm text-slate-600">

                  {isHost

                    ? 'As host, select a quiz and start when at least two players have joined.'

                    : 'Mark yourself ready while the host chooses a quiz.'}

                </p>



                {isHost && (

                  <div className="mt-5 space-y-3">

                    <label className="block text-sm font-semibold text-slate-700">

                      Published quiz

                      <select

                        value={selectedQuiz || idOf(room.quiz) || ''}

                        onChange={(event) =>

                          setSelectedQuiz(event.target.value)

                        }

                        className="mt-2 h-11 w-full rounded-2xl border border-indigo-100 bg-white px-3 text-sm"

                      >

                        <option value="">Choose a quiz</option>

                        {quizzes.map((quiz) => (

                          <option key={quiz._id} value={quiz._id}>

                            {quiz.title}

                          </option>

                        ))}

                      </select>

                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {quizzes.map((quiz, index) => {
                        const pastelHeaders = [
                          'from-violet-100 to-fuchsia-100',
                          'from-sky-100 to-blue-100',
                          'from-emerald-100 to-teal-100',
                          'from-pink-100 to-rose-100',
                        ];
                        const isSelected = selectedQuiz === quiz._id || idOf(room.quiz) === quiz._id;
                        return (
                          <button
                            key={quiz._id}
                            type="button"
                            onClick={() => setSelectedQuiz(quiz._id)}
                            className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${isSelected ? 'border-violet-400 ring-2 ring-violet-200' : 'border-indigo-100'}`}
                          >
                            <div className={`flex h-16 items-end bg-gradient-to-r ${pastelHeaders[index % pastelHeaders.length]} p-3`}>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                                {quiz.category || 'Quiz'}
                              </span>
                            </div>
                            <div className="space-y-2 p-3">
                              <p className="line-clamp-1 text-sm font-bold text-slate-900">{quiz.title}</p>
                              <p className="line-clamp-2 min-h-8 text-xs leading-5 text-slate-500">{quiz.description || 'Test your knowledge and challenge your friends.'}</p>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500">{quiz.questions?.length || quiz.questionCount || '—'} questions</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isSelected ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {isSelected ? 'Selected' : 'Choose'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>



                    <button

                      type="button"

                      onClick={() => {

                        setError('');

                        setSuccessMessage('');

                        setShowAiQuizModal(true);

                      }}

                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"

                    >

                      <Sparkles className="h-4 w-4" />

                      Create quiz with AI

                    </button>

                  </div>

                )}



                <div className="mt-5 flex flex-col gap-2">

                  {isHost && (

                    <button

                      type="button"

                      disabled={busy || !selectedQuiz}

                      onClick={() =>

                        runAction(

                          `/room/${roomId}/select-quiz`,

                          'Quiz selected for this battle.',

                          'PUT',

                          { quizId: selectedQuiz },

                        )

                      }

                      className="min-h-11 rounded-2xl border border-indigo-100 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"

                    >

                      {busy ? 'Saving...' : 'Select quiz'}

                    </button>

                  )}



                  <button

                    type="button"

                    disabled={busy}

                    onClick={() =>

                      runAction(

                        `/room/${roomId}/ready`,

                        currentPlayer?.isReady

                          ? 'You are marked as not ready.'

                          : 'You are ready for the battle.',

                      )

                    }

                    className="min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-sm font-bold text-white disabled:opacity-50"

                  >

                    {currentPlayer?.isReady

                      ? 'Mark not ready'

                      : 'I’m ready'}

                  </button>



                  {/* Start button is visible only to the host. */}

                  {isHost && (

                    <button

                      type="button"

                      disabled={

                        busy ||

                        activePlayerCount < 2 ||

                        (!idOf(room.quiz) && !selectedQuiz) ||

                        room.status !== 'Waiting'

                      }

                      onClick={handleStartBattle}

                      className="min-h-11 rounded-xl bg-[#172554] px-3 text-sm font-bold text-white transition hover:bg-[#312e81] disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      {busy ? 'Starting...' : 'Start battle'}

                    </button>

                  )}



                  {!isHost && (

                    <p className="rounded-lg bg-indigo-50/50 p-3 text-xs text-slate-500">

                      Only the room host can start the battle.

                    </p>

                  )}



                  <button

                    type="button"

                    disabled={busy}

                    onClick={leaveRoom}

                    className="min-h-11 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"

                  >

                    Leave room

                  </button>

                </div>

              </aside>

            </div>

          )}



          {/* Active battle */}

          {room.status === 'Started' && questions.length > 0 && (

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">

              <section className="min-w-0 rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-4 sm:p-7">

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <h2 className="text-lg font-bold text-[#101b45]">

                      All battle questions

                    </h2>

                    <p className="mt-1 text-sm text-slate-500">

                      Answer what you can, then submit your attempt once.

                    </p>

                  </div>

                  <span className="rounded-full bg-[#e8fff7] px-3 py-1.5 text-xs font-bold text-[#008b5e]">

                    {questions.length} questions

                  </span>

                </div>



                {hasSubmitted ? (

                  <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">

                    Your answers are submitted. You’ll see the results when everyone finishes or time runs out.

                  </div>

                ) : timeLeft === 0 ? (

                  <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-900">

                    Time is up. The battle is being finalized.

                  </div>

                ) : (

                  <form onSubmit={submitAttempt} className="mt-6 space-y-5">

                    {questions.map((item, questionIndex) => {

                      const value = answers[item._id] ?? '';

                      const choices = (item.options || []).map(

                        (option) => option.text || option,

                      );



                      return (

                        <fieldset

                          key={item._id}

                          disabled={busy || timeLeft === 0}

                          className="rounded-2xl border border-slate-200 p-4 sm:p-5"

                        >

                          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-emerald-700">

                            Question {questionIndex + 1} of {questions.length}

                          </legend>

                          <h3 className="break-words text-base font-bold leading-7 text-[#101b45] sm:text-lg">

                            {item.question}

                          </h3>



                          {item.image && (

                            <img

                              src={item.image}

                              alt="Question illustration"

                              className="mt-4 max-h-64 w-full rounded-xl object-contain"

                            />

                          )}



                          {(item.questionType === 'MCQ' ||

                            item.questionType === 'IMAGE') && (

                              <div className="mt-4 space-y-2">

                                {choices.map((option, index) => (

                                  <label

                                    key={index}

                                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${value === String(index)

                                        ? 'border-violet-500 bg-violet-50'

                                        : 'border-slate-200'

                                      }`}

                                  >

                                    <input

                                      type="radio"

                                      name={`battle-answer-${item._id}`}

                                      value={index}

                                      checked={value === String(index)}

                                      onChange={(event) =>

                                        setAnswers((previous) => ({

                                          ...previous,

                                          [item._id]: event.target.value,

                                        }))

                                      }

                                      className="mt-0.5 accent-violet-600"

                                    />

                                    <span className="break-words">{option}</span>

                                  </label>

                                ))}

                              </div>

                            )}



                          {item.questionType === 'TRUE_FALSE' && (

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">

                              {['true', 'false'].map((option) => (

                                <label

                                  key={option}

                                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm capitalize ${value === option

                                      ? 'border-violet-500 bg-violet-50'

                                      : 'border-slate-200'

                                    }`}

                                >

                                  <input

                                    type="radio"

                                    name={`battle-answer-${item._id}`}

                                    value={option}

                                    checked={value === option}

                                    onChange={(event) =>

                                      setAnswers((previous) => ({

                                        ...previous,

                                        [item._id]: event.target.value,

                                      }))

                                    }

                                    className="accent-violet-600"

                                  />

                                  {option}

                                </label>

                              ))}

                            </div>

                          )}



                          {['FILL', 'LONG', 'CODING'].includes(

                            item.questionType,

                          ) && (

                              <textarea

                                value={value}

                                onChange={(event) =>

                                  setAnswers((previous) => ({

                                    ...previous,

                                    [item._id]: event.target.value,

                                  }))

                                }

                                rows={item.questionType === 'CODING' ? 8 : 4}

                                placeholder={

                                  item.coding?.starterCode ||

                                  (item.questionType === 'FILL'

                                    ? 'Enter your answer'

                                    : 'Enter your response')

                                }

                                className={`mt-4 w-full rounded-2xl border border-indigo-100 p-3 text-sm outline-none focus:border-violet-500 ${item.questionType === 'CODING'

                                    ? 'bg-slate-950 font-mono text-emerald-100'

                                    : ''

                                  }`}

                              />

                            )}

                        </fieldset>

                      );

                    })}



                    <button

                      disabled={busy || timeLeft === 0}

                      className="min-h-12 w-full rounded-xl bg-[#172554] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      {busy ? 'Submitting answers...' : 'Submit all answers'}

                    </button>

                  </form>

                )}

              </section>



              <aside className="h-fit rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-5">

                <h2 className="font-bold text-[#101b45]">

                  Battle status

                </h2>



                {timeLeft !== null && (

                  <div className="mt-4 rounded-xl bg-emerald-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">

                      Time remaining

                    </p>

                    <p className="mt-1 font-mono text-3xl font-extrabold text-[#101b45]">

                      {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:

                      {String(timeLeft % 60).padStart(2, '0')}

                    </p>

                  </div>

                )}



                <p className="mt-2 text-sm text-slate-600">

                  Everyone sees the same question set and shared countdown. Results appear after every player submits or the timer expires.

                </p>



                <h3 className="mt-5 text-sm font-semibold text-slate-700">

                  Scores

                </h3>



                <ol className="mt-2 space-y-2">

                  {[...playerAnswers]

                    .filter((player) => !player.isRemoved)

                    .sort((a, b) => {

                      const scoreDifference =

                        Number(b.score || 0) - Number(a.score || 0);



                      if (scoreDifference !== 0) return scoreDifference;



                      const timeDifference =

                        Number(a.totalAnswerTime || 0) -

                        Number(b.totalAnswerTime || 0);



                      if (timeDifference !== 0) return timeDifference;



                      return (

                        new Date(a.joinedAt || 0).getTime() -

                        new Date(b.joinedAt || 0).getTime()

                      );

                    })

                    .map((player, index) => (

                      <li

                        key={idOf(player.user) || index}

                        className="flex justify-between gap-3 text-sm"

                      >

                        <span className="truncate">

                          {player.user?.name || 'Player'}

                        </span>

                        <span className="font-bold">

                          {player.score || 0}

                        </span>

                      </li>

                    ))}

                </ol>



                <button

                  type="button"

                  disabled={busy}

                  onClick={leaveRoom}

                  className="mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"

                >

                  Leave battle

                </button>

              </aside>

            </div>

          )}



          {/* Battle results */}

          {room.status === 'Completed' && (

            <section className="mx-auto max-w-3xl rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-5 shadow-sm sm:p-7">

              <div className="rounded-2xl bg-gradient-to-br from-[#312e81] via-[#6d28d9] to-[#2563eb] p-5 text-white sm:p-7">

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">

                  Your battle result

                </p>



                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">

                  {didWin

                    ? 'You won!'

                    : myBattleResult

                      ? 'Battle complete'

                      : 'Result unavailable'}

                </h2>



                {myBattleResult ? (

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-white/10 p-4">

                      <p className="text-xs font-medium text-white/70">

                        Your score

                      </p>

                      <p className="mt-1 text-2xl font-extrabold">

                        {myBattleResult.score || 0}

                      </p>

                    </div>



                    <div className="rounded-xl bg-white/10 p-4">

                      <p className="text-xs font-medium text-white/70">

                        Final position

                      </p>

                      <p className="mt-1 text-2xl font-extrabold">

                        #{myRank}

                      </p>

                    </div>



                    <div className="col-span-2 rounded-xl bg-white/10 p-4 sm:col-span-1">

                      <p className="text-xs font-medium text-white/70">

                        Players

                      </p>

                      <p className="mt-1 text-2xl font-extrabold">

                        {leaderboard.length}

                      </p>

                    </div>

                  </div>

                ) : (

                  <p className="mt-3 text-sm leading-6 text-white/80">

                    Your account was not found in this battle’s final results.

                  </p>

                )}

              </div>



              <h3 className="mt-7 text-lg font-bold text-[#101b45]">

                Final leaderboard

              </h3>



              <ol className="mt-4 space-y-3">

                {leaderboard.map((player, index) => {

                  const isCurrentUser =

                    String(idOf(player.user)) === String(currentUser?._id);



                  const isWinner =

                    String(idOf(player.user)) ===

                    String(idOf(battleWinner));



                  return (

                    <li

                      key={idOf(player.user) || index}

                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${isCurrentUser

                          ? 'border-violet-300 bg-violet-50'

                          : 'border-transparent bg-indigo-50/50'

                        }`}

                    >

                      <span className="min-w-0 truncate font-semibold text-slate-800">

                        #{index + 1}{' '}

                        {isCurrentUser

                          ? `${player.user?.name || currentUser?.name || 'Player'} (you)`

                          : player.user?.name || 'Player'}



                        {isWinner && (

                          <span className="ml-2 text-amber-700">

                            (winner)

                          </span>

                        )}

                      </span>



                      <span className="shrink-0 font-bold text-[#101b45]">

                        {player.score || 0}

                      </span>

                    </li>

                  );

                })}

              </ol>



              <Link

                to="/battle"

                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#172554] px-4 text-sm font-semibold text-white"

              >

                <ArrowLeft className="h-4 w-4" />

                Battle lobby

              </Link>

            </section>

          )}



          {room.status === 'Started' && !questions.length && (

            <div className="flex items-center justify-center gap-2 rounded-3xl border border-indigo-100 bg-white shadow-[0_10px_35px_rgba(99,102,241,0.08)] p-10 text-sm text-slate-600">

              <LoaderCircle className="h-4 w-4 animate-spin" />

              Loading all battle questions...

            </div>

          )}



          {/* AI quiz creation modal */}

          {showAiQuizModal &&

            isHost &&

            room.status === 'Waiting' && (

              <div

                className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"

                onMouseDown={(event) => {

                  if (

                    event.target === event.currentTarget &&

                    !busy

                  ) {

                    setShowAiQuizModal(false);

                  }

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

                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">

                        <Sparkles className="h-5 w-5" />

                      </span>



                      <div className="min-w-0">

                        <h2

                          id="ai-quiz-title"

                          className="text-lg font-bold text-[#101b45] sm:text-xl"

                        >

                          Create a battle quiz with AI

                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">

                          The quiz will be added to the library and selected for this room.

                        </p>

                      </div>

                    </div>



                    <button

                      type="button"

                      onClick={() => setShowAiQuizModal(false)}

                      disabled={busy}

                      aria-label="Close AI quiz form"

                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"

                    >

                      <X className="h-5 w-5" />

                    </button>

                  </header>



                  <form

                    onSubmit={generateBattleQuiz}

                    className="min-h-0 overflow-y-auto"

                  >

                    <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">

                      {error && <Notice>{error}</Notice>}



                      <div className="grid gap-4 sm:grid-cols-2">

                        <label className="block text-sm font-semibold text-slate-700">

                          Quiz title

                          <input

                            required

                            maxLength={120}

                            value={aiQuiz.title}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                title: event.target.value,

                              }))

                            }

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"

                          />

                        </label>



                        <label className="block text-sm font-semibold text-slate-700">

                          Topic

                          <input

                            required

                            value={aiQuiz.topic}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                topic: event.target.value,

                              }))

                            }

                            placeholder="e.g. JavaScript arrays"

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 px-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"

                          />

                        </label>



                        <label className="block text-sm font-semibold text-slate-700">

                          Category

                          <select

                            value={aiQuiz.category}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                category: event.target.value,

                              }))

                            }

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 bg-white px-3 text-sm font-normal"

                          >

                            {[

                              'Programming',

                              'Database',

                              'Web Development',

                              'AI & ML',

                              'Networking',

                              'Operating System',

                              'Aptitude',

                              'General Knowledge',

                              'Others',

                            ].map((category) => (

                              <option key={category}>

                                {category}

                              </option>

                            ))}

                          </select>

                        </label>



                        <label className="block text-sm font-semibold text-slate-700">

                          Difficulty

                          <select

                            value={aiQuiz.difficulty}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                difficulty: event.target.value,

                              }))

                            }

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 bg-white px-3 text-sm font-normal"

                          >

                            {['Easy', 'Medium', 'Hard'].map(

                              (difficulty) => (

                                <option key={difficulty}>

                                  {difficulty}

                                </option>

                              ),

                            )}

                          </select>

                        </label>



                        <label className="block text-sm font-semibold text-slate-700">

                          Number of questions

                          <input

                            type="number"

                            min="1"

                            max="30"

                            required

                            value={aiQuiz.questionCount}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                questionCount: event.target.value,

                              }))

                            }

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 px-3 text-sm font-normal"

                          />

                        </label>



                        <label className="block text-sm font-semibold text-slate-700">

                          Description{' '}

                          <span className="font-normal text-slate-400">

                            (optional)

                          </span>

                          <input

                            value={aiQuiz.description}

                            onChange={(event) =>

                              setAiQuiz((form) => ({

                                ...form,

                                description: event.target.value,

                              }))

                            }

                            className="mt-1.5 h-11 w-full rounded-2xl border border-indigo-100 px-3 text-sm font-normal"

                          />

                        </label>

                      </div>



                      <fieldset>

                        <legend className="text-sm font-semibold text-slate-700">

                          Question types

                        </legend>

                        <p className="mt-1 text-xs text-slate-500">

                          Choose one or more types for the battle.

                        </p>



                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">

                          {['MCQ', 'TRUE_FALSE', 'FILL'].map(

                            (type) => (

                              <label

                                key={type}

                                className="flex min-h-11 items-center gap-2 rounded-2xl border border-indigo-100 px-3 text-xs font-medium text-slate-700"

                              >

                                <input

                                  type="checkbox"

                                  checked={aiQuiz.questionTypes.includes(

                                    type,

                                  )}

                                  onChange={() =>

                                    toggleAiQuestionType(type)

                                  }

                                  className="accent-violet-700"

                                />

                                {type.replace('_', ' ')}

                              </label>

                            ),

                          )}

                        </div>

                      </fieldset>

                    </div>



                    <footer className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">

                      <button

                        type="button"

                        onClick={() => setShowAiQuizModal(false)}

                        disabled={busy}

                        className="min-h-11 rounded-2xl border border-indigo-100 px-5 text-sm font-semibold text-slate-700 disabled:opacity-50"

                      >

                        Cancel

                      </button>



                      <button

                        type="submit"

                        disabled={

                          busy || aiQuiz.questionTypes.length === 0

                        }

                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-50"

                      >

                        {busy ? (

                          <>

                            <LoaderCircle className="h-4 w-4 animate-spin" />

                            Creating quiz...

                          </>

                        ) : (

                          <>

                            <Sparkles className="h-4 w-4" />

                            Generate and select quiz

                          </>

                        )}

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
