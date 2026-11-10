import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, jsonBody } from "../../lib/api";
import socket, { connectSocket } from "../../socket";

const REFRESH_EVENT = "quizarena:notifications-changed";

const notificationText = (notification) => {
  const actor = notification.actor?.name || notification.actor?.username;
  if (notification.message) return notification.message;
  if (notification.type === "battle_invite") {
    return `${actor || "A friend"} invited you to a battle room.`;
  }
  return `${actor || "Someone"} sent you a friend request.`;
};

export default function FriendRequestToast() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const showNotification = useCallback(
    (notification) => {
      if (!notification?._id) return;
      const options = {
        id: `notification-${notification._id}`,
        description: notificationText(notification),
        duration: 8000,
        action: {
          label: notification.type === "battle_invite" ? "Join" : "View",
          onClick: async () => {
            if (notification.type !== "battle_invite") {
              navigate("/notifications");
              return;
            }

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
              await apiRequest(`/notifications/${notification._id}/read`, {
                method: "PATCH",
              });
              window.dispatchEvent(new Event(REFRESH_EVENT));
              navigate(`/battle/${joined.room?._id || invitation.roomId}`);
            } catch (error) {
              toast.error(error.message || "Unable to join this battle.");
            }
          },
        },
      };

      toast(notification.title || "New notification", options);
    },
    [navigate]
  );

  useEffect(() => {
    if (!user?._id) return undefined;
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const handleNotification = (notification) => {
      showNotification(notification);
      window.dispatchEvent(new Event(REFRESH_EVENT));
    };

    if (socket.connected && socket.auth?.token !== token) {
      socket.disconnect();
    }
    connectSocket(token);
    socket.on("notification-received", handleNotification);

    apiRequest("/notifications")
      .then((data) => {
        (data.notifications || [])
          .filter((item) => !item.readAt)
          .slice(0, 5)
          .forEach(showNotification);
      })
      .catch((error) => {
        console.error("Unable to load unread notifications:", error);
      });

    return () => {
      socket.off("notification-received", handleNotification);
    };
  }, [showNotification, user?._id]);

  return null;
}