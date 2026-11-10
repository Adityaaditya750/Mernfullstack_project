
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserMinus,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Clock3,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {apiRequest} from "../../lib/api";

const Profile = ({ friendsOnly = false }) => {
  const { user } = useAuth();
  const profileRole = user?.role === "admin" ? "Admin" : "Student";

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);

    try {
      const response = await apiRequest("/friends");
      setFriends(response?.friends || response?.data?.friends || []);
    } catch (err) {
      setError(err?.message || "Unable to load your friends.");
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);

    try {
      const response = await apiRequest("/friends/requests");

      setRequests({
        incoming: response?.incoming || response?.data?.incoming || [],
        outgoing: response?.outgoing || response?.data?.outgoing || [],
      });
    } catch (err) {
      setError(err?.message || "Unable to load friend requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  const searchUsers = async (event) => {
    event.preventDefault();

    const username = searchTerm.trim();

    if (username.length < 2) {
      setError("Enter at least 2 characters to search.");
      setNotice("");
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");
    setSearchResults([]);

    try {
      const response = await apiRequest(
        `/friends/search?username=${encodeURIComponent(username)}`
      );

      setSearchResults(response?.users || response?.data?.users || []);
    } catch (err) {
      setError(err?.message || "Unable to search users.");
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetUser) => {
    const targetId = targetUser?._id;

    if (!targetId) return;

    setActionId(targetId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(`/friends/request/${targetId}`, {
        method: "POST",
      });

      setNotice(response?.message || "Friend request sent successfully.");

      setSearchResults((previous) =>
        previous.map((item) =>
          item._id === targetId
            ? {
                ...item,
                friendship: {
                  status: "pending",
                  direction: "outgoing",
                },
              }
            : item
        )
      );

      await loadRequests();
      await loadFriends();
    } catch (err) {
      setError(err?.message || "Unable to send friend request.");
    } finally {
      setActionId("");
    }
  };

  const respondToRequest = async (requestId, action) => {
    setActionId(requestId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(
        `/friends/request/${requestId}/respond`,
        {
          method: "PATCH",
          body: { action },
        }
      );

      setNotice(
        response?.message ||
          (action === "accept"
            ? "Friend request accepted."
            : "Friend request rejected.")
      );

      await loadRequests();
      await loadFriends();
    } catch (err) {
      setError(err?.message || "Unable to update friend request.");
    } finally {
      setActionId("");
    }
  };

  const cancelRequest = async (requestId) => {
    setActionId(requestId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(
        `/friends/request/${requestId}`,
        { method: "DELETE" }
      );

      setNotice(response?.message || "Friend request cancelled.");

      await loadRequests();
      await searchAgainIfNeeded();
    } catch (err) {
      setError(err?.message || "Unable to cancel friend request.");
    } finally {
      setActionId("");
    }
  };

  const searchAgainIfNeeded = async () => {
    if (searchTerm.trim().length < 2) return;

    try {
      const response = await apiRequest(
        `/friends/search?username=${encodeURIComponent(searchTerm.trim())}`
      );

      setSearchResults(response?.users || response?.data?.users || []);
    } catch {
      // Keep the existing search results if refreshing fails.
    }
  };

  const removeFriend = async (friend) => {
    const friendId = friend?._id;

    if (!friendId) return;

    if (!window.confirm(`Remove ${friend.name || friend.username} from your friends?`)) {
      return;
    }

    setActionId(friendId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(`/friends/${friendId}`, {
        method: "DELETE",
      });

      setNotice(response?.message || "Friend removed successfully.");

      setFriends((previous) =>
        previous.filter((item) => item._id !== friendId)
      );

      await loadFriends();
    } catch (err) {
      setError(err?.message || "Unable to remove friend.");
    } finally {
      setActionId("");
    }
  };

  const getRequestId = (request) => request?._id;

  const getUserFromRequest = (request, type) =>
    type === "incoming" ? request?.requester : request?.recipient;

  const getFriendshipStatus = (friendship) => {
    if (!friendship || friendship.status === "none") {
      return "Add Friend";
    }

    if (friendship.status === "accepted") {
      return "Already Friends";
    }

    if (friendship.status === "pending") {
      return friendship.direction === "incoming"
        ? "Request Received"
        : "Request Pending";
    }

    return "Add Friend";
  };

  const initials = (name = "User") =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const SectionTitle = ({ icon: Icon, title, subtitle, count }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Icon size={21} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {count !== undefined && (
        <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">
          {count}
        </span>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#F7F8FC] px-4 py-6 sm:px-6 sm:py-10 ${friendsOnly ? 'friends-page' : 'profile-reference'}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        {friendsOnly && (
          <h1 className="text-4xl font-bold tracking-[-0.04em] text-[#f4f4f6] sm:text-5xl">
            Friends
          </h1>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {!friendsOnly && (
          <div className="profile-cards grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="profile-card min-w-0 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="profile-identity flex items-center gap-4">
                <div className="profile-avatar flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold sm:h-24 sm:w-24 sm:text-3xl">
                  {initials(user?.name || user?.username)}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">
                    {user?.name || user?.username || "Your Profile"}
                  </h1>
                  <span className="profile-role mt-2 inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold">
                    {profileRole}
                  </span>
                </div>
              </div>

              <dl className="profile-details mt-7">
                <div className="profile-detail-row flex items-center justify-between gap-4 border-b py-4">
                  <dt>Name</dt>
                  <dd>{user?.name || "Not provided"}</dd>
                </div>
                <div className="profile-detail-row flex items-center justify-between gap-4 border-b py-4">
                  <dt>Username</dt>
                  <dd>{user?.username ? `@${user.username}` : "Not provided"}</dd>
                </div>
                <div className="profile-detail-row flex items-center justify-between gap-4 border-b py-4">
                  <dt>Email</dt>
                  <dd>{user?.email || "Not provided"}</dd>
                </div>
                <div className="profile-detail-row flex items-center justify-between gap-4 py-4">
                  <dt>Role</dt>
                  <dd>{profileRole}</dd>
                </div>
              </dl>
            </section>

            <section className="profile-card min-w-0 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-bold sm:text-3xl">Friends</h2>
              {loadingFriends ? (
                <div className="flex justify-center py-10" role="status">
                  <LoaderCircle className="animate-spin text-violet-600" size={27} />
                </div>
              ) : friends.length === 0 ? (
                <div className="profile-empty-state mt-5 rounded-2xl border border-dashed p-6 text-center">
                  <Users size={30} className="mx-auto" />
                  <p className="mt-3 font-semibold">No friends yet</p>
                  <p className="mt-1 text-sm">Find players and send a friend request.</p>
                </div>
              ) : (
                <ul className="profile-friend-list mt-4">
                  {friends.slice(0, 5).map((friend) => (
                    <li
                      key={friend._id}
                      className="profile-friend-row flex min-w-0 items-center gap-3 border-b py-4"
                    >
                      <span className="profile-friend-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold">
                        {initials(friend.name || friend.username)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        @{friend.username || friend.name || "player"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/friends"
                className="profile-manage-friends mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-bold"
              >
                Manage friends
              </Link>
            </section>
          </div>
        )}

        {friendsOnly && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={Search}
                title="Find Friends"
                subtitle="Search for players by username"
              />

              <form onSubmit={searchUsers} className="mt-5">
                <label
                  htmlFor="friend-username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Search username
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="friend-username"
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Enter at least 2 characters..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {searching ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                    Search
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Search matches usernames. Enter at least two characters.
                </p>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-5 space-y-3">
                  {searchResults.map((result) => {
                    const status = getFriendshipStatus(result.friendship);
                    const targetId = result._id;

                    return (
                      <div
                        key={targetId}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 font-bold text-violet-700">
                            {initials(result.name || result.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-bold text-slate-900">
                              {result.name || "QuizArena Player"}
                            </p>
                            <p className="mt-0.5 break-words text-sm text-slate-500">
                              @{result.username}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {result.friendship?.status === "none" ||
                          result.friendship?.status === "rejected" ? (
                            <button
                              type="button"
                              disabled={actionId === targetId}
                              onClick={() => sendRequest(result)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
                            >
                              {actionId === targetId ? (
                                <LoaderCircle size={16} className="animate-spin" />
                              ) : (
                                <UserPlus size={16} />
                              )}
                              Add Friend
                            </button>
                          ) : result.friendship?.status === "pending" &&
                            result.friendship?.direction === "incoming" ? (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
                              <Clock3 size={15} /> Request Received
                            </span>
                          ) : result.friendship?.status === "pending" ? (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700">
                              <Clock3 size={15} /> Request Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                              <UserCheck size={16} /> Already Friends
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!searching &&
                searchTerm.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <Users size={30} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700">
                      No matching users found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another username.
                    </p>
                  </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={UserPlus}
                title={friendsOnly ? "Requests" : "Incoming Requests"}
                subtitle="Players who want to connect with you"
                count={requests.incoming.length}
              />

              <div className="mt-5 space-y-3">
                {loadingRequests ? (
                  <div className="flex justify-center py-7">
                    <LoaderCircle className="animate-spin text-violet-600" size={25} />
                  </div>
                ) : requests.incoming.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-7 text-center">
                    <Users size={28} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No incoming friend requests
                    </p>
                  </div>
                ) : (
                  requests.incoming.map((request) => {
                    const requester = getUserFromRequest(request, "incoming");
                    const requestId = getRequestId(request);

                    return (
                      <div
                        key={requestId}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 font-bold text-violet-700">
                            {initials(requester?.name || requester?.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-bold text-slate-800">
                              {requester?.name || "QuizArena Player"}
                            </p>
                            <p className="break-words text-sm text-slate-500">
                              @{requester?.username || "unknown"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === requestId}
                            onClick={() => respondToRequest(requestId, "accept")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:flex-none"
                          >
                            <UserCheck size={16} /> Accept
                          </button>
                          <button
                            type="button"
                            disabled={actionId === requestId}
                            onClick={() => respondToRequest(requestId, "reject")}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60 sm:flex-none"
                          >
                            <UserX size={16} /> Reject
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={Clock3}
                title="Sent Requests"
                subtitle="Requests waiting for a response"
                count={requests.outgoing.length}
              />

              <div className="mt-5 space-y-3">
                {loadingRequests ? (
                  <div className="flex justify-center py-7">
                    <LoaderCircle className="animate-spin text-violet-600" size={25} />
                  </div>
                ) : requests.outgoing.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-7 text-center">
                    <Clock3 size={28} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No pending sent requests
                    </p>
                  </div>
                ) : (
                  requests.outgoing.map((request) => {
                    const recipient = getUserFromRequest(request, "outgoing");
                    const requestId = getRequestId(request);

                    return (
                      <div
                        key={requestId}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                            {initials(recipient?.name || recipient?.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words font-bold text-slate-800">
                              {recipient?.name || "QuizArena Player"}
                            </p>
                            <p className="break-words text-sm text-slate-500">
                              @{recipient?.username || "unknown"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={actionId === requestId}
                          onClick={() => cancelRequest(requestId)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                        >
                          {actionId === requestId ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <X size={16} />
                          )}
                          Cancel Request
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={Users}
                title={friendsOnly ? "Your friends" : "My Friends"}
                subtitle="Your QuizArena connections"
                count={friends.length}
              />

              <div className="mt-5">
                {loadingFriends ? (
                  <div className="flex justify-center py-10">
                    <LoaderCircle className="animate-spin text-violet-600" size={27} />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                    <Users size={34} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-bold text-slate-700">
                      Your friends list is empty
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Search by username above to find other players.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {friends.map((friend) => (
                      <div
                        key={friend._id}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:shadow-sm"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 font-bold text-violet-700">
                          {initials(friend.name || friend.username)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-bold text-slate-900">
                            {friend.name || "QuizArena Player"}
                          </p>
                          <p className="mt-0.5 break-words text-xs text-slate-500">
                            @{friend.username || "unknown"}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={13} /> Friend
                          </span>
                        </div>

                        <button
                          type="button"
                          title="Remove friend"
                          aria-label={`Remove ${friend.name || friend.username}`}
                          disabled={actionId === friend._id}
                          onClick={() => removeFriend(friend)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {actionId === friend._id ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <UserMinus size={17} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
          </div>
        )}

        <p className="pb-4 text-center text-xs text-slate-400">
          QuizArena · Connect with players and challenge your friends.
        </p>
      </div>
    </div>
  );
};

export default Profile;
