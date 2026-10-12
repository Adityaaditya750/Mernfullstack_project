
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Clock3, LockKeyhole,
  Sparkles, Swords, Users,
} from 'lucide-react';

import { apiRequest, jsonBody } from '../../lib/api';
import { Notice, PageFrame } from '../../components/PageFrame';

const inputClass =
  'mt-2 h-12 w-full rounded-xl border border-[#063b49]/15 bg-white px-4 text-sm text-[#063b49] outline-none focus:border-[#00c982] focus:ring-4 focus:ring-[#00d98b]/10';

const CreateBattle = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [source, setSource] = useState('library');
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('Private');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [battleTime, setBattleTime] = useState('10');
  const [aiQuiz, setAiQuiz] = useState({
    title: '',
    description: '',
    category: 'Programming',
    topic: '',
    difficulty: 'Easy',
    questionCount: '5',
    questionTypes: ['MCQ'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    apiRequest('/quiz/list')
      .then((data) => {
        if (!active) return;
        const list = data.quizzes || [];
        setQuizzes(list);
        if (list.length) setQuizId(list[0]._id);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load quizzes.');
      })
      .finally(() => {
        if (active) setLoadingQuizzes(false);
      });

    return () => { active = false; };
  }, []);

  const toggleQuestionType = (type) => {
    setAiQuiz((current) => {
      const selected = current.questionTypes.includes(type);
      const questionTypes = selected
        ? current.questionTypes.filter((item) => item !== type)
        : [...current.questionTypes, type];

      return {
        ...current,
        questionTypes: questionTypes.length ? questionTypes : current.questionTypes,
      };
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (busy) return;

    if (source === 'library' && !quizId) {
      setError('Choose a published quiz or switch to AI quiz generation.');
      return;
    }

    if (source === 'ai' && !aiQuiz.topic.trim()) {
      setError('Enter a topic for your AI-generated quiz.');
      return;
    }

    const minutes = Number(battleTime);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      setError('Battle duration must be between 1 and 180 minutes.');
      return;
    }

    setBusy(true);
    setError('');

    let createdRoomId;

    try {
      let selectedQuizId = quizId;

      // Generate the quiz first, so a room is not created without a quiz.
      if (source === 'ai') {
        const generated = await apiRequest('/quiz/generate-ai', {
          method: 'POST',
          body: jsonBody({
            ...aiQuiz,
            title: aiQuiz.title.trim() || `${aiQuiz.topic.trim()} Battle`,
            topic: aiQuiz.topic.trim(),
            questionCount: Number(aiQuiz.questionCount),
            questionTime: 30,
          }),
        });

        selectedQuizId = generated.quiz?._id;
        if (!selectedQuizId) {
          throw new Error(generated.message || 'AI quiz generation did not return a quiz.');
        }
      }

      const created = await apiRequest('/room/create', {
        method: 'POST',
        body: jsonBody({
          gameMode: 'BATTLE',
          roomName: roomName.trim() || 'QuizArena Battle',
          roomType,
          maxPlayers: Number(maxPlayers),
          timerMode: 'QUIZ',
          battleTime: minutes * 60,
        }),
      });

      createdRoomId = created.room?._id;
      if (!createdRoomId) {
        throw new Error(created.message || 'The server did not return a room ID.');
      }

      // Select the quiz before sending the host to the waiting room.
      await apiRequest(`/room/${createdRoomId}/select-quiz`, {
        method: 'PUT',
        body: jsonBody({ quizId: selectedQuizId }),
      });

      navigate(`/battle/${createdRoomId}`, { replace: true });
    } catch (err) {
      setError(
        createdRoomId
          ? `The room was created, but quiz setup failed: ${err.message}. Open the room to finish setup.`
          : err.message || 'Could not create the battle.',
      );

      if (createdRoomId) {
        // Preserve access to the room if the second request failed.
        setTimeout(() => navigate(`/battle/${createdRoomId}`), 1800);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame
      eyebrow="BATTLE SETUP"
      title="Create a battle"
      description="Choose your quiz and set up the arena before inviting your players."
    >
      <div className="relative isolate mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#063b49]/10 bg-white p-4 text-[#063b49] shadow-[0_24px_70px_rgba(6,59,73,0.10)] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[#00d98b]/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 top-32 -z-10 h-64 w-64 rounded-full bg-[#063b49]/5 blur-[100px]" />

        <button
          type="button"
          onClick={() => navigate('/battle')}
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-[#e8fff7] hover:text-[#063b49]"
        >
          <ArrowLeft size={17} /> Back to live battles
        </button>

        {error && <div className="mb-5"><Notice>{error}</Notice></div>}

        <form onSubmit={handleCreate} className="space-y-6">
          <section className="rounded-2xl border border-[#063b49]/10 bg-[#f7f9fb] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8fff7] text-[#063b49]">
                <BookOpen size={23} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">Choose your quiz</h2>
                <p className="mt-1 text-sm text-slate-600">Select from your library or create one with AI.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSource('library')}
                className={`rounded-xl border p-4 text-left transition ${
                  source === 'library'
                    ? 'border-[#00c982] bg-[#e8fff7]'
                    : 'border-[#063b49]/10 bg-white hover:bg-[#e8fff7]/60'
                }`}
              >
                <BookOpen className="mb-3 text-[#008b5e]" size={21} />
                <p className="font-bold">Quiz library</p>
                <p className="mt-1 text-xs text-slate-600">Use a published quiz from the database.</p>
              </button>

              <button
                type="button"
                onClick={() => setSource('ai')}
                className={`rounded-xl border p-4 text-left transition ${
                  source === 'ai'
                    ? 'border-[#00c982] bg-[#e8fff7]'
                    : 'border-[#063b49]/10 bg-white hover:bg-[#e8fff7]/60'
                }`}
              >
                <Sparkles className="mb-3 text-[#008b5e]" size={21} />
                <p className="font-bold">Generate with AI</p>
                <p className="mt-1 text-xs text-slate-600">Create a quiz for your chosen topic.</p>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {source === 'library' ? (
                <motion.div
                  key="library"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-5"
                >
                  <label className="block text-sm font-semibold text-[#063b49]">
                    Published quiz
                    <select
                      value={quizId}
                      onChange={(event) => setQuizId(event.target.value)}
                      disabled={loadingQuizzes || !quizzes.length}
                      className={inputClass}
                    >
                      <option value="">
                        {loadingQuizzes ? 'Loading quizzes…' : 'Choose a quiz'}
                      </option>
                      {quizzes.map((quiz) => (
                        <option key={quiz._id} value={quiz._id}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!loadingQuizzes && !quizzes.length && (
                    <p className="mt-3 text-sm text-amber-700">
                      No quizzes are available. Switch to AI generation or publish a quiz first.
                    </p>
                  )}

                  {quizzes.find((quiz) => quiz._id === quizId) && (
                    <div className="mt-3 rounded-xl border border-[#063b49]/10 bg-white p-4">
                      <p className="font-semibold">{quizzes.find((quiz) => quiz._id === quizId)?.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {quizzes.find((quiz) => quiz._id === quizId)?.description || 'Ready to use in your battle.'}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="ai"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-5 space-y-4"
                >
                  <label className="block text-sm font-semibold text-[#063b49]">
                    Topic *
                    <input
                      value={aiQuiz.topic}
                      onChange={(event) => setAiQuiz({ ...aiQuiz, topic: event.target.value })}
                      required
                      placeholder="e.g. JavaScript, DBMS, React"
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-[#063b49]">
                    Quiz title (optional)
                    <input
                      value={aiQuiz.title}
                      onChange={(event) => setAiQuiz({ ...aiQuiz, title: event.target.value })}
                      placeholder="e.g. JavaScript Showdown"
                      className={inputClass}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-[#063b49]">
                      Category
                      <select
                        value={aiQuiz.category}
                        onChange={(event) => setAiQuiz({ ...aiQuiz, category: event.target.value })}
                        className={inputClass}
                      >
                        {['Programming', 'Technology', 'Science', 'General Knowledge', 'Mathematics', 'History'].map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-[#063b49]">
                      Difficulty
                      <select
                        value={aiQuiz.difficulty}
                        onChange={(event) => setAiQuiz({ ...aiQuiz, difficulty: event.target.value })}
                        className={inputClass}
                      >
                        {['Easy', 'Medium', 'Difficult'].map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-[#063b49]">
                    Number of questions
                    <select
                      value={aiQuiz.questionCount}
                      onChange={(event) => setAiQuiz({ ...aiQuiz, questionCount: event.target.value })}
                      className={inputClass}
                    >
                      {[5, 10, 15, 20].map((count) => (
                        <option key={count} value={count}>{count} questions</option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <p className="text-sm font-semibold text-[#063b49]">Question types</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['MCQ', 'TRUE_FALSE', 'FILL'].map((type) => {
                        const active = aiQuiz.questionTypes.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleQuestionType(type)}
                            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                              active
                                ? 'border-[#00c982] bg-[#e8fff7] text-[#063b49]'
                                : 'border-[#063b49]/10 text-slate-600 hover:bg-white'
                            }`}
                          >
                            {active && <Check size={14} />}
                            {type === 'TRUE_FALSE' ? 'True / False' : type === 'FILL' ? 'Fill in the blank' : 'Multiple choice'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="rounded-2xl border border-[#063b49]/10 bg-[#f7f9fb] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8fff7] text-[#063b49]">
                <Swords size={23} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">Battle settings</h2>
                <p className="mt-1 text-sm text-slate-600">Set up your lobby before players join.</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#063b49]">
              Room name
              <input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                maxLength={60}
                placeholder="Friday night showdown"
                className={inputClass}
              />
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#063b49]">
                Room access
                <select value={roomType} onChange={(event) => setRoomType(event.target.value)} className={inputClass}>
                  <option value="Private">Private — invite only</option>
                  <option value="Public">Public — open to players</option>
                </select>
                <span className="mt-2 flex items-center gap-1.5 text-xs font-normal text-slate-500">
                  {roomType === 'Private' ? <LockKeyhole size={13} /> : <Users size={13} />}
                  {roomType === 'Private' ? 'Share your room code.' : 'Your room will appear in the live list if the server supports public rooms.'}
                </span>
              </label>

              <label className="block text-sm font-semibold text-[#063b49]">
                Player limit
                <select value={maxPlayers} onChange={(event) => setMaxPlayers(event.target.value)} className={inputClass}>
                  {[2, 3, 4, 5, 6, 8].map((count) => (
                    <option key={count} value={count}>{count} players</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#063b49]">
              Total battle duration
              <span className="relative mt-2 block">
                <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={battleTime}
                  onChange={(event) => setBattleTime(event.target.value)}
                  className={`${inputClass} pl-11 pr-24`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  minutes
                </span>
              </span>
            </label>
          </section>

          <motion.button
            whileHover={reduceMotion || busy ? undefined : { scale: 1.01 }}
            whileTap={reduceMotion || busy ? undefined : { scale: 0.99 }}
            type="submit"
            disabled={busy || (source === 'library' && (loadingQuizzes || !quizId))}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#063b49] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(6,59,73,0.18)] transition hover:bg-[#074757] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {source === 'ai' ? 'Preparing quiz and room…' : 'Creating your battle…'}
              </>
            ) : (
              <>Create battle & open waiting room <ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>
      </div>
    </PageFrame>
  );
};

export default CreateBattle;
