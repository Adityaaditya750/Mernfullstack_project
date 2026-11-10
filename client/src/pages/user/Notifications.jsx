import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  Clock3,
  RefreshCw,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest, jsonBody } from "../../lib/api";

const REFRESH_EVENT = "quizarena:notifications-changed";

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString();
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);

    try {
      const [notificationData, requestData] = await Promise.all([
        apiRequest("/notifications"),
        apiRequest("/friends/requests"),
      ]);
      setNotifications(notificationData.notifications || []);
      setIncoming(requestData.incoming || []);
      setOutgoing(requestData.outgoing || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => loadNotifications();
    window.addEventListener(REFRESH_EVENT, refresh);
    loadNotifications(true);
    return () => window.removeEventListener(REFRESH_EVENT, refresh);
  }, [loadNotifications]);

  const markRead = async (notificationId) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
      window.dispatchEvent(new Event(REFRESH_EVENT));
      return true;
    } catch (err) {
      setError(err.message || "Unable to mark notification as read.");
      return false;
    }
  };

  const handleFriendRequest = async (notification, action) => {
    const requestId = notification.data?.friendRequestId;
    if (!requestId || workingId) return;

    setWorkingId(notification._id);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/friends/request/${requestId}/respond`, {
        method: "PATCH",
        body: jsonBody({ action }),
      });
      await loadNotifications();
      window.dispatchEvent(new Event(REFRESH_EVENT));
      setMessage(action === "accept" ? "Friend request accepted." : "Friend request declined.");
    } catch (err) {
      setError(err.message || "Unable to respond to friend request.");
    } finally {
      setWorkingId("");
    }
  };

  const savedFriendRequestIds = new Set(
    notifications
      .filter((item) => item.type === "friend_request")
      .map((item) => item.data?.friendRequestId)
      .filter(Boolean)
  );
  const legacyIncoming = incoming.filter(
    (request) => !savedFriendRequestIds.has(String(request._id))
  );

  const handleBattleInvite = async (notification) => {
    if (workingId) return;

    setWorkingId(notification._id);
    setError("");
    setMessage("");
    try {
      const invitation = await apiRequest(
        `/notifications/${notification._id}/respond`,
        {
          method: "PATCH",
          body: jsonBody({ action: "accept" }),
        }
      );
      const joined = await apiRequest("/room/join", {
        method: "POST",
        body: jsonBody({ roomCode: invitation.roomCode }),
      });
      await markRead(notification._id);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? { ...item, status: "accepted" }
            : item
        )
      );
      navigate(`/battle/${joined.room?._id || invitation.roomId}`);
    } catch (err) {
      setError(err.message || "Unable to join this battle.");
    } finally {
      setWorkingId("");
    }
  };

  const declineBattleInvite = async (notification) => {
    if (workingId) return;

    setWorkingId(notification._id);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/notifications/${notification._id}/respond`, {
        method: "PATCH",
        body: jsonBody({ action: "decline" }),
      });
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                status: "declined",
                readAt: new Date().toISOString(),
              }
            : item
        )
      );
      window.dispatchEvent(new Event(REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Unable to decline this invitation.");
    } finally {
      setWorkingId("");
    }
  };

  const deleteNotification = async (notificationId) => {
    if (workingId) return;
    setWorkingId(notificationId);
    setError("");
    try {
      await apiRequest(`/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((current) =>
        current.filter((item) => item._id !== notificationId)
      );
      window.dispatchEvent(new Event(REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Unable to delete notification.");
    } finally {
      setWorkingId("");
    }
  };

  const markAllRead = async () => {
    setError("");
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt }))
      );
      window.dispatchEvent(new Event(REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Unable to mark notifications as read.");
    }
  };

  const renderNotification = (notification) => {
    const actorName =
      notification.actor?.name ||
      notification.actor?.username ||
      "QuizArena member";
    const isFriendRequest = notification.type === "friend_request";
    const isBattleInvite = notification.type === "battle_invite";
    const friendRequestPending =
      isFriendRequest && notification.status === "pending";
    const battleInvitePending =
      isBattleInvite && notification.status === "pending";
    const battleInviteJoinable =
      isBattleInvite && notification.status !== "declined";

    return (
      <article
        key={notification._id}
        className={`flex min-w-0 flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5 ${
          notification.readAt
            ? "border-[#292b35] bg-[#14151b]"
            : "border-[#526421] bg-[#1a1d17]"
        }`}
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#242630] text-[#c4f52c]">
          {isBattleInvite ? <Users size={21} /> : <UserRound size={21} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-[#f4f4f6]">
              {notification.title}
            </p>
            {!notification.readAt && (
              <span className="rounded-full bg-[#c4f52c] px-2 py-0.5 text-[10px] font-black uppercase text-[#101109]">
                New
              </span>
            )}
          </div>
          <p className="mt-1 break-words text-sm text-[#b7b9c4]">
            {notification.message || `${actorName} sent you a notification.`}
          </p>
          {isBattleInvite && notification.data?.roomName && (
            <p className="mt-1 text-xs text-[#a2a4b1]">
              Room: {notification.data.roomName}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[#858894]">
            <Clock3 size={13} />
            {formatDate(notification.createdAt)}
          </p>
          {isBattleInvite && notification.status === "declined" && (
            <p className="mt-2 text-xs font-semibold text-[#a2a4b1]">
              Invitation declined
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {friendRequestPending && (
            <>
              <button
                type="button"
                disabled={Boolean(workingId)}
                onClick={() => handleFriendRequest(notification, "reject")}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#343641] px-3 text-sm font-bold text-[#d9dae0] hover:bg-[#20212a] disabled:opacity-50"
              >
                <X size={15} />
                Decline
              </button>
              <button
                type="button"
                disabled={Boolean(workingId)}
                onClick={() => handleFriendRequest(notification, "accept")}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#c4f52c] px-3 text-sm font-bold text-[#101109] hover:bg-[#d2ff43] disabled:opacity-50"
              >
                <Check size={15} />
                {workingId === notification._id ? "Saving..." : "Accept"}
              </button>
            </>
          )}
          {battleInvitePending && (
            <>
              <button
                type="button"
                disabled={Boolean(workingId)}
                onClick={() => declineBattleInvite(notification)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#343641] px-3 text-sm font-bold text-[#d9dae0] hover:bg-[#20212a] disabled:opacity-50"
              >
                <X size={15} />
                Decline
              </button>
            </>
          )}
          {battleInviteJoinable && (
            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => handleBattleInvite(notification)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#c4f52c] px-3 text-sm font-bold text-[#101109] hover:bg-[#d2ff43] disabled:opacity-50"
            >
              {workingId === notification._id
                ? "Joining..."
                : notification.status === "accepted"
                  ? "Open room"
                  : "Join room"}
            </button>
          )}
          {!notification.readAt && (
            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => markRead(notification._id)}
              aria-label="Mark as read"
              title="Mark as read"
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#343641] text-[#a2a4b1] hover:bg-[#20212a] hover:text-[#c4f52c] disabled:opacity-50"
            >
              <Check size={16} />
            </button>
          )}
          <button
            type="button"
            disabled={Boolean(workingId)}
            onClick={() => deleteNotification(notification._id)}
            aria-label="Delete notification"
            title="Delete notification"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[#343641] text-[#a2a4b1] hover:bg-rose-950 hover:text-rose-300 disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-dvh bg-[#0b0c10] px-3 py-6 text-[#f4f4f6] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#20212a] text-[#c4f52c]">
              <Bell size={23} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-[#a2a4b1]">
                Friend requests, battle invitations, and updates.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={!notifications.some((item) => !item.readAt)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#343641] px-3 text-sm font-bold text-[#d9dae0] hover:bg-[#1d1f27] disabled:opacity-40"
            >
              <Check size={15} />
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#343641] px-3 text-sm font-bold text-[#d9dae0] hover:bg-[#1d1f27] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-[#526421] bg-[#1a1d17] p-3 text-sm font-semibold text-[#d2ff43]"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#292b35] bg-[#17181f] p-10 text-center text-sm text-[#a2a4b1]">
            Loading notifications...
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-extrabold">Your inbox</h2>
              {notifications.length ? (
                <div className="space-y-3">
                  {notifications.map(renderNotification)}
                </div>
              ) : legacyIncoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#343641] bg-[#14151b] p-8 text-center">
                  <Bell className="mx-auto text-[#555866]" size={30} />
                  <p className="mt-3 font-bold text-[#e2e3e7]">
                    You're all caught up
                  </p>
                  <p className="mt-1 text-sm text-[#a2a4b1]">
                    New friend requests and battle invitations will appear here.
                  </p>
                </div>
              ) : null}
            </section>

            {legacyIncoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-extrabold">
                  Incoming friend requests
                </h2>
                <div className="space-y-3">
                  {legacyIncoming.map((request) => {
                    const requester = request.requester;
                    const fallbackNotification = {
                      _id: `friend-request-${request._id}`,
                      data: { friendRequestId: request._id },
                    };
                    return (
                      <article
                        key={request._id}
                        className="flex flex-col gap-4 rounded-2xl border border-[#526421] bg-[#1a1d17] p-4 sm:flex-row sm:items-center sm:p-5"
                      >
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#242630] text-[#c4f52c]">
                          <UserRound size={21} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-[#f4f4f6]">
                            {requester?.name ||
                              requester?.username ||
                              "QuizArena member"}
                          </p>
                          <p className="mt-1 text-sm text-[#b7b9c4]">
                            Sent you a friend request.
                          </p>
                          <p className="mt-2 text-xs text-[#858894]">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={Boolean(workingId)}
                            onClick={() =>
                              handleFriendRequest(fallbackNotification, "reject")
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#343641] px-3 text-sm font-bold text-[#d9dae0] hover:bg-[#20212a] disabled:opacity-50"
                          >
                            <X size={15} />
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(workingId)}
                            onClick={() =>
                              handleFriendRequest(fallbackNotification, "accept")
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#c4f52c] px-3 text-sm font-bold text-[#101109] hover:bg-[#d2ff43] disabled:opacity-50"
                          >
                            <Check size={15} />
                            Accept
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">Sent friend requests</h2>
                <span className="rounded-full bg-[#20212a] px-3 py-1 text-xs font-extrabold text-[#b7b9c4]">
                  {outgoing.length} pending
                </span>
              </div>
              {outgoing.length ? (
                <div className="space-y-3">
                  {outgoing.map((request) => {
                    const person = request.recipient;
                    return (
                      <article
                        key={request._id}
                        className="flex items-center gap-4 rounded-2xl border border-[#292b35] bg-[#14151b] p-4"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#242630] text-[#a2a4b1]">
                          <Users size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-[#f4f4f6]">
                            {person?.name || person?.username || "QuizArena member"}
                          </p>
                          <p className="mt-1 text-xs text-[#858894]">
                            Sent {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#242630] px-3 py-1.5 text-xs font-bold text-[#b7b9c4]">
                          <Clock3 size={13} />
                          Pending
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-[#292b35] bg-[#14151b] p-5 text-sm text-[#a2a4b1]">
                  You have no outgoing friend requests.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
