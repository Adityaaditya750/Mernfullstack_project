
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Clock3,
  Gamepad2,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Swords,
  Users,
  Wifi,
  KeyRound,
  X,
} from "lucide-react";

import { apiRequest, jsonBody } from "../../lib/api";
import { Notice, PageFrame } from "../../components/PageFrame";
import socket, { connectSocket } from "../../socket";

const getRoomId = (room) => room?._id || room?.id;

const BattleLobby = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [privateJoinOpen, setPrivateJoinOpen] = useState(false);
  const [privateJoinCode, setPrivateJoinCode] = useState("");
  const [privateJoinRoom, setPrivateJoinRoom] = useState(null);

  const loadRooms = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const data = await apiRequest("/room/public");

      const list = Array.isArray(data)
        ? data
        : data?.rooms || data?.data?.rooms || data?.data || [];

      const activeRooms = list.filter((room) => {
        const status = String(room?.status || "").toLowerCase();
        const roomType = String(room?.roomType || "Public").toLowerCase();

        return (
          status === "waiting" &&
          room?.isQuizStarted !== true &&
          room?.isQuizEnded !== true &&
          ["public", "private"].includes(roomType)
        );
      });

      setRooms(activeRooms);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load active battles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refreshRooms = () => {
      if (active) loadRooms();
    };

    const token = localStorage.getItem("token");

    loadRooms();

    const interval = window.setInterval(refreshRooms, 10000);

    socket.on("public-battles-updated", refreshRooms);
    socket.on("room-updated", refreshRooms);
    socket.on("battle-started", refreshRooms);
    socket.on("battle-ended", refreshRooms);
    socket.on("player-left", refreshRooms);

    if (token) {
      try {
        connectSocket(token);
      } catch (socketError) {
        console.error("Unable to connect battle lobby socket:", socketError);
      }
    }

    return () => {
      active = false;
      window.clearInterval(interval);

      socket.off("public-battles-updated", refreshRooms);
      socket.off("room-updated", refreshRooms);
      socket.off("battle-started", refreshRooms);
      socket.off("battle-ended", refreshRooms);
      socket.off("player-left", refreshRooms);
    };
  }, [loadRooms]);

  const joinByCode = async (event) => {
    event.preventDefault();

    if (joining || !roomCode.trim()) return;

    setJoining(true);
    setError("");

    try {
      const data = await apiRequest("/room/join", {
        method: "POST",
        body: jsonBody({
          roomCode: roomCode.trim().toUpperCase(),
        }),
      });

      const id = getRoomId(data?.room);

      if (!id) {
        throw new Error(data?.message || "Room ID was not returned.");
      }

      navigate(`/battle/${id}`);
    } catch (err) {
      setError(err.message || "Could not join this battle.");
    } finally {
      setJoining(false);
    }
  };

  const joinPublicRoom = async (room) => {
    if (joining || !room?.roomCode) return;

    setJoining(true);
    setError("");

    try {
      const data = await apiRequest("/room/join", {
        method: "POST",
        body: jsonBody({
          roomCode: room.roomCode,
        }),
      });

      const id = getRoomId(data?.room);

      if (!id) {
        throw new Error(data?.message || "Could not join the room.");
      }

      navigate(`/battle/${id}`);
    } catch (err) {
      setError(err.message || "Could not join this battle.");
      await loadRooms();
    } finally {
      setJoining(false);
    }
  };

  const joinPrivateRoom = async (event) => {
    event.preventDefault();

    if (joining || !privateJoinCode.trim()) return;

    setJoining(true);
    setError("");

    try {
      const data = await apiRequest("/room/join", {
        method: "POST",
        body: jsonBody({
          roomCode: privateJoinCode.trim().toUpperCase(),
        }),
      });

      const id = getRoomId(data?.room);

      if (!id) {
        throw new Error(data?.message || "Unable to join this room.");
      }

      setPrivateJoinOpen(false);
      setPrivateJoinCode("");
      setPrivateJoinRoom(null);

      navigate(`/battle/${id}`);
    } catch (err) {
      setError(err.message || "Invalid room code. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <PageFrame
      title="Battles"
      description="Compete live on the same questions."
    >
      <div className="w-full min-w-0 space-y-6 pb-6">

        {error && (
          <Notice>{error}</Notice>
        )}

        {/* Create and Join Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Create Room */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-w-0 flex-col justify-between rounded-3xl border border-[#292b35] bg-[#17181f] p-5 sm:p-7 lg:min-h-[215px]"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22242d] text-[#c4f52c]">
                  <Swords size={21} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#a2a4b1]">
                  Multiplayer
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#f4f4f6] sm:text-3xl">
                Create a room
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#a2a4b1] sm:text-base">
                Host a battle and pick the quiz, difficulty and question count.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/battle/create")}
              className="mt-6 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-[#c4f52c] px-6 text-sm font-bold text-[#101109] transition hover:bg-[#d2ff43] focus:outline-none focus:ring-2 focus:ring-[#c4f52c] focus:ring-offset-2 focus:ring-offset-[#17181f]"
            >
              <Plus size={19} />
              Create battle
            </button>
          </motion.section>

          {/* Join with Code */}
          <form
            onSubmit={joinByCode}
            className="flex min-w-0 flex-col justify-center rounded-3xl border border-[#292b35] bg-[#17181f] p-5 sm:p-7 lg:min-h-[215px]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22242d] text-[#c4f52c]">
                <KeyRound size={20} />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-[#f4f4f6] sm:text-3xl">
                Join with a code
              </h2>
            </div>

            <label
              htmlFor="room-code"
              className="mb-2 mt-5 block text-sm font-semibold text-[#f4f4f6]"
            >
              Room code
            </label>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <input
                id="room-code"
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(
                    event.target.value.toUpperCase().replace(/\s/g, "")
                  )
                }
                placeholder="Enter room code"
                maxLength={12}
                autoComplete="off"
                required
                className="h-14 min-w-0 flex-1 rounded-2xl border border-[#343641] bg-[#101115] px-4 font-mono text-sm tracking-widest text-[#f4f4f6] outline-none placeholder:text-[#777b8a] focus:border-[#c4f52c]"
              />

              <button
                type="submit"
                disabled={joining}
                className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full border border-[#343641] px-7 text-sm font-bold text-[#f4f4f6] transition hover:border-[#c4f52c] hover:text-[#c4f52c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joining ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <>
                    Join
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Open Rooms */}
        <section className="min-w-0 rounded-3xl border border-[#4b641b] bg-[#17181f] p-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#f4f4f6] sm:text-3xl">
                  Open rooms
                </h2>

                <span className="rounded-full border border-[#343641] bg-[#20212a] px-3 py-1 text-xs font-semibold text-[#a2a4b1]">
                  {rooms.length} rooms
                </span>
              </div>

              <p className="mt-2 text-sm text-[#a2a4b1]">
                Public and private rooms waiting to start, including full rooms.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadRooms(true)}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#343641] px-4 text-sm font-semibold text-[#a2a4b1] transition hover:border-[#c4f52c] hover:text-[#c4f52c] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="divide-y divide-[#292b35]">

            {loading ? (
              [1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center justify-between gap-4 py-6"
                >
                  <div className="space-y-3">
                    <div className="h-4 w-40 rounded bg-[#292b35]" />
                    <div className="h-3 w-28 rounded bg-[#22242d]" />
                  </div>
                  <div className="h-10 w-24 rounded-full bg-[#292b35]" />
                </div>
              ))
            ) : rooms.length > 0 ? (
              <AnimatePresence>
                {rooms.map((room, index) => {
                  const players = (room.players || []).filter(
                    (player) => !player.isRemoved
                  );

                  const isPrivate =
                    String(room.roomType || "Public").toLowerCase() === "private";

                  const isFull =
                    players.length >= Number(room.maxPlayers || Infinity);

                  return (
                    <motion.div
                      key={getRoomId(room) || index}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex min-w-0 flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#22242d] text-[#c4f52c]">
                          <Gamepad2 size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-[#f4f4f6] sm:text-lg">
                            {room.roomName || "QuizArena Battle"}
                          </h3>

                          <p className="mt-1 text-sm text-[#a2a4b1]">
                            {room.host?.name || room.hostName || "QuizArena player"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#a2a4b1]">
                            <span className="inline-flex items-center gap-1.5">
                              <Users size={14} />
                              {players.length}/{room.maxPlayers || "?"} players
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              {isPrivate ? (
                                <LockKeyhole size={14} />
                              ) : (
                                <Globe2 size={14} />
                              )}
                              {room.roomType || "Public"}
                            </span>

                            {room.battleTime && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={14} />
                                {Math.ceil(Number(room.battleTime) / 60)} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                        <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#343641] bg-[#20212a] px-4 text-xs font-semibold text-[#f4f4f6]">
                          <span className="h-2 w-2 rounded-full bg-[#c4f52c]" />
                          Waiting
                        </span>

                        <button
                          type="button"
                          disabled={joining || (!isPrivate && isFull)}
                          onClick={() => {
                            if (isPrivate) {
                              setPrivateJoinRoom(room);
                              setPrivateJoinCode("");
                              setError("");
                              setPrivateJoinOpen(true);
                            } else {
                              joinPublicRoom(room);
                            }
                          }}
                          className="inline-flex min-h-11 min-w-24 items-center justify-center gap-2 rounded-full border border-[#343641] px-5 text-sm font-bold text-[#f4f4f6] transition hover:border-[#c4f52c] hover:text-[#c4f52c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPrivate ? (
                            <>
                              <LockKeyhole size={15} />
                              Join
                            </>
                          ) : isFull ? (
                            "Full"
                          ) : (
                            <>
                              Join
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22242d] text-[#c4f52c]">
                  <Wifi size={25} />
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#f4f4f6]">
                  No active battles right now
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a2a4b1]">
                  Start your own battle and invite your friends, or refresh in a
                  moment to see newly created rooms.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/battle/create")}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c4f52c] px-5 text-sm font-bold text-[#101109] transition hover:bg-[#d2ff43]"
                >
                  <Plus size={17} />
                  Create battle
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Private Room Popup */}
      <AnimatePresence>
        {privateJoinOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !joining) {
                setPrivateJoinOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md rounded-3xl border border-[#292b35] bg-[#17181f] p-5 text-[#f4f4f6] shadow-2xl sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="private-room-title"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22242d] text-[#c4f52c]">
                    <LockKeyhole size={23} />
                  </div>

                  <h2 id="private-room-title" className="text-xl font-extrabold">
                    Join private room
                  </h2>

                  <p className="mt-2 text-sm text-[#a2a4b1]">
                    Enter the invitation code to join{" "}
                    <span className="font-semibold text-[#f4f4f6]">
                      {privateJoinRoom?.roomName || "this battle"}
                    </span>.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={joining}
                  onClick={() => setPrivateJoinOpen(false)}
                  className="rounded-xl p-2 text-[#a2a4b1] transition hover:bg-[#22242d] disabled:opacity-50"
                  aria-label="Close popup"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={joinPrivateRoom} className="space-y-4">
                <label className="block text-sm font-semibold">
                  Room code

                  <input
                    autoFocus
                    autoComplete="off"
                    value={privateJoinCode}
                    onChange={(event) =>
                      setPrivateJoinCode(
                        event.target.value.toUpperCase().replace(/\s/g, "")
                      )
                    }
                    placeholder="Enter invitation code"
                    maxLength={12}
                    required
                    className="mt-2 h-12 w-full rounded-xl border border-[#343641] bg-[#101115] px-4 font-mono tracking-widest text-[#f4f4f6] outline-none placeholder:text-[#777b8a] focus:border-[#c4f52c]"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={joining}
                    onClick={() => {
                      setPrivateJoinOpen(false);
                      setError("");
                    }}
                    className="min-h-12 flex-1 rounded-full border border-[#343641] px-4 text-sm font-bold transition hover:border-[#c4f52c] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={joining || !privateJoinCode.trim()}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#c4f52c] px-4 text-sm font-bold text-[#101109] transition hover:bg-[#d2ff43] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joining ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <ArrowRight size={17} />
                    )}
                    Join room
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageFrame>
  );
};

export default BattleLobby;
