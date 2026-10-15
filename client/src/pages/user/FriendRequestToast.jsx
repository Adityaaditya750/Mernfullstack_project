import { useCallback, useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { apiRequest, jsonBody } from "../../lib/api";
import socket, { connectSocket } from "../../socket";

const REFRESH_EVENT = "quizarena:friend-requests-changed";

export default function FriendRequestToast() {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshNotifications = useCallback(() => {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const handleRequest = (payload = {}) => {
      const sender = payload.requester || payload.user || {};

      setRequest({
        requestId: payload.requestId || payload._id,
        sender,
      });

      setError("");
      refreshNotifications();
    };

    socket.on("friend-request-received", handleRequest);

    try {
      connectSocket(token);
    } catch (err) {
      console.error("Socket connection failed:", err);
    }

    return () => {
      socket.off("friend-request-received", handleRequest);
    };
  }, [refreshNotifications]);

  const respond = async (action) => {
    if (!request?.requestId || loading) return;

    setLoading(true);
    setError("");

    try {
      await apiRequest(
        `/friends/request/${request.requestId}/respond`,
        {
          method: "PATCH",
          body: jsonBody({ action }),
        }
      );

      setRequest(null);
      refreshNotifications();
    } catch (err) {
      setError(err.message || "Unable to update friend request.");
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  const senderName =
    request.sender?.name ||
    request.sender?.username ||
    "Someone";

  return (
    <div className="fixed right-3 top-3 z-[200] w-[calc(100%-1.5rem)] max-w-sm sm:right-5 sm:top-5">
      <div
        role="alert"
        className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
            <Bell size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900">
              New friend request
            </h3>

            <p className="mt-1 break-words text-sm text-slate-600">
              <span className="font-bold">{senderName}</span>
              {" "}sent you a friend request.
            </p>

            {request.sender?.username && (
              <p className="mt-1 text-xs text-slate-500">
                @{request.sender.username}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setRequest(null)}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mx-4 mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 p-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => respond("reject")}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={16} />
            Reject
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => respond("accept")}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check size={16} />
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}