
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import WorkspaceSidebar from "../components/WorkspaceSidebar";

const isWorkspaceRoute = (pathname) =>
  pathname === "/profile" ||
  pathname === "/friends" ||
  pathname === "/quizzes" ||
  pathname === "/coding" ||
  pathname === "/my-results" ||
  pathname === "/notifications" ||
  pathname.startsWith("/quiz/") ||
  pathname.startsWith("/results/") ||
  pathname.startsWith("/battle") ||
  pathname.startsWith("/admin");

const isThemedPublicRoute = (pathname) =>
  [
    "/about",
    "/login",
    "/register",
    "/forgot-password",
    "/verify-otp",
    "/reset-password",
  ].includes(pathname);

const MainLayout = () => {
  const { pathname } = useLocation();
  const isWorkspace = isWorkspaceRoute(pathname);
  const isThemed = isWorkspace || isThemedPublicRoute(pathname);

  return (
    <div
      className={`min-h-dvh w-full min-w-0 ${
        isWorkspace
          ? "workspace-theme flex flex-col bg-[#0b0c10] md:flex-row"
          : isThemed
            ? "workspace-theme bg-[#0b0c10]"
            : "bg-gray-50"
      }`}
    >
      {isWorkspace ? <WorkspaceSidebar /> : <Navbar />}

      <main
        className={`min-w-0 flex-1 ${
          isWorkspace ? "min-h-dvh bg-[#0b0c10]" : ""
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
