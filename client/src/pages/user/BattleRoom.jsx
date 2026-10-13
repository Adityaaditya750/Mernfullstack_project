import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Copy,
  Crown,
  Gamepad2,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Swords,
  Tag,
  Trophy,
  Users,
  FileQuestion,
  Zap,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { apiRequest, jsonBody } from "../../lib/api";
import socket, { connectSocket } from "../../socket";

const statusStyles = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  unknown: "bg-slate-300",
};

function Panel({ children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-[0_8px_30px_rgba(89,91,180,0.07)] sm:p-5 lg:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#101b45] sm:text-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600">
          <Icon size={21} />
        </span>
        {children}
      </h2>
      {right}
    </div>
  );
}

function FriendAvatar({ name, color = "bg-indigo-100" }) {
  return (
    <div
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${color} text-lg font-bold text-indigo-700 ring-2 ring-white sm:h-12 sm:w-12`}
      aria-label={`${name} avatar`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

const idOf = (value) =>
  typeof value === "string"
    ? value
    : value?._id
      ? String(value._id)
      : "";

const formatDuration = (seconds) => {
  const minutes = Math.floor((Number(seconds) || 0) / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hour${hours === 1 ? "" : "s"}`;
};

export default function BattleRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user?.user || user;

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const [room, setRoom] = useState(null);
  const [friends, setFriends] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [presence, setPresence] = useState({});
  const [selected, setSelected] = useState([]);
  const [sent, setSent] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  const loadRoom = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);

      try {
        const data = await apiRequest(`/room/${roomId}`);
        const roomData = data?.room;

        if (!roomData?._id) {
          throw new Error(
            data?.message || "Room details were not returned."
          );
        }

        setRoom(roomData);
        setError("");

        if (roomData.status === "Started" && roomData.myResponseId) {
          const quizId = idOf(roomData.quiz);

          if (quizId) {
            navigate(
              `/quiz/${quizId}/attempt/${roomData.myResponseId}`,
              {
                replace: true,
                state: { startedAt: roomData.startedAt },
              }
            );
          }
        }
      } catch (requestError) {
        setError(
          requestError.message || "Unable to load this battle room."
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [navigate, roomId]
  );

  useEffect(() => {
    loadRoom(true);
  }, [loadRoom]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      apiRequest("/friends"),
      apiRequest("/quiz/list"),
    ])
      .then(([friendResult, quizResult]) => {
        if (!active) return;

        if (friendResult.status === "fulfilled") {
          setFriends(friendResult.value?.friends || []);
        } else {
          setError(
            friendResult.reason?.message ||
              "Unable to load your friends."
          );
        }

        if (quizResult.status === "fulfilled") {
          setQuizzes(quizResult.value?.quizzes || []);
        } else {
          setError(
            quizResult.reason?.message ||
              "Unable to load published quizzes."
          );
        }
      })
      .finally(() => {
        if (active) setFriendsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const usernameQuery = search.trim().replace(/^@/, "");

  useEffect(() => {
    if (usernameQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setRequestMessage("");
      return undefined;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const data = await apiRequest(
          `/friends/search?username=${encodeURIComponent(usernameQuery)}`
        );

        if (!cancelled) {
          setSearchResults(
            Array.isArray(data?.users) ? data.users : []
          );
        }
      } catch (searchError) {
        if (!cancelled) {
          setSearchResults([]);
          setError(searchError.message || "Unable to search users.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [usernameQuery]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return undefined;

    const joinRoom = () => {
      if (room?.roomCode) {
        socket.emit("join-room", { roomCode: room.roomCode });
      }
    };

    const refreshRoom = () => loadRoom();

    const handlePresence = ({ userId, status } = {}) => {
      if (userId && ["online", "offline"].includes(status)) {
        setPresence((current) => ({
          ...current,
          [String(userId)]: status,
        }));
      }
    };

    const handlePresenceSnapshot = ({ statuses } = {}) => {
      if (statuses && typeof statuses === "object") {
        setPresence((current) => ({ ...current, ...statuses }));
      }
    };

    const handleInviteSent = ({ recipient } = {}) => {
      const recipientId = idOf(recipient);

      if (recipientId) {
        setSent((current) => [
          ...new Set([...current, recipientId]),
        ]);

        setSuccess(
          `Invitation sent to ${recipient.name || "your friend"}.`
        );
      }
    };

    const handleInviteError = ({ message, recipientId } = {}) => {
      if (recipientId) {
        setSent((current) =>
          current.filter((id) => id !== String(recipientId))
        );
      }

      setError(message || "Unable to send the battle invitation.");
    };

    const handleRoomError = ({ message } = {}) => {
      setError(message || "Unable to connect to the battle room.");
    };

    const handleSocketError = (connectionError) => {
      setError(
        connectionError.message ||
          "Unable to connect to the battle server."
      );
    };

    socket.on("connect", joinRoom);
    socket.on("room-updated", refreshRoom);
    socket.on("battle-started", refreshRoom);
    socket.on("battle-ended", refreshRoom);
    socket.on("timer-ended", refreshRoom);
    socket.on("leaderboard-updated", refreshRoom);
    socket.on("player-left", refreshRoom);
    socket.on("friend-presence", handlePresence);
    socket.on("friend-presence-snapshot", handlePresenceSnapshot);
    socket.on("battle-invitation-sent", handleInviteSent);
    socket.on("battle-invitation-error", handleInviteError);
    socket.on("room-error", handleRoomError);
    socket.on("connect_error", handleSocketError);

    try {
      connectSocket(token);

      if (socket.connected) joinRoom();
    } catch (connectionError) {
      setError(
        connectionError.message ||
          "Unable to connect to the battle room."
      );
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("room-updated", refreshRoom);
      socket.off("battle-started", refreshRoom);
      socket.off("battle-ended", refreshRoom);
      socket.off("timer-ended", refreshRoom);
      socket.off("leaderboard-updated", refreshRoom);
      socket.off("player-left", refreshRoom);
      socket.off("friend-presence", handlePresence);
      socket.off("friend-presence-snapshot", handlePresenceSnapshot);
      socket.off("battle-invitation-sent", handleInviteSent);
      socket.off("battle-invitation-error", handleInviteError);
      socket.off("room-error", handleRoomError);
      socket.off("connect_error", handleSocketError);
    };
  }, [loadRoom, room?.roomCode]);

  useEffect(() => {
    if (room?.status !== "Completed") return undefined;

    let active = true;

    apiRequest(`/room/${roomId}/leaderboard`)
      .then((data) => {
        if (active) setLeaderboard(data?.leaderboard || []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.message || "Unable to load battle results."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [room?.status, roomId]);

  const currentPlayer = room?.players?.find(
    (player) => idOf(player.user) === idOf(currentUser)
  );

  const isHost = Boolean(
    room && idOf(room.host) === idOf(currentUser)
  );

  const activePlayers = useMemo(
    () => (room?.players || []).filter((player) => !player.isRemoved),
    [room?.players]
  );

  const roomPlayerIds = useMemo(
    () => new Set(activePlayers.map((player) => idOf(player.user))),
    [activePlayers]
  );

  const roomIsFull =
    activePlayers.length >= Number(room?.maxPlayers || 0);

  const filteredFriends = friends.filter((friend) =>
    `${friend.name || ""} ${friend.username || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const roomStatus = room?.status || "Waiting";
  const battleDuration = Number(room?.battleTime) || 0;

  const selectedQuiz =
    typeof room?.quiz === "object" ? room.quiz : null;

  const toggleFriend = (id) => {
    if (sent.includes(id)) return;

    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const sendFriendRequest = async (friend) => {
    const friendId = idOf(friend);

    if (!friendId || requestingId) return;

    setRequestingId(friendId);
    setRequestMessage("");
    setError("");

    try {
      const data = await apiRequest(`/friends/request/${friendId}`, {
        method: "POST",
      });

      setRequestMessage(data?.message || "Friend request sent.");

      const refreshed = await apiRequest(
        `/friends/search?username=${encodeURIComponent(usernameQuery)}`
      );

      setSearchResults(
        Array.isArray(refreshed?.users) ? refreshed.users : []
      );

      const friendData = await apiRequest("/friends");

      setFriends(
        Array.isArray(friendData?.friends) ? friendData.friends : []
      );
    } catch (requestError) {
      setError(
        requestError.message || "Could not send friend request."
      );
    } finally {
      setRequestingId("");
    }
  };

  const sendInvites = () => {
    if (!room?.roomCode || !socket.connected) {
      setError("Connect to the room before sending invitations.");
      return;
    }

    if (roomStatus !== "Waiting" || roomIsFull) {
      setError("This room is no longer accepting invitations.");
      return;
    }

    const inviteIds = selected.filter(
      (id) => !roomPlayerIds.has(id)
    );

    if (!inviteIds.length) return;

    setSent((current) => [
      ...new Set([...current, ...inviteIds]),
    ]);

    inviteIds.forEach((recipientId) => {
      socket.emit("send-battle-invite", {
        recipientId,
        roomCode: room.roomCode,
      });
    });

    setSelected([]);
    setError("");
    setSuccess("Invitations are being sent.");
  };

  const copyRoomCode = async () => {
    if (!room?.roomCode) return;

    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Unable to copy the room code.");
    }
  };

  const runRoomAction = async (
    path,
    method,
    body,
    successMessage
  ) => {
    if (busy) return null;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(path, {
        method,
        ...(body ? { body: jsonBody(body) } : {}),
      });

      if (data?.room?._id) setRoom(data.room);

      await loadRoom();

      setSuccess(data?.message || successMessage);

      return data;
    } catch (requestError) {
      setError(
        requestError.message ||
          "The room action could not be completed."
      );

      return null;
    } finally {
      setBusy(false);
    }
  };

  const selectQuiz = (quizId) => {
    if (!quizId || quizId === idOf(room?.quiz)) return;

    runRoomAction(
      `/room/${roomId}/select-quiz`,
      "PUT",
      { quizId },
      "Quiz selected."
    );
  };

  const startBattle = async () => {
    const result = await runRoomAction(
      `/room/${roomId}/start`,
      "PUT",
      null,
      "Battle started."
    );

    if (result?.room?.myResponseId) {
      const quizId = idOf(result.room.quiz) || idOf(room?.quiz);

      if (quizId) {
        navigate(
          `/quiz/${quizId}/attempt/${result.room.myResponseId}`,
          {
            replace: true,
            state: { startedAt: result.room.startedAt },
          }
        );
      } else {
        await loadRoom();
      }
    }
  };

  const leaveRoom = async () => {
    if (busy) return;

    const battleStarted =
        room?.status === "Started" && room?.isQuizStarted;

    const confirmed = window.confirm(
        battleStarted
            ? "Leave this battle? Your current answer will be submitted if you have selected one. The battle will continue for the other players."
            : isHost
              ? "You are the host. Leaving now will close the waiting room for everyone. Continue?"
              : "Are you sure you want to leave this waiting room?"
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
        // Submit the current answer first if it hasn't already been submitted.
        if (
            battleStarted &&
            currentQuestion?._id &&
            !submitted &&
            answer !== ""
        ) {
            const body = {
                roomId,
                questionId: currentQuestion._id,
            };

            if (
                currentQuestion.questionType === "MCQ" ||
                currentQuestion.questionType === "IMAGE"
            ) {
                body.selectedOption = Number(answer);
            } else if (
                currentQuestion.questionType === "TRUE_FALSE"
            ) {
                body.trueFalseAnswer = answer === "true";
            } else if (currentQuestion.questionType === "FILL") {
                body.fillBlankAnswer = answer.trim();
            } else if (currentQuestion.questionType === "LONG") {
                body.longAnswer = answer.trim();
            } else if (currentQuestion.questionType === "CODING") {
                body.codingAnswer = answer;
                body.codingLanguage =
                    currentQuestion.coding?.language || "";
            }

            await apiRequest("/room/submit-answer", {
                method: "POST",
                body: jsonBody(body),
            });

            sessionStorage.setItem(
                `battle-submitted-${roomId}-${currentQuestion._id}`,
                "true"
            );
        }

        // The backend finalizes the response and handles room membership.
        await apiRequest(`/room/${roomId}/leave`, {
            method: "DELETE",
        });

        navigate("/battle", { replace: true });
    } catch (requestError) {
        setError(
            requestError.message || "Unable to leave this battle."
        );
    } finally {
        setBusy(false);
    }
};

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f9ff] text-[#101b45]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow">
          <LoaderCircle
            className="animate-spin text-violet-600"
            size={21}
          />
          <span className="font-semibold">
            Loading battle room...
          </span>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] px-4 py-16 text-[#101b45]">
        <div className="mx-auto max-w-xl rounded-3xl border border-indigo-100 bg-white p-7 text-center shadow">
          <h1 className="text-2xl font-black">
            Battle room unavailable
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {error || "This room could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/battle")}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white"
          >
            Back to battles
          </button>

          <button
            type="button"
            onClick={() => loadRoom(true)}
            className="ml-2 mt-6 rounded-xl border border-indigo-200 px-5 py-3 font-bold text-violet-700"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(ellipse_at_top_left,_#e9e7ff_0%,_transparent_42%),radial-gradient(ellipse_at_top_right,_#dff6ff_0%,_transparent_38%),linear-gradient(135deg,#f8f9ff,#f0f2ff_55%,#f7f4ff)] text-[#101b45]">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-9">
        <header className="relative isolate overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-r from-white via-[#eef3ff] to-[#e9e2ff] p-5 shadow-[0_10px_35px_rgba(99,102,241,0.10)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 -z-10 h-40 w-40 rounded-full bg-sky-300/30 blur-3xl" />

          <button
            type="button"
            onClick={() =>
              roomStatus === "Waiting"
                ? leaveRoom()
                : navigate("/battle")
            }
            disabled={busy}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={17} />
            Back to Battle
          </button>

          <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-600 shadow-sm">
                <Swords size={14} />
                PLAY · CONNECT · COMPETE
              </span>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Battle{" "}
                <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
                  Room
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                {room.roomName ||
                  "Invite your friends, get ready, and compete to become the quiz champion."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[145px] rounded-2xl border border-indigo-100 bg-white/85 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Room code
                </p>

                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xl font-black tracking-wider">
                    {room.roomCode}
                  </span>

                  <button
                    type="button"
                    onClick={copyRoomCode}
                    className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
                    aria-label="Copy room code"
                  >
                    {copied ? (
                      <Check size={19} />
                    ) : (
                      <Copy size={19} />
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="text-xs text-emerald-600">Copied!</p>
                )}
              </div>

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold ${
                  roomStatus === "Waiting"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : roomStatus === "Started"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    roomStatus === "Waiting"
                      ? "bg-emerald-500"
                      : roomStatus === "Started"
                        ? "bg-blue-500"
                        : "bg-slate-400"
                  }`}
                />
                {roomStatus}
              </span>
            </div>
          </div>
        </header>

        {(error || success) && (
          <div
            role={error ? "alert" : "status"}
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        {roomStatus === "Completed" ? (
          <Panel className="mt-5">
            <SectionTitle
              icon={Trophy}
              right={
                <span className="text-sm font-semibold text-slate-500">
                  {leaderboard.length} players
                </span>
              }
            >
              Battle results
            </SectionTitle>

            {leaderboard.length ? (
              <div className="divide-y divide-indigo-50">
                {leaderboard.map((entry, index) => {
                  const playerName =
                    entry.user?.name || entry.name || "Player";

                  return (
                    <div
                      key={idOf(entry.user) || entry._id || index}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 font-black text-violet-700">
                        {index + 1}
                      </span>

                      <FriendAvatar name={playerName} />

                      <span className="min-w-0 flex-1 truncate font-bold">
                        {playerName}
                      </span>

                      <span className="text-sm font-extrabold text-violet-700">
                        {entry.score ?? entry.obtainedMarks ?? 0} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-indigo-50/60 px-4 py-6 text-center text-sm text-slate-600">
                Battle results are not available yet.
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate("/battle")}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 font-bold text-white hover:bg-violet-700"
            >
              <ArrowLeft size={17} />
              Back to battles
            </button>
          </Panel>
        ) : roomStatus === "Started" ? (
          <Panel className="mt-5 text-center">
            <LoaderCircle
              className="mx-auto animate-spin text-violet-600"
              size={30}
            />

            <h2 className="mt-3 text-lg font-extrabold">
              Battle in progress
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Loading your battle attempt...
            </p>

            <button
              type="button"
              onClick={() => loadRoom()}
              className="mt-4 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"
            >
              Retry
            </button>
          </Panel>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.3fr)] xl:gap-5">
              <Panel>
                <SectionTitle icon={Settings}>
                  Room Setup
                </SectionTitle>

                <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white">
                  <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-blue-50 p-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md shadow-violet-200">
                      <Lightbulb size={29} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-extrabold">
                        {selectedQuiz?.title || "Choose a quiz"}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {selectedQuiz?.description ||
                          "Select a quiz for this battle."}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-indigo-50 px-4">
                    {[
                      {
                        icon: BookOpen,
                        label: "Category",
                        value:
                          selectedQuiz?.category ||
                          selectedQuiz?.topic ||
                          "—",
                      },
                      {
                        icon: Tag,
                        label: "Difficulty",
                        value: selectedQuiz?.difficulty || "—",
                      },
                      {
                        icon: FileQuestion,
                        label: "Questions",
                        value:
                          selectedQuiz?.questionCount ||
                          room.totalQuestions ||
                          "—",
                      },
                      {
                        icon: Clock3,
                        label: "Duration",
                        value: battleDuration
                          ? formatDuration(battleDuration)
                          : "—",
                      },
                      {
                        icon: LockKeyhole,
                        label: "Room type",
                        value: room.roomType || "—",
                      },
                    ].map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <span className="flex items-center gap-2 text-slate-500">
                          <Icon size={16} />
                          {label}
                        </span>

                        <span className="text-right font-bold">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {isHost && roomStatus === "Waiting" && (
                  <label className="mt-4 block text-sm font-bold text-slate-700">
                    Select battle quiz

                    <select
                      value={idOf(room.quiz)}
                      onChange={(event) =>
                        selectQuiz(event.target.value)
                      }
                      disabled={busy}
                      className="mt-2 h-12 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                    >
                      <option value="">
                        Choose a published quiz
                      </option>

                      {quizzes.map((quiz) => (
                        <option key={quiz._id} value={quiz._id}>
                          {quiz.title} · {quiz.category} ·{" "}
                          {quiz.difficulty}
                        </option>
                      ))}
                    </select>

                    {!quizzes.length && (
                      <span className="mt-2 block text-xs font-normal text-slate-500">
                        No published quizzes are currently available.
                      </span>
                    )}
                  </label>
                )}

                {isHost ? (
                  <button
                    type="button"
                    onClick={startBattle}
                    disabled={
                      busy ||
                      roomStatus !== "Waiting" ||
                      !room.quiz ||
                      activePlayers.length < 2
                    }
                    className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 font-bold text-white shadow-lg shadow-violet-200/70 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {busy ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={19}
                      />
                    ) : (
                      <Zap size={19} />
                    )}
                    Start Battle
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      runRoomAction(
                        `/room/${roomId}/ready`,
                        "PUT",
                        null,
                        "Readiness updated."
                      )
                    }
                    disabled={busy || roomStatus !== "Waiting"}
                    className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <LoaderCircle
                        className="animate-spin"
                        size={19}
                      />
                    ) : (
                      <Check size={19} />
                    )}
                    {currentPlayer?.isReady
                      ? "Set me as not ready"
                      : "Mark me ready"}
                  </button>
                )}

                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                  {isHost
                    ? `${activePlayers.length} of ${room.maxPlayers} players joined. At least two players and a quiz are required to start.`
                    : "Let the host know when you are ready to play."}
                </p>
              </Panel>

              <Panel>
                <SectionTitle
                  icon={Users}
                  right={
                    <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700">
                      {activePlayers.length} / {room.maxPlayers}
                    </span>
                  }
                >
                  Players
                </SectionTitle>

                <div className="space-y-3">
                  {activePlayers.map((player, index) => {
                    const playerName = player.user?.name || "Player";
                    const playerIsHost =
                      player.isHost ||
                      idOf(player.user) === idOf(room.host);

                    return (
                      <div
                        key={idOf(player.user) || index}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-white to-indigo-50/60 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FriendAvatar
                            name={playerName}
                            color={
                              playerIsHost
                                ? "bg-violet-100"
                                : "bg-emerald-100"
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-extrabold">
                                {playerName}
                                {idOf(player.user) === idOf(currentUser)
                                  ? " (you)"
                                  : ""}
                              </p>

                              {playerIsHost && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  <Crown size={11} />
                                  Host
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {player.user?.username
                                ? `@${player.user.username}`
                                : "Battle player"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            player.isReady
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              player.isReady
                                ? "bg-emerald-500"
                                : "bg-amber-400"
                            }`}
                          />
                          {player.isReady ? "Ready" : "Not ready"}
                        </span>
                      </div>
                    );
                  })}

                  {Array.from(
                    {
                      length: Math.max(
                        0,
                        Number(room.maxPlayers) - activePlayers.length
                      ),
                    },
                    (_, index) => (
                      <div
                        key={`empty-slot-${index}`}
                        className="flex min-h-[78px] items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 px-4 py-3"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl text-violet-600 shadow-sm">
                          +
                        </span>
                        <span className="text-sm text-slate-500">
                          Waiting for player...
                        </span>
                      </div>
                    )
                  )}
                </div>
              </Panel>

              <Panel className="md:col-span-2 xl:col-span-1">
                <SectionTitle
                  icon={Users}
                  right={
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                      {friends.length}{" "}
                      {friends.length === 1 ? "friend" : "friends"}
                    </span>
                  }
                >
                  Invite Friends
                </SectionTitle>

                <label className="relative block min-w-0">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or username..."
                    className="h-12 w-full min-w-0 rounded-xl border border-indigo-100 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>

                {requestMessage && (
                  <p
                    role="status"
                    className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    {requestMessage}
                  </p>
                )}

                {usernameQuery.length >= 2 && (
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-white px-3">
                    <p className="py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Username search
                    </p>

                    {searching ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                        <LoaderCircle
                          className="animate-spin text-violet-600"
                          size={18}
                        />
                        Searching users...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="py-5 text-sm text-slate-500">
                        No users found for “{usernameQuery}”.
                      </p>
                    ) : (
                      searchResults.map((result) => {
                        const resultId = idOf(result);
                        const friendship = result.friendship || {};
                        const status = friendship.status || "none";
                        const direction = friendship.direction || null;
                        const alreadyInRoom =
                          roomPlayerIds.has(resultId);
                        const isSelected =
                          selected.includes(resultId);
                        const isSent = sent.includes(resultId);

                        return (
                          <div
                            key={resultId}
                            className="flex min-w-0 flex-wrap items-center gap-3 border-t border-indigo-50 py-3 sm:flex-nowrap"
                          >
                            <FriendAvatar
                              name={result.name || result.username}
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold">
                                {result.name || result.username}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                @{result.username}
                              </p>
                            </div>

                            {status === "accepted" ? (
                              <button
                                type="button"
                                onClick={() => toggleFriend(resultId)}
                                disabled={
                                  alreadyInRoom ||
                                  roomIsFull ||
                                  isSent ||
                                  roomStatus !== "Waiting"
                                }
                                className={`min-h-10 w-full rounded-xl px-3 text-xs font-bold sm:w-auto ${
                                  isSelected
                                    ? "bg-violet-100 text-violet-700"
                                    : "bg-gradient-to-r from-violet-600 to-blue-500 text-white"
                                }`}
                              >
                                {alreadyInRoom
                                  ? "In room"
                                  : isSent
                                    ? "Invited"
                                    : isSelected
                                      ? "Selected"
                                      : "Select invite"}
                              </button>
                            ) : status === "pending" &&
                              direction === "outgoing" ? (
                              <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                                Request sent
                              </span>
                            ) : status === "pending" &&
                              direction === "incoming" ? (
                              <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                                Request received
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => sendFriendRequest(result)}
                                disabled={Boolean(requestingId)}
                                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#101b45] px-3 text-xs font-bold text-white disabled:opacity-50 sm:w-auto"
                              >
                                {requestingId === resultId ? (
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Users size={14} />
                                )}
                                Add friend
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div className="mt-3 divide-y divide-indigo-50">
                  {usernameQuery.length < 2 &&
                    filteredFriends.map((friend) => {
                      const friendId = idOf(friend);
                      const friendStatus =
                        presence[friendId] || "unknown";
                      const isSelected = selected.includes(friendId);
                      const isSent = sent.includes(friendId);
                      const alreadyInRoom =
                        roomPlayerIds.has(friendId);

                      const unavailable =
                        friendStatus === "offline" ||
                        alreadyInRoom ||
                        roomIsFull;

                      return (
                        <div
                          key={friendId}
                          className="flex min-w-0 flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
                        >
                          <FriendAvatar name={friend.name} />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold">
                              {friend.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {friend.username
                                ? `@${friend.username}`
                                : "QuizArena friend"}
                            </p>
                          </div>

                          <div className="w-[115px] shrink-0">
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                              <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[friendStatus]}`}
                              />

                              {alreadyInRoom
                                ? "In this room"
                                : roomIsFull
                                  ? "Room is full"
                                  : friendStatus === "unknown"
                                    ? "Availability unknown"
                                    : friendStatus === "online"
                                      ? "Online"
                                      : "Offline"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleFriend(friendId)}
                            disabled={
                              unavailable ||
                              isSent ||
                              !friendId ||
                              roomStatus !== "Waiting"
                            }
                            className={`flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition disabled:cursor-not-allowed sm:w-[108px] ${
                              isSent
                                ? "border border-violet-200 bg-violet-50 text-violet-700"
                                : isSelected
                                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-300"
                                  : unavailable ||
                                      roomStatus !== "Waiting"
                                    ? "bg-slate-100 text-slate-400"
                                    : "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-md shadow-violet-100 hover:brightness-105"
                            }`}
                          >
                            {isSent ? (
                              <>
                                <Check size={15} /> Sent
                              </>
                            ) : isSelected ? (
                              <>
                                <Check size={15} /> Selected
                              </>
                            ) : (
                              <>
                                <Send size={14} /> Invite
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}

                  {friendsLoading ? (
                    <div className="py-10 text-center text-sm text-slate-500">
                      <LoaderCircle
                        className="mx-auto animate-spin text-violet-600"
                        size={24}
                      />
                      <p className="mt-2">Loading your friends...</p>
                    </div>
                  ) : (
                    usernameQuery.length < 2 &&
                    filteredFriends.length === 0 && (
                      <div className="py-10 text-center">
                        <Search
                          className="mx-auto text-slate-300"
                          size={30}
                        />
                        <p className="mt-2 text-sm font-semibold">
                          {friends.length
                            ? "No friends found"
                            : "Your friends list is empty"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {friends.length
                            ? "Try another name or username."
                            : "Add friends to invite them to a battle."}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {selected.length > 0 && (
                  <div className="sticky bottom-3 mt-4 rounded-2xl border border-violet-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {selected.length} friend
                        {selected.length > 1 ? "s" : ""} selected
                      </p>

                      <button
                        type="button"
                        onClick={sendInvites}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105"
                      >
                        <Send size={16} />
                        Send invites
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            <Panel className="mt-5">
              <div className="grid gap-5 md:grid-cols-[1fr_2fr] md:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold">
                    <Send className="text-violet-600" size={20} />
                    How to invite friends?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Invite your friends and fill the room before starting
                    the battle.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      icon: Search,
                      title: "Search friend",
                      text: "Find a friend by name or username.",
                    },
                    {
                      icon: Send,
                      title: "Send invite",
                      text: "Send a battle invitation.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Friend accepts",
                      text: "Your friend accepts the invitation.",
                    },
                    {
                      icon: Gamepad2,
                      title: "Join room",
                      text: "Your friend joins the waiting room.",
                    },
                  ].map(({ icon: Icon, title, text }, index) => (
                    <div
                      key={title}
                      className="flex items-start gap-3"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100 font-extrabold text-violet-700">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 text-sm font-bold">
                          <Icon
                            size={15}
                            className="text-violet-600"
                          />
                          {title}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          QuizArena · Learn, compete, and grow together.
        </p>
      </div>
    </main>
  );
}