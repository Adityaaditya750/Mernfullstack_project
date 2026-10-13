
import apiClient from "../lib/api";

export const searchUsers = async (username) => {
  const { data } = await apiClient.get("/api/friends/search", {
    params: { username },
  });
  return data;
};

export const getFriends = async () => {
  const { data } = await apiClient.get("/api/friends");
  return data;
};

export const getFriendRequests = async () => {
  const { data } = await apiClient.get("/api/friends/requests");
  return data;
};

export const sendFriendRequest = async (userId) => {
  const { data } = await apiClient.post(
    `/api/friends/request/${userId}`
  );
  return data;
};

export const respondToFriendRequest = async (requestId, action) => {
  const { data } = await apiClient.patch(
    `/api/friends/request/${requestId}/respond`,
    { action }
  );
  return data;
};

export const cancelFriendRequest = async (requestId) => {
  const { data } = await apiClient.delete(
    `/api/friends/request/${requestId}`
  );
  return data;
};

export const removeFriend = async (userId) => {
  const { data } = await apiClient.delete(`/api/friends/${userId}`);
  return data;
};
