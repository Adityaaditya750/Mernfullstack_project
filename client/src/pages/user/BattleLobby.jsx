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



const cardClass =

  "rounded-2xl border border-[#063b49]/10 bg-white p-5 text-[#063b49] shadow-[0_12px_35px_rgba(6,59,73,0.07)] transition hover:border-[#00d98b]/50";



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



    // Keep full rooms visible; the card decides whether joining is allowed.

    // Never add a private room code to the card or expose it in the UI.

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

    if (active) {

      loadRooms();

    }

  };



  const token = localStorage.getItem("token");



  // Initial list fetch

  loadRooms();



  // Fallback refresh if a socket event is missed

  const interval = window.setInterval(refreshRooms, 10000);



  // Update the list when rooms are created, changed, or closed

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

      eyebrow="MULTIPLAYER ARENA"

      title="Live battles"

      description="Find an open room, challenge your friends, or create your own quiz battle."

    >

      <div className="relative isolate min-w-0 overflow-hidden rounded-[28px] border border-[#063b49]/10 bg-white p-4 text-[#063b49] shadow-[0_24px_70px_rgba(6,59,73,0.10)] sm:p-7 lg:p-9">

        <div className="pointer-events-none absolute -left-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[#00d98b]/10 blur-[100px]" />

        <div className="pointer-events-none absolute -right-20 top-20 -z-10 h-64 w-64 rounded-full bg-[#063b49]/5 blur-[100px]" />



        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00d98b]/30 bg-[#e8fff7]">

              <Gamepad2 size={25} />

            </div>

            <div>

              <p className="font-black tracking-widest">QUIZARENA</p>

              <p className="mt-1 text-xs text-slate-500">

                The arena is yours.

              </p>

            </div>

          </div>



          <span className="inline-flex items-center gap-2 rounded-full border border-[#00d98b]/30 bg-[#e8fff7] px-3 py-2 text-xs font-semibold text-[#008b5e]">

            <Activity size={14} />

            Live lobby

          </span>

        </div>



        <motion.section

          initial={reduceMotion ? false : { opacity: 0, y: 16 }}

          animate={{ opacity: 1, y: 0 }}

          className="my-8 grid min-w-0 items-center gap-6 lg:grid-cols-[1fr_auto]"

        >

          <div className="min-w-0">

            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#00a96f]">

              <Swords className="mr-2 inline" size={15} />

              Multiplayer mode

            </p>



            <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">

              Think fast.

              <span className="block text-[#00a96f]">Win together.</span>

            </h2>



            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">

              Choose your quiz, bring your friends, and battle for the top

              of the leaderboard.

            </p>

          </div>



          <motion.button

            type="button"

            whileHover={reduceMotion ? undefined : { scale: 1.03 }}

            whileTap={reduceMotion ? undefined : { scale: 0.98 }}

            onClick={() => navigate("/battle/create")}

            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#063b49] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(6,59,73,0.18)] transition hover:bg-[#074757]"

          >

            <Plus size={18} />

            Create battle

            <ArrowRight size={17} />

          </motion.button>

        </motion.section>



        {error && (

          <div className="mb-5">

            <Notice>{error}</Notice>

          </div>

        )}



        <form

          onSubmit={joinByCode}

          className="mb-8 grid min-w-0 gap-3 rounded-2xl border border-[#063b49]/10 bg-[#f7f9fb] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5"

        >

          <label className="block min-w-0 text-sm font-semibold">

            Have an invite code?

            <span className="relative mt-2 block">

              <KeyRound

                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"

                size={17}

              />

              <input

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

                className="h-12 w-full min-w-0 rounded-xl border border-[#063b49]/15 bg-white pl-11 pr-4 font-mono text-sm tracking-widest outline-none focus:border-[#00c982] focus:ring-4 focus:ring-[#00d98b]/10"

              />

            </span>

          </label>



          <button

            type="submit"

            disabled={joining}

            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#00d98b] px-5 text-sm font-bold text-[#063b49] transition hover:bg-[#00c982] disabled:opacity-50"

          >

            {joining ? (

              <LoaderCircle className="animate-spin" size={17} />

            ) : (

              <ArrowRight size={17} />

            )}

            Join with code

          </button>

        </form>



        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <div>

            <h3 className="text-xl font-extrabold">Active Battles</h3>

            <p className="mt-1 text-sm text-slate-600">

              Public and private rooms waiting to start, including full rooms.

            </p>

          </div>



          <button

            type="button"

            onClick={() => loadRooms(true)}

            disabled={refreshing}

            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#e8fff7] disabled:opacity-50"

          >

            <RefreshCw

              size={15}

              className={refreshing ? "animate-spin" : ""}

            />

            Refresh

          </button>

        </div>



        {loading ? (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {[1, 2, 3].map((item) => (

              <div

                key={item}

                className="h-52 animate-pulse rounded-2xl border border-[#063b49]/10 bg-slate-100"

              />

            ))}

          </div>

        ) : rooms.length ? (

          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">

            <AnimatePresence>

              {rooms.map((room, index) => {

                const players = (room.players || []).filter(

                  (player) => !player.isRemoved

                );



                const isPrivate =

                  String(room.roomType || "Public").toLowerCase() ===

                  "private";



                const isFull =

                  players.length >= Number(room.maxPlayers || Infinity);



                return (

                  <motion.article

                    key={getRoomId(room) || index}

                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}

                    animate={{ opacity: 1, y: 0 }}

                    exit={{ opacity: 0, scale: 0.98 }}

                    transition={{ delay: index * 0.04 }}

                    className={cardClass}

                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8fff7]">

                        <Swords size={21} />

                      </div>



                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00d98b]/30 bg-[#e8fff7] px-2.5 py-1 text-xs font-bold text-[#008b5e]">

                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                        Waiting

                      </span>

                    </div>



                    <h4 className="mt-4 truncate text-lg font-extrabold">

                      {room.roomName || "Untitled battle"}

                    </h4>



                    <p className="mt-1 truncate text-sm text-slate-600">

                      Host: {room.host?.name || room.hostName || "QuizArena player"}

                    </p>



                    <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600">

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

                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#063b49]/10 bg-[#f7f9fb] px-4 text-sm font-bold transition hover:bg-[#e8fff7] disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      {isPrivate ? (

                        <>

                          <LockKeyhole size={16} />

                          Join with code

                        </>

                      ) : isFull ? (

                        "Room full"

                      ) : (

                        <>

                          Join battle

                          <ArrowRight size={16} />

                        </>

                      )}

                    </button>

                  </motion.article>

                );

              })}

            </AnimatePresence>

          </div>

        ) : (

          <div className="rounded-2xl border border-dashed border-[#063b49]/20 bg-[#f7f9fb] px-5 py-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8fff7]">

              <Wifi size={25} />

            </div>



            <h4 className="mt-4 text-lg font-extrabold">

              No active battles right now

            </h4>



            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">

              Start your own battle and invite your friends, or refresh in a

              moment to see newly created rooms.

            </p>



            <button

              type="button"

              onClick={() => navigate("/battle/create")}

              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#063b49] px-4 text-sm font-bold text-white transition hover:bg-[#074757]"

            >

              <Plus size={17} />

              Create the first battle

            </button>

          </div>

        )}

      </div>



      <AnimatePresence>

        {privateJoinOpen && (

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            className="fixed inset-0 z-50 flex items-center justify-center bg-[#063b49]/50 p-4 backdrop-blur-sm"

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

              className="w-full max-w-md rounded-3xl border border-[#063b49]/10 bg-white p-6 text-[#063b49] shadow-2xl"

              role="dialog"

              aria-modal="true"

              aria-labelledby="private-room-title"

            >

              <div className="mb-5 flex items-start justify-between gap-4">

                <div>

                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8fff7]">

                    <LockKeyhole size={23} />

                  </div>



                  <h2 id="private-room-title" className="text-xl font-extrabold">

                    Join private room

                  </h2>



                  <p className="mt-2 text-sm text-slate-600">

                    Enter the invitation code to join{" "}

                    <span className="font-semibold text-[#063b49]">

                      {privateJoinRoom?.roomName || "this battle"}

                    </span>.

                  </p>

                </div>



                <button

                  type="button"

                  disabled={joining}

                  onClick={() => setPrivateJoinOpen(false)}

                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"

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

                    className="mt-2 h-12 w-full rounded-xl border border-[#063b49]/15 bg-white px-4 font-mono tracking-widest outline-none focus:border-[#00c982] focus:ring-4 focus:ring-[#00d98b]/10"

                  />

                </label>



                <div className="flex gap-3">

                  <button

                    type="button"

                    disabled={joining}

                    onClick={() => {

                      setPrivateJoinOpen(false);

                      setError("");

                    }}

                    className="min-h-12 flex-1 rounded-xl border border-[#063b49]/15 px-4 text-sm font-bold transition hover:bg-slate-50 disabled:opacity-50"

                  >

                    Cancel

                  </button>



                  <button

                    type="submit"

                    disabled={joining || !privateJoinCode.trim()}

                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#00d98b] px-4 text-sm font-bold text-[#063b49] transition hover:bg-[#00c982] disabled:cursor-not-allowed disabled:opacity-50"

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

                  <p className="text-sm text-red-600" role="alert">

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
