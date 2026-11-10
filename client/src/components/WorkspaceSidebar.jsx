import { createElement } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Code2,
  LogOut,
  Swords,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LogoutConfirmation from "./LogoutConfirmation";

const WorkspaceSidebar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const links = [
    { label: "Quizzes", path: "/quizzes", icon: BookOpen },
    { label: "Battles", path: "/battle", icon: Swords },
    { label: "Coding", path: "/coding", icon: Code2 },
    { label: "Leaderboard", path: "/my-results", icon: Trophy },
    { label: "Friends", path: "/friends", icon: Users },
    { label: "Profile", path: "/profile", icon: UserCircle },
    { label: "Notifications", path: "/notifications", icon: Bell },
    ...(user?.role === "admin"
      ? [{ label: "Admin", path: "/admin", icon: UserCircle }]
      : []),
  ];

  const isActive = (label) => {
    if (label === "Quizzes") return pathname === "/quizzes";
    if (label === "Coding") return pathname === "/coding";
    if (label === "Battles") return pathname.startsWith("/battle");
    if (label === "Leaderboard") {
      return pathname === "/my-results" || pathname.startsWith("/results/");
    }
    if (label === "Profile") return pathname === "/profile";
    if (label === "Friends") return pathname === "/friends";
    if (label === "Notifications") return pathname === "/notifications";
    if (label === "Admin") return pathname.startsWith("/admin");
    return false;
  };

  return (
    <aside className="flex min-h-dvh w-full shrink-0 flex-col border-b border-[#24262d] bg-[#121318] px-3 py-3 md:sticky md:top-0 md:h-dvh md:w-[220px] md:border-b-0 md:border-r md:px-3 md:py-4 lg:w-[240px] xl:w-[250px] xl:px-5 xl:py-6">
      <Link
        to="/"
        className="mb-4 flex shrink-0 items-center gap-1 px-2 text-lg font-bold tracking-tight md:mb-5 xl:mb-6 xl:text-2xl"
      >
        <span className="text-white">Quiz</span>
        <span className="text-[#c4f52c]">Arena</span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 gap-1 overflow-x-auto md:flex-col md:gap-1 md:overflow-x-hidden md:overflow-y-auto xl:gap-1.5"
      >
        {links.map(({ label, path, icon }) => {
          const active = isActive(label);

          return (
            <Link
              key={label}
              to={path}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition md:w-full md:px-3 md:py-3 md:text-xs xl:px-4 xl:py-3.5 xl:text-sm ${
                active
                  ? "bg-[#c4f52c] text-[#101109]"
                  : "text-[#a2a4b1] hover:bg-[#1d1f27] hover:text-white"
              }`}
            >
              {createElement(icon, { className: "h-4 w-4 shrink-0" })}
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-4 flex shrink-0 items-center gap-2 rounded-xl bg-[#1d1f27] px-2 py-2.5 md:mt-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#343641] text-xs font-semibold text-[#e2e3e7]">
            {(user.name || "U").slice(0, 2).toUpperCase()}
          </span>

          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#e2e3e7]">
            {user.name}
          </span>

          <LogoutConfirmation
            aria-label="Log out"
            title="Log out"
            className="rounded-md p-2 text-[#a2a4b1] transition hover:bg-[#292b35] hover:text-[#c4f52c]"
          >
            <LogOut className="h-4 w-4" />
          </LogoutConfirmation>
        </div>
      )}
    </aside>
  );
};

export default WorkspaceSidebar;
