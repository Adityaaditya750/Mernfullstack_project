
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Swords, Users } from 'lucide-react';
import { apiRequest, jsonBody } from '../../lib/api';
import { Notice, PageFrame } from '../../components/PageFrame';

const BattleLobby = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('Private');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [battleTime, setBattleTime] = useState('10');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const createRoom = async (event) => {
    event.preventDefault();

    setBusy('create');
    setError('');

    try {
      const data = await apiRequest('/room/create', {
        method: 'POST',
        body: jsonBody({
          gameMode: 'BATTLE',
          roomName: roomName.trim(),
          roomType,
          maxPlayers: Number(maxPlayers),
          timerMode: 'QUIZ',
          battleTime: Number(battleTime) * 60,
        }),
      });

      if (!data?.room?._id) {
        throw new Error(
          data?.message || 'The server did not return the new room.'
        );
      }

      navigate(`/battle/${data.room._id}`);
    } catch (requestError) {
      setError(requestError.message || 'Could not create the room.');
      setBusy('');
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();

    setBusy('join');
    setError('');

    try {
      const data = await apiRequest('/room/join', {
        method: 'POST',
        body: jsonBody({
          roomCode: roomCode.trim().toUpperCase(),
        }),
      });

      if (!data?.room?._id) {
        throw new Error(
          data?.message || 'The server did not return the room.'
        );
      }

      navigate(`/battle/${data.room._id}`);
    } catch (requestError) {
      setError(requestError.message || 'Could not join the room.');
      setBusy('');
    }
  };

  return (
    <PageFrame
      eyebrow="Play together"
      title="Battle rooms"
      description="Choose whether you’re creating a room or joining a friend’s battle."
    >
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}

      {!mode ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError('');
            }}
            className="group flex min-h-52 flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg sm:min-h-60 sm:p-8"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Swords className="h-6 w-6" />
            </span>

            <span className="mt-5 text-xl font-bold text-[#063b49]">
              Create a battle
            </span>

            <span className="mt-2 text-sm leading-6 text-slate-600">
              Set up a room, invite players, and choose a quiz or create one
              with AI.
            </span>

            <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-emerald-800">
              Set up room
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError('');
            }}
            className="group flex min-h-52 flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg sm:min-h-60 sm:p-8"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#063b49]">
              <Users className="h-6 w-6" />
            </span>

            <span className="mt-5 text-xl font-bold text-[#063b49]">
              Join a battle
            </span>

            <span className="mt-2 text-sm leading-6 text-slate-600">
              Enter the invite code shared by the host and join their room.
            </span>

            <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-emerald-800">
              Enter room code
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('');
              setError('');
              setBusy('');
            }}
            className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#063b49]"
          >
            <ArrowLeft className="h-4 w-4" />
            Choose another option
          </button>

          {mode === 'create' ? (
            <form
              onSubmit={createRoom}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Swords className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-lg font-bold text-[#063b49]">
                    Create a battle
                  </h2>
                  <p className="text-sm text-slate-500">
                    You’ll be the host.
                  </p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-semibold text-slate-700">
                Room name
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  required
                  maxLength={60}
                  placeholder="Friday quiz night"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Room access
                  <select
                    value={roomType}
                    onChange={(event) => setRoomType(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  >
                    <option value="Private">Private</option>
                    <option value="Public">Public</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Players
                  <select
                    value={maxPlayers}
                    onChange={(event) => setMaxPlayers(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  >
                    {[2, 3, 4, 5, 6, 8].map((count) => (
                      <option key={count} value={count}>
                        {count} players
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Total battle time (minutes)
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={battleTime}
                    onChange={(event) => setBattleTime(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                  />
                </label>

                <p className="mt-2 text-xs font-normal text-slate-500">
                  All questions appear together. Every player shares this
                  countdown.
                </p>
              </div>

              <button
                disabled={busy !== ''}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#063b49] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy === 'create' ? 'Creating room...' : 'Create room'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form
              onSubmit={joinRoom}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#063b49]">
                  <Users className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-lg font-bold text-[#063b49]">
                    Join a battle
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enter the room’s invite code.
                  </p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-semibold text-slate-700">
                Room code
                <input
                  value={roomCode}
                  onChange={(event) =>
                    setRoomCode(event.target.value.toUpperCase())
                  }
                  required
                  maxLength={12}
                  autoCapitalize="characters"
                  placeholder="AB12CD"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center font-mono text-lg font-bold tracking-[0.25em] uppercase outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Room codes are shared by the host. Public rooms also require
                their code to join.
              </p>

              <button
                disabled={busy !== ''}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#063b49] px-4 text-sm font-bold text-[#063b49] hover:bg-slate-50 disabled:opacity-60"
              >
                {busy === 'join' ? 'Joining room...' : 'Join room'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </PageFrame>
  );
};

export default BattleLobby;
