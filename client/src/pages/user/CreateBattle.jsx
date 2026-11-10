import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, LoaderCircle, Minus, Plus,
} from 'lucide-react';

import { apiRequest, jsonBody } from '../../lib/api';

const CreateBattle = () => {
  const navigate = useNavigate();

  const [source, setSource] = useState('library');
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [roomType, setRoomType] = useState('Public');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [battleTime, setBattleTime] = useState('10');
  const [aiQuiz, setAiQuiz] = useState({
    title: '',
    description: '',
    category: 'Programming',
    topic: '',
    difficulty: 'Medium',
    questionCount: '',
    questionTypes: ['MCQ'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedQuiz = quizzes.find((quiz) => quiz._id === quizId);
  const quizTopic = source === 'ai'
    ? aiQuiz.topic.trim() || aiQuiz.category
    : selectedQuiz?.category?.name ||
      selectedQuiz?.category ||
      selectedQuiz?.topic ||
      selectedQuiz?.title ||
      'Choose a quiz';
  const summaryDifficulty = source === 'ai'
    ? aiQuiz.difficulty
    : selectedQuiz?.difficulty || selectedQuiz?.level || 'Medium';
  const summaryQuestionCount = source === 'ai'
    ? Number.isInteger(Number(aiQuiz.questionCount)) &&
      Number(aiQuiz.questionCount) >= 1 &&
      Number(aiQuiz.questionCount) <= 30
      ? aiQuiz.questionCount
      : '—'
    : selectedQuiz?.questions?.length ||
      selectedQuiz?.questionCount ||
      selectedQuiz?.questionsCount ||
      '—';

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

  const updateAiSettings = (updates) => {
    if (source !== 'ai') {
      const currentCategory = selectedQuiz?.category?.name || selectedQuiz?.category;
      const supportedCategories = [
        'Programming',
        'Technology',
        'Science',
        'General Knowledge',
        'Mathematics',
        'History',
      ];

      setAiQuiz((current) => ({
        ...current,
        topic: selectedQuiz?.topic || selectedQuiz?.title || current.topic,
        category: supportedCategories.includes(currentCategory)
          ? currentCategory
          : current.category,
        ...updates,
      }));
      setSource('ai');
      return;
    }

    setAiQuiz((current) => ({ ...current, ...updates }));
  };

  const adjustQuestionCount = (step) => {
    const currentCount = Number(aiQuiz.questionCount);
    const nextCount = Number.isInteger(currentCount)
      ? Math.max(1, Math.min(30, currentCount + step))
      : 1;
    updateAiSettings({ questionCount: String(nextCount) });
  };

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

    if (
      source === 'ai' &&
      (!Number.isInteger(Number(aiQuiz.questionCount)) ||
        Number(aiQuiz.questionCount) < 1 ||
        Number(aiQuiz.questionCount) > 30)
    ) {
      setError('Number of questions must be between 1 and 30.');
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
          roomName: 'QuizArena Battle',
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
        setTimeout(() => navigate(`/battle/${createdRoomId}`), 1800);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="create-battle-page min-h-screen px-4 pb-12 pt-6 text-[#f4f4f6] sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
    <div className="mx-auto w-full max-w-[1180px]">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
          Create a battle room
        </h1>
        <p className="mt-2 text-sm text-[#a2a4b1]">
          Configure your quiz, invite players and get ready to compete.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border border-rose-900 bg-[#21171b] px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)] lg:gap-7"
      >

        {/* Left: Battle Configuration */}
        <section className="create-battle-panel min-w-0 rounded-2xl border border-[#292b35] bg-[#17181f] p-5 sm:p-7 lg:p-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold">Battle settings</h2>
            <p className="mt-1 text-xs text-[#a2a4b1]">
              Choose your quiz and customize the battle.
            </p>
          </div>

          <label className="block text-sm font-semibold" htmlFor="quiz-source">
            Quiz topic
          </label>

          <select
            id="quiz-source"
            value={source === 'ai' ? 'ai' : quizId}
            onChange={(event) => {
              if (event.target.value === 'ai') {
                setSource('ai');
                return;
              }
              setSource('library');
              setQuizId(event.target.value);
            }}
            disabled={loadingQuizzes}
            className="create-battle-select mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-4 text-sm text-[#f4f4f6] outline-none focus:border-[#c4f52c]"
          >
            <option value="" disabled>
              {loadingQuizzes ? 'Loading quizzes...' : 'Choose a quiz'}
            </option>

            {quizzes.map((quiz) => (
              <option key={quiz._id} value={quiz._id}>
                {quiz.category?.name || quiz.category || quiz.topic || quiz.title}
                {quiz.title ? ` — ${quiz.title}` : ''}
              </option>
            ))}

            <option value="ai">Generate a quiz with AI</option>
          </select>

          {source === 'ai' && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold" htmlFor="ai-topic">
                Topic
                <input
                  id="ai-topic"
                  value={aiQuiz.topic}
                  onChange={(event) =>
                    setAiQuiz({ ...aiQuiz, topic: event.target.value })
                  }
                  required
                  placeholder="e.g. Physics"
                  className="create-battle-select mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-4 text-sm text-[#f4f4f6] outline-none focus:border-[#c4f52c]"
                />
              </label>

              <label className="block text-sm font-semibold" htmlFor="ai-category">
                Category
                <select
                  id="ai-category"
                  value={aiQuiz.category}
                  onChange={(event) =>
                    setAiQuiz({ ...aiQuiz, category: event.target.value })
                  }
                  className="create-battle-select mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-4 text-sm text-[#f4f4f6] outline-none focus:border-[#c4f52c]"
                >
                  {[
                    'Programming',
                    'Technology',
                    'Science',
                    'General Knowledge',
                    'Mathematics',
                    'History',
                  ].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {!loadingQuizzes && source === 'library' && quizzes.length === 0 && (
            <p className="mt-3 text-sm text-amber-300">
              No quizzes are available. Choose AI generation to create one.
            </p>
          )}

          {/* Difficulty */}
          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">Difficulty</legend>

            <div className="mt-3 flex flex-wrap gap-3">
              {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  aria-pressed={aiQuiz.difficulty === difficulty}
                  onClick={() => updateAiSettings({ difficulty })}
                  className={`create-battle-choice rounded-full border px-5 py-2.5 text-sm font-semibold ${
                    aiQuiz.difficulty === difficulty ? 'is-selected' : ''
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Question Count */}
          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">
              Number of questions
            </legend>

            <div className="create-battle-count-control mt-3 flex h-12 w-full max-w-[320px] items-stretch overflow-hidden rounded-xl border border-[#343641] bg-[#101115]">
              <button
                type="button"
                aria-label="Decrease number of questions"
                disabled={!aiQuiz.questionCount || Number(aiQuiz.questionCount) <= 1}
                onClick={() => adjustQuestionCount(-1)}
                className="create-battle-count-button flex w-12 shrink-0 items-center justify-center border-r border-[#343641] transition hover:bg-[#292b35] hover:text-[#c4f52c] disabled:opacity-40"
              >
                <Minus size={17} />
              </button>

              <input
                id="question-count"
                type="number"
                min="1"
                max="30"
                step="1"
                value={aiQuiz.questionCount}
                onChange={(event) =>
                  updateAiSettings({ questionCount: event.target.value })
                }
                placeholder="—"
                aria-label="Number of questions"
                className="create-battle-count-input h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-center text-base font-semibold text-[#f4f4f6] outline-none focus:ring-0"
              />

              <button
                type="button"
                aria-label="Increase number of questions"
                disabled={Number(aiQuiz.questionCount) >= 30}
                onClick={() => adjustQuestionCount(1)}
                className="create-battle-count-button flex w-12 shrink-0 items-center justify-center border-l border-[#343641] transition hover:bg-[#292b35] hover:text-[#c4f52c] disabled:opacity-40"
              >
                <Plus size={17} />
              </button>
            </div>

            <p className="mt-2 text-xs text-[#a2a4b1]">
              Enter a number or use + / − (1–30).
            </p>
          </fieldset>

          {/* Room Type */}
          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">Room type</legend>

            <div className="mt-3 flex flex-wrap gap-3">
              {['Public', 'Private'].map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={roomType === type}
                  onClick={() => setRoomType(type)}
                  className={`create-battle-choice rounded-full border px-5 py-2.5 text-sm font-semibold ${
                    roomType === type ? 'is-selected' : ''
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Advanced Settings */}
          <details className="create-battle-advanced mt-7 border-t border-[#292b35] pt-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#a2a4b1] hover:text-[#c4f52c]">
              Advanced room settings
            </summary>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold" htmlFor="player-limit">
                Player limit
                <select
                  id="player-limit"
                  value={maxPlayers}
                  onChange={(event) => setMaxPlayers(event.target.value)}
                  className="create-battle-select mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-3 text-sm text-[#f4f4f6]"
                >
                  {[2, 3, 4, 5, 6, 8].map((count) => (
                    <option key={count} value={count}>
                      {count} players
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold" htmlFor="battle-duration">
                Duration (minutes)
                <input
                  id="battle-duration"
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={battleTime}
                  onChange={(event) => setBattleTime(event.target.value)}
                  className="create-battle-select mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-3 text-sm text-[#f4f4f6]"
                />
              </label>

              {source === 'ai' && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-semibold">Question types</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {['MCQ', 'TRUE_FALSE', 'FILL'].map((type) => {
                      const active = aiQuiz.questionTypes.includes(type);

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleQuestionType(type)}
                          className={`create-battle-choice rounded-full border px-4 py-2 text-xs font-semibold ${
                            active ? 'is-selected' : ''
                          }`}
                        >
                          {active && (
                            <Check className="mr-1 inline h-3.5 w-3.5" />
                          )}
                          {type === 'TRUE_FALSE'
                            ? 'True / False'
                            : type === 'FILL'
                              ? 'Fill in the blank'
                              : 'Multiple choice'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Create Button */}
          <button
            type="submit"
            disabled={busy || (source === 'library' && (loadingQuizzes || !quizId))}
            className="create-battle-submit mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                {source === 'ai'
                  ? 'Preparing quiz and room...'
                  : 'Creating room...'}
              </>
            ) : (
              'Create room'
            )}
          </button>
        </section>

        {/* Right: Room Summary */}
        <aside className="create-battle-panel create-battle-summary min-w-0 rounded-2xl border border-[#292b35] bg-[#17181f] p-5 sm:p-7 lg:sticky lg:top-8 lg:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">
            Room summary
          </h2>

          <p className="mt-1 text-xs text-[#a2a4b1]">
            Review your battle configuration.
          </p>

          <dl className="mt-6">
            {[
              ['Topic', quizTopic],
              ['Difficulty', summaryDifficulty],
              ['Questions', summaryQuestionCount],
              ['Type', roomType],
            ].map(([label, value]) => (
              <div
                key={label}
                className="create-battle-summary-row flex items-center justify-between gap-4 border-b border-[#292b35] py-5 last:border-b-0"
              >
                <dt className="shrink-0 text-sm text-[#a2a4b1]">
                  {label}
                </dt>

                <dd className="min-w-0 max-w-[65%] truncate text-right text-sm font-bold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>

      </form>
    </div>
    </main>
  );
};

export default CreateBattle;