import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  Clock3,
  RefreshCw,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { apiRequest, jsonBody } from "../../lib/api";
import socket, { connectSocket } from "../../socket";

const REFRESH_EVENT = "quizarena:friend-requests-changed";

function formatDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString();
}

export default function Notifications() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);

    try {
      const data = await apiRequest("/friends/requests");

      setIncoming(
        Array.isArray(data?.incoming) ? data.incoming : []
      );

      setOutgoing(
        Array.isArray(data?.outgoing) ? data.outgoing : []
      );

      setError("");
    } catch (err) {
      setError(err.message || "Unable to load friend requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        connectSocket(token);
      } catch (err) {
        console.error("Socket connection failed:", err);
      }
    }

    const refresh = () => loadRequests();

    socket.on("friend-request-received", refresh);
    window.addEventListener(REFRESH_EVENT, refresh);

    loadRequests(true);

    return () => {
      socket.off("friend-request-received", refresh);
      window.removeEventListener(REFRESH_EVENT, refresh);
    };
  }, [loadRequests]);

  const respond = async (requestId, action) => {
    if (!requestId || workingId) return;

    setWorkingId(requestId);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/friends/request/${requestId}/respond`,
        {
          method: "PATCH",
          body: jsonBody({ action }),
        }
      );

      setMessage(
        result?.message ||
          (action === "accept"
            ? "Friend request accepted."
            : "Friend request rejected.")
      );

      await loadRequests();

      window.dispatchEvent(new Event(REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Unable to respond to request.");
    } finally {
      setWorkingId("");
    }
  };

  const renderRequest = (request, type) => {
    const isIncoming = type === "incoming";
    const person = isIncoming
      ? request.requester
      : request.recipient;

    const name =
      person?.name ||
      person?.username ||
      "QuizArena user";

    return (
      <article
        key={request._id}
        className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
          <UserRound size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words font-extrabold text-slate-900">
            {name}
          </p>

          <p className="mt-1 break-words text-sm text-slate-500">
            {person?.username
              ? `@${person.username}`
              : "QuizArena member"}
          </p>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock3 size={13} />
            {formatDate(request.createdAt)}
          </p>
        </div>

        {isIncoming ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[190px]">
            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => respond(request._id, "reject")}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={16} />
              Reject
            </button>

            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => respond(request._id, "accept")}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={16} />
              {workingId === request._id ? "Saving..." : "Accept"}
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 sm:self-center">
            <Clock3 size={14} />
            Pending
          </span>
        )}
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
              <Bell size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your friend requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadRequests(true)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">
                  Incoming requests
                </h2>

                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-700">
                  {incoming.length} pending
                </span>
              </div>

              {incoming.length > 0 ? (
                <div className="space-y-3">
                  {incoming.map((request) =>
                    renderRequest(request, "incoming")
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Users
                    className="mx-auto text-slate-300"
                    size={30}
                  />
                  <p className="mt-3 font-bold text-slate-700">
                    No pending friend requests
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    New requests will appear here.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">
                  Sent requests
                </h2>

                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-extrabold text-slate-600">
                  {outgoing.length}
                </span>
              </div>

              {outgoing.length > 0 ? (
                <div className="space-y-3">
                  {outgoing.map((request) =>
                    renderRequest(request, "outgoing")
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  You have no outgoing requests.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}