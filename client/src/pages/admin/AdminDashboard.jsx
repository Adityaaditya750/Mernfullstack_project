import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, jsonBody } from '../../lib/api';
import { Notice, PageFrame } from '../../components/PageFrame';

const emptyQuiz = {
  title: '',
  description: '',
  category: 'Programming',
  topic: '',
  difficulty: 'Easy',
  questionCount: '5',
  visibility: 'PUBLIC',
};

const initialQuestion = {
  questionType: 'MCQ',
  question: '',
  difficulty: 'Easy',
  marks: '1',
  options: '',
  correctAnswerIndex: '0',
  answer: '',
  starterCode: '',
  language: 'javascript',
};

const categories = [
  'Programming',
  'Database',
  'Web Development',
  'AI & ML',
  'Networking',
  'Operating System',
  'Aptitude',
  'General Knowledge',
  'Others',
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState('manual');
  const [quizForm, setQuizForm] = useState(emptyQuiz);
  const [questionForm, setQuestionForm] = useState(initialQuestion);
  const [questionTypes, setQuestionTypes] = useState(['MCQ']);
  const [createdQuiz, setCreatedQuiz] = useState(null);
  const [questionsAdded, setQuestionsAdded] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('admin-quiz-draft');
      if (stored) {
        const state = JSON.parse(stored);
        setCreatedQuiz(state.quiz || null);
        setQuestionsAdded(Number(state.questionsAdded) || 0);
      }
    } catch (storageError) {
      console.error('Unable to restore quiz draft:', storageError);
      sessionStorage.removeItem('admin-quiz-draft');
    }
  }, []);

  const saveDraft = (quiz, count) => {
    sessionStorage.setItem('admin-quiz-draft', JSON.stringify({
      quiz,
      questionsAdded: count,
    }));
    setCreatedQuiz(quiz);
    setQuestionsAdded(count);
  };

  const updateQuizField = (event) => {
    const { name, value } = event.target;
    setQuizForm((form) => ({ ...form, [name]: value }));
  };

  const createQuiz = async (event) => {
    event.preventDefault();
    setBusy('quiz');
    setError('');
    setNotice('');
    try {
      const data = await apiRequest('/quiz/create', {
        method: 'POST',
        body: jsonBody({
          ...quizForm,
          questionCount: Number(quizForm.questionCount),
        }),
      });
      saveDraft(data.quiz, 0);
      setNotice(`Draft created: ${data.quiz.title}. Add its questions below.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const createQuestion = async (event) => {
    event.preventDefault();
    if (!createdQuiz) return;
    const options = questionForm.options.split('\n').map((text) => text.trim()).filter(Boolean);
    const payload = {
      quizId: createdQuiz._id,
      questionType: questionForm.questionType,
      question: questionForm.question.trim(),
      difficulty: questionForm.difficulty,
      marks: Number(questionForm.marks),
      explanation: '',
    };

    if (questionForm.questionType === 'MCQ') {
      if (options.length < 2) {
        setError('Add at least two answer options.');
        return;
      }
      const correctIndex = Number(questionForm.correctAnswerIndex);
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        setError(`Correct option must be between 1 and ${options.length}.`);
        return;
      }
      payload.options = options.map((text) => ({ text }));
      payload.correctAnswerIndex = correctIndex;
    }

    if (questionForm.questionType === 'TRUE_FALSE') {
      payload.trueFalse = { answer: questionForm.answer === 'true' };
    }
    if (questionForm.questionType === 'FILL') {
      if (!questionForm.answer.trim()) {
        setError('Enter the expected fill-in answer.');
        return;
      }
      payload.fillBlank = { answer: questionForm.answer.trim() };
    }
    if (questionForm.questionType === 'LONG') {
      payload.longAnswer = { minimumWords: 20, expectedAnswer: questionForm.answer.trim() };
    }
    if (questionForm.questionType === 'CODING') {
      payload.coding = {
        language: questionForm.language,
        starterCode: questionForm.starterCode,
        constraints: [],
        testCases: [],
      };
    }

    setBusy('question');
    setError('');
    setNotice('');
    try {
      await apiRequest('/question/create', {
        method: 'POST',
        body: jsonBody(payload),
      });
      const count = questionsAdded + 1;
      saveDraft(createdQuiz, count);
      setNotice(`Question ${count} added to ${createdQuiz.title}.`);
      setQuestionForm(initialQuestion);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const publishQuiz = async () => {
    setBusy('publish');
    setError('');
    setNotice('');
    try {
      await apiRequest(`/quiz/publish/${createdQuiz._id}`, {
        method: 'PUT',
        body: jsonBody({}),
      });
      sessionStorage.removeItem('admin-quiz-draft');
      setCreatedQuiz(null);
      setQuestionsAdded(0);
      setQuizForm(emptyQuiz);
      setNotice('Quiz published. It is now available to signed-in users.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const generateAIQuiz = async (event) => {
    event.preventDefault();
    setBusy('ai');
    setError('');
    setNotice('');
    try {
      const data = await apiRequest('/quiz/generate-ai', {
        method: 'POST',
        body: jsonBody({
          title: quizForm.title,
          description: quizForm.description,
          category: quizForm.category,
          topic: quizForm.topic,
          difficulty: quizForm.difficulty,
          questionCount: Number(quizForm.questionCount),
          questionTime: 30,
          questionTypes,
        }),
      });
      setNotice(`${data.message || 'Quiz generated successfully.'} ${data.totalQuestions ?? ''} questions published.`);
      setQuizForm(emptyQuiz);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const toggleQuestionType = (type) => {
    setQuestionTypes((types) => (
      types.includes(type) ? types.filter((item) => item !== type) : [...types, type]
    ));
  };

  return (
    <PageFrame eyebrow="Admin workspace" title={`Quiz studio${user?.name ? `, ${user.name}` : ''}`} description="Create quizzes, add questions, and publish them to the authenticated quiz library.">
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {notice && <div className="mb-5"><Notice tone="success">{notice}</Notice></div>}

      <div className="mb-5 flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setMode('manual')} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold ${mode === 'manual' ? 'bg-white text-[#063b49] shadow-sm' : 'text-slate-600'}`}>Create manually</button>
        <button type="button" onClick={() => setMode('ai')} disabled={Boolean(createdQuiz)} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'ai' ? 'bg-white text-[#063b49] shadow-sm' : 'text-slate-600'}`}>Generate with AI</button>
      </div>

      {mode === 'manual' && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] xl:gap-8">
          <form onSubmit={createQuiz} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-[#063b49]">1. Quiz details</h2>
            <p className="mt-1 text-sm text-slate-500">New quizzes are drafts until you publish them.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Title
                <input name="title" value={quizForm.title} onChange={updateQuizField} required maxLength={120} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Description
                <textarea name="description" value={quizForm.description} onChange={updateQuizField} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">Category
                  <select name="category" value={quizForm.category} onChange={updateQuizField} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Topic
                  <input name="topic" value={quizForm.topic} onChange={updateQuizField} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Difficulty
                  <select name="difficulty" value={quizForm.difficulty} onChange={updateQuizField} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{['Easy', 'Medium', 'Hard'].map((item) => <option key={item}>{item}</option>)}</select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Target questions
                  <input name="questionCount" type="number" min="1" max="100" value={quizForm.questionCount} onChange={updateQuizField} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                </label>
              </div>
              <button disabled={busy !== '' || Boolean(createdQuiz)} className="min-h-11 w-full rounded-xl bg-[#063b49] px-4 text-sm font-bold text-white disabled:opacity-50">
                {createdQuiz ? 'Draft is ready below' : busy === 'quiz' ? 'Creating...' : 'Create quiz draft'}
              </button>
            </div>
          </form>

          <div className="space-y-5">
            {createdQuiz ? (
              <>
                <form onSubmit={createQuestion} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <h2 className="text-lg font-bold text-[#063b49]">2. Add a question</h2>
                  <p className="mt-1 break-words text-sm text-slate-500">{createdQuiz.title} · {questionsAdded}/{createdQuiz.questionCount} target questions</p>
                  <div className="mt-5 space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">Question type
                      <select value={questionForm.questionType} onChange={(event) => setQuestionForm((form) => ({ ...form, questionType: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">
                        {['MCQ', 'TRUE_FALSE', 'FILL', 'LONG', 'CODING'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Question
                      <textarea value={questionForm.question} onChange={(event) => setQuestionForm((form) => ({ ...form, question: event.target.value }))} required rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" />
                    </label>
                    {questionForm.questionType === 'MCQ' && (
                      <>
                        <label className="block text-sm font-semibold text-slate-700">Answer options <span className="font-normal text-slate-500">(one option per line)</span>
                          <textarea value={questionForm.options} onChange={(event) => setQuestionForm((form) => ({ ...form, options: event.target.value }))} required rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">Correct option number
                          <input type="number" min="1" value={Number(questionForm.correctAnswerIndex) + 1} onChange={(event) => setQuestionForm((form) => ({ ...form, correctAnswerIndex: String(Number(event.target.value) - 1) }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                        </label>
                      </>
                    )}
                    {questionForm.questionType === 'TRUE_FALSE' && <label className="block text-sm font-semibold text-slate-700">Correct answer<select value={questionForm.answer} onChange={(event) => setQuestionForm((form) => ({ ...form, answer: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"><option value="">Choose answer</option><option value="true">True</option><option value="false">False</option></select></label>}
                    {questionForm.questionType === 'FILL' && <label className="block text-sm font-semibold text-slate-700">Expected answer<input value={questionForm.answer} onChange={(event) => setQuestionForm((form) => ({ ...form, answer: event.target.value }))} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>}
                    {questionForm.questionType === 'LONG' && <label className="block text-sm font-semibold text-slate-700">Reference answer (optional)<textarea value={questionForm.answer} onChange={(event) => setQuestionForm((form) => ({ ...form, answer: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" /></label>}
                    {questionForm.questionType === 'CODING' && (
                      <>
                        <label className="block text-sm font-semibold text-slate-700">Language<input value={questionForm.language} onChange={(event) => setQuestionForm((form) => ({ ...form, language: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
                        <label className="block text-sm font-semibold text-slate-700">Starter code<textarea value={questionForm.starterCode} onChange={(event) => setQuestionForm((form) => ({ ...form, starterCode: event.target.value }))} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-sm text-emerald-100" /></label>
                      </>
                    )}
                    <label className="block text-sm font-semibold text-slate-700">Marks<input type="number" min="0" value={questionForm.marks} onChange={(event) => setQuestionForm((form) => ({ ...form, marks: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
                    <button disabled={busy !== '' || questionsAdded >= Number(createdQuiz.questionCount)} className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'question' ? 'Adding...' : 'Add question'}</button>
                  </div>
                </form>
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                  <h2 className="font-bold text-emerald-950">3. Publish</h2>
                  <p className="mt-1 text-sm text-emerald-900">Quiz is visible to learners after publishing. The requested question count is {createdQuiz.questionCount}.</p>
                  {questionsAdded < Number(createdQuiz.questionCount) && <p className="mt-2 text-xs text-emerald-900">Add {Number(createdQuiz.questionCount) - questionsAdded} more {Number(createdQuiz.questionCount) - questionsAdded === 1 ? 'question' : 'questions'} to match the quiz settings.</p>}
                  <button type="button" disabled={busy !== '' || questionsAdded !== Number(createdQuiz.questionCount)} onClick={publishQuiz} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'publish' ? 'Publishing...' : 'Publish quiz'}</button>
                </section>
              </>
            ) : (
              <form onSubmit={generateAIQuiz} className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-bold text-[#063b49]">Generate a published quiz</h2>
                <p className="mt-1 text-sm text-slate-500">The backend generates the questions and publishes the quiz in one operation.</p>
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">Title
                      <input name="title" value={quizForm.title} onChange={updateQuizField} required maxLength={120} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Category
                      <select name="category" value={quizForm.category} onChange={updateQuizField} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Topic
                      <input name="topic" value={quizForm.topic} onChange={updateQuizField} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Difficulty
                      <select name="difficulty" value={quizForm.difficulty} onChange={updateQuizField} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{['Easy', 'Medium', 'Hard'].map((item) => <option key={item}>{item}</option>)}</select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">Number of questions
                      <input name="questionCount" type="number" min="1" max="100" value={quizForm.questionCount} onChange={updateQuizField} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Description
                      <textarea name="description" value={quizForm.description} onChange={updateQuizField} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal" />
                    </label>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Question types</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {['MCQ', 'TRUE_FALSE', 'FILL', 'LONG', 'CODING'].map((type) => <label key={type} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium"><input type="checkbox" checked={questionTypes.includes(type)} onChange={() => toggleQuestionType(type)} className="accent-violet-700" />{type.replace('_', ' ')}</label>)}
                  </div>
                  <button disabled={busy !== '' || questionTypes.length === 0} className="min-h-11 w-full rounded-xl bg-violet-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'ai' ? 'Generating quiz...' : 'Generate and publish'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  );
};

export default AdminDashboard;
