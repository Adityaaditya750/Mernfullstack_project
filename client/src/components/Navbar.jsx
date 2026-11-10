
import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import {
  Menu,
  Home,
  BookOpen,
  Swords,
  Code2,
  Info,
  UserCircle,
  LogIn,
  UserPlus,
  LogOut,
  Bell,
  GraduationCap,
  Moon,
  Sun,
  Trophy,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import LogoutConfirmation from "./LogoutConfirmation";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";

import { apiRequest } from "../lib/api";
import socket, { connectSocket } from "../socket";

const Navbar = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isReferenceNav = isHome || isAuthPage || pathname === "/about";

  const accountPath = user?.role === "admin" ? "/admin" : "/profile";
  const accountLabel =
    user?.role === "admin" ? "Admin dashboard" : "Profile";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Fetch the current incoming friend-request count
  const fetchPendingRequests = useCallback(async () => {
    if (!user) {
      setPendingRequests(0);
      return;
    }

    try {
      const data = await apiRequest("/friends/requests");

      setPendingRequests(
        Array.isArray(data?.incoming) ? data.incoming.length : 0
      );
    } catch (error) {
      console.error(
        "Failed to fetch friend requests:",
        error.message || error
      );
    }
  }, [user]);

  // Connect Socket.IO and keep the notification badge updated
  useEffect(() => {
    if (!user) {
      setPendingRequests(0);
      return;
    }

    const token = localStorage.getItem("token");

    if (token) {
      connectSocket(token);
    }

    const handleRequestReceived = () => {
      fetchPendingRequests();
    };

    const handleRequestsChanged = () => {
      fetchPendingRequests();
    };

    socket.on("friend-request-received", handleRequestReceived);

    window.addEventListener(
      "quizarena:friend-requests-changed",
      handleRequestsChanged
    );

    fetchPendingRequests();

    return () => {
      socket.off("friend-request-received", handleRequestReceived);

      window.removeEventListener(
        "quizarena:friend-requests-changed",
        handleRequestsChanged
      );
    };
  }, [user, fetchPendingRequests]);

  const navLinks = [
    ...(isReferenceNav ? [] : [{
      name: "Home",
      path: "/",
      icon: Home,
    }]),
    {
      name: "Quizzes",
      path: "/quizzes",
      icon: BookOpen,
    },
    {
      name: isReferenceNav ? "Battles" : "Battle",
      path: "/battle",
      icon: Swords,
    },
    {
      name: "Coding",
      path: "/coding",
      icon: Code2,
    },
    ...(isReferenceNav ? [{
      name: "Leaderboard",
      path: "/my-results",
      icon: Trophy,
    }] : []),
    ...(isReferenceNav ? [{
      name: "Friends",
      path: "/friends",
      icon: Users,
    }] : []),
    ...(!isReferenceNav ? [{
      name: "About",
      path: "/about",
      icon: Info,
    }] : []),
  ];

  const activeClass = ({ isActive }) =>
    `relative flex items-center rounded-full px-3 py-2 text-[11px] font-medium transition-all duration-200 lg:px-4 lg:text-base ${
      isHome
        ? "text-[#a2a4b1] hover:text-white"
        : isActive
          ? "bg-violet-100 text-violet-800"
          : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
    }`;

  // Close the mobile drawer after navigation
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  // Shared notification link for the desktop navbar
  const NotificationLink = ({ mobile = false }) => (
    <NavLink
      to="/notifications"
      onClick={mobile ? closeDrawer : undefined}
      aria-label={`Notifications${
        pendingRequests > 0 ? `, ${pendingRequests} pending requests` : ""
      }`}
      title="Notifications"
      className={({ isActive }) =>
        mobile
          ? `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
              isHome
                ? isActive
                  ? "bg-[#1d1f27] text-[#c4f52c]"
                  : "text-[#d9dae0] hover:bg-[#14151b] hover:text-[#c4f52c]"
                : isActive
                  ? "bg-[#e8fff7] text-[#063b49]"
                  : "text-slate-700 hover:bg-slate-50 hover:text-[#063b49]"
            }`
          : `relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
              isHome
                ? isActive
                  ? "bg-[#14151b] text-[#c4f52c]"
                  : "text-[#d9dae0] hover:bg-[#14151b] hover:text-[#c4f52c]"
                : isActive
                  ? "bg-[#e8fff7] text-[#063b49]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-[#063b49]"
            }`
      }
    >
      <span className="relative inline-flex shrink-0">
        <Bell className={mobile ? "h-5 w-5" : "h-5 w-5"} />

        {pendingRequests > 0 && (
          <span
            className={
              mobile
                ? "absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                : "absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
            }
          >
            {pendingRequests > 99 ? "99+" : pendingRequests}
          </span>
        )}
      </span>

      {mobile && <span>Notifications</span>}

      {mobile && pendingRequests > 0 && (
        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          {pendingRequests > 99 ? "99+" : pendingRequests}
        </span>
      )}
    </NavLink>
  );

  return (
    <header
      className={`${
        isHome
          ? "absolute inset-x-0 top-0 z-50 border-b border-[#191a20] bg-[#0b0c10] text-white"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-700 backdrop-blur-md"
      } w-full min-w-0`}
    >
      <div
        className={`mx-auto flex w-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6 ${
          isReferenceNav
            ? "h-[50px] max-w-[1400px] lg:h-[74px]"
            : "h-[58px] max-w-[1024px]"
        }`}
      >
        {/* LOGO */}
        <Link
          to="/"
          onClick={closeDrawer}
          className={`flex min-w-0 shrink-0 items-center gap-1.5 text-sm font-extrabold tracking-tight lg:gap-3 lg:text-2xl ${
            isReferenceNav ? "text-white" : "text-[#11133f]"
          }`}
        >
          {isReferenceNav ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#c4f52c] text-[10px] font-black text-[#101109] lg:h-10 lg:w-10 lg:rounded-xl lg:text-xl">Q</span>
          ) : (
            <GraduationCap className="h-9 w-9 fill-violet-500 text-violet-400" strokeWidth={1.7} />
          )}
          <span>{isReferenceNav ? <>Quiz<span className="text-[#c4f52c]">Arena</span></> : <>Quiz<span className="text-fuchsia-400">Arena</span></>}</span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden min-w-0 md:block">
          <ul className="flex items-center gap-0.5">
            {navLinks.map((link) => {
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    end={link.path === "/"}
                    className={activeClass}
                  >
                    {link.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* DESKTOP AUTHENTICATION */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {!isReferenceNav && <button
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            className={`flex h-8 items-center gap-1 rounded-full border px-1.5 transition ${
              isHome
                ? "border-violet-500/60 bg-[#161143]/80 text-violet-300"
                : "border-slate-200 bg-white text-violet-600"
            }`}
          >
            <Sun className={`h-4 w-4 rounded-full ${!isDark ? "bg-amber-400 p-0.5 text-[#141039]" : ""}`} />
            <Moon className={`h-4 w-4 rounded-full ${isDark ? "bg-violet-500 p-0.5 text-white" : ""}`} />
          </button>}

          {user ? (
            <>
              {/* Notifications Bell */}
              <NotificationLink />

              {/* Profile */}
              <Link
                to={accountPath}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
                  isHome
                    ? "text-[10px] text-[#d9dae0] hover:bg-[#14151b] hover:text-white lg:text-sm"
                    : "text-sm text-slate-700 hover:bg-slate-100"
                }`}
              >
                <UserCircle className="h-4 w-4" />

                <span className="max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>

              {/* Logout */}
              <LogoutConfirmation
                type="button"
                className={`flex items-center gap-2 rounded-lg transition ${
                  isHome
                    ? "h-8 border border-[#24262d] bg-transparent px-3 text-[10px] text-[#f4f4f6] hover:border-[#c4f52c] hover:bg-[#14151b] hover:text-[#c4f52c] lg:h-12 lg:px-5 lg:text-sm"
                    : "min-h-9 border border-slate-200 px-3 text-sm text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </LogoutConfirmation>
            </>
          ) : (
            <>
              {/* Login */}
              {pathname !== "/register" && <Link
                to="/login"
                className={`rounded-lg border px-3.5 py-2 text-[10px] font-semibold transition ${
                  pathname === "/register"
                    ? "border-0 bg-[#c4f52c] px-5 py-3 text-sm text-[#101109] hover:bg-[#d2ff43] lg:px-7 lg:py-4 lg:text-base"
                    : isReferenceNav
                    ? "border-[#24262d] px-5 py-3 text-sm text-white hover:border-[#c4f52c] lg:px-6 lg:py-4 lg:text-base"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
              Log in
              </Link>}

              {/* Register */}
              {pathname !== "/login" && <Link
                to="/register"
                className={`rounded-lg px-3.5 py-2 text-[10px] font-semibold transition ${
                  isReferenceNav
                    ? "bg-[#c4f52c] px-5 py-3 text-sm text-[#101109] hover:bg-[#d2ff43] lg:px-7 lg:py-4 lg:text-base"
                    : "bg-gradient-to-r from-[#a72cff] to-[#7218f5] text-white shadow-[0_0_18px_rgba(161,39,255,0.35)] hover:brightness-110"
                }`}
              >
              {isHome || pathname === "/about" ? "Get started" : "Register"}
              </Link>}
            </>
          )}
        </div>

        {/* MOBILE DRAWER */}
        <div className="ml-3 shrink-0 md:hidden">
          <Drawer
            direction="right"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          >
            {/* Hamburger */}
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg transition ${
                  isHome
                    ? "text-white hover:bg-white/10"
                    : "text-slate-700 hover:bg-slate-100 hover:text-[#063b49]"
                }`}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </DrawerTrigger>

            {/* Drawer Content */}
            <DrawerContent
              className={`h-full w-[min(22rem,90vw)] rounded-none border-l ${
                isHome
                  ? "border-[#24262d] bg-[#0b0c10] text-[#f4f4f6]"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Drawer Header */}
              <DrawerHeader
                className={`border-b px-5 py-5 ${
                  isHome ? "border-[#24262d]" : "border-slate-200"
                }`}
              >
                <DrawerTitle
                  className={`flex items-center gap-2 text-left text-xl font-bold tracking-tight ${
                    isHome ? "text-white" : "text-[#063b49]"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isHome
                        ? "bg-[#c4f52c] text-[#101109]"
                        : "bg-[#063b49] text-white"
                    }`}
                  >
                    {isHome ? (
                      <span className="text-sm font-black">Q</span>
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>

                  <span>
                    Quiz<span className={isHome ? "text-[#c4f52c]" : "text-[#00d98b]"}>Arena</span>
                  </span>
                </DrawerTitle>
              </DrawerHeader>

              {/* MOBILE NAVIGATION */}
              <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                {/* Main Navigation */}
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.path === "/"}
                        onClick={closeDrawer}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                            isHome
                              ? isActive
                                ? "bg-[#1d1f27] text-[#c4f52c]"
                                : "text-[#d9dae0] hover:bg-[#14151b] hover:text-white"
                              : isActive
                                ? "bg-[#e8fff7] text-[#063b49]"
                                : "text-slate-700 hover:bg-slate-50 hover:text-[#063b49]"
                          }`
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{link.name}</span>
                      </NavLink>
                    );
                  })}
                </div>

                <div
                  className={`my-5 border-t ${
                    isHome ? "border-[#24262d]" : "border-slate-200"
                  }`}
                />

                {/* LOGGED-IN USER */}
                {user ? (
                  <div className="flex flex-col gap-2">
                    {/* User Information */}
                    <div
                      className={`mb-2 flex items-center gap-3 rounded-lg px-4 py-3 ${
                        isHome ? "bg-[#14151b]" : "bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isHome
                            ? "bg-[#1d1f27] text-[#c4f52c]"
                            : "bg-[#e8fff7] text-[#063b49]"
                        }`}
                      >
                        <UserCircle className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs ${isHome ? "text-[#a2a4b1]" : "text-slate-500"}`}>
                          Signed in as
                        </p>

                        <p className={`mt-1 truncate text-sm font-semibold ${isHome ? "text-white" : "text-[#063b49]"}`}>
                          {user.name}
                        </p>
                      </div>
                    </div>

                    {/* Notifications */}
                    <NotificationLink mobile />

                    {/* Profile */}
                    <Link
                      to={accountPath}
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isHome
                          ? "text-[#d9dae0] hover:bg-[#14151b] hover:text-[#c4f52c]"
                          : "text-slate-700 hover:bg-slate-50 hover:text-[#063b49]"
                      }`}
                    >
                      <UserCircle className="h-5 w-5" />
                      {accountLabel}
                    </Link>

                    {/* Logout */}
                    <LogoutConfirmation
                      className={`mt-1 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                        isHome
                          ? "border-[#24262d] text-[#f4f4f6] hover:border-[#c4f52c] hover:bg-[#14151b] hover:text-[#c4f52c]"
                          : "border-transparent text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </LogoutConfirmation>
                  </div>
                ) : (
                  /* LOGGED-OUT USER */
                  <div className="flex flex-col gap-2">
                    {/* Login */}
                    <Link
                      to="/login"
                      onClick={closeDrawer}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isHome
                          ? "text-[#d9dae0] hover:bg-[#14151b] hover:text-white"
                          : "text-slate-700 hover:bg-slate-50 hover:text-[#063b49]"
                      }`}
                    >
                      <LogIn className="h-5 w-5" />
                      Login
                    </Link>

                    {/* Register */}
                    <Link
                      to="/register"
                      onClick={closeDrawer}
                      className={`mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isHome
                          ? "bg-[#c4f52c] text-[#101109] hover:bg-[#d2ff43]"
                          : "bg-[#063b49] text-white hover:bg-[#052f3a]"
                      }`}
                    >
                      <UserPlus className="h-5 w-5" />
                      Register
                    </Link>
                  </div>
                )}
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
