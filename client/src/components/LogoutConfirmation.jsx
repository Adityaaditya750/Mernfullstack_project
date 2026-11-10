import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

const LogoutConfirmation = ({
  children,
  className,
  onOpen,
  ...buttonProps
}) => {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const confirmLogout = async () => {
    if (working) return;
    setWorking(true);
    setError("");

    try {
      const roomMatch = pathname.match(/^\/battle\/([^/]+)$/);
      if (roomMatch) {
        const result = await apiRequest(`/room/${roomMatch[1]}`);
        const room = result?.room || result;
        if (room?.status === "Waiting") {
          await apiRequest(`/room/${roomMatch[1]}/leave`, {
            method: "DELETE",
          });
        }
      }

      setOpen(false);
      await logout();
    } catch (requestError) {
      setError(requestError.message || "Unable to leave the room before logging out.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        {...buttonProps}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border border-[#343641] bg-[#17181f] text-[#f4f4f6]">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of QuizArena?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a2a4b1]">
              {pathname.match(/^\/battle\/[^/]+$/)
                ? "You will leave the waiting room first. If you are the host, the room will close and return all players to the battle lobby."
                : "You will be signed out of your account on this device."}
            </AlertDialogDescription>
            {error && (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="border-[#343641] bg-[#14151b]">
            <AlertDialogCancel
              disabled={working}
              className="border-[#343641] bg-transparent text-[#f4f4f6] hover:bg-[#242630]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(event) => {
                event.preventDefault();
                confirmLogout();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {working ? "Leaving room..." : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LogoutConfirmation;
