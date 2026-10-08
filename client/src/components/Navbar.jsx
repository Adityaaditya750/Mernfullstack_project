import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const accountPath = user?.role === 'admin' ? '/admin' : '/profile';
  const accountLabel = user?.role === 'admin' ? 'Admin dashboard' : 'Profile';

  // Controls mobile drawer open/close state
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navLinks = [
    {
      name: 'Home',
      path: '/',
      icon: Home,
    },
    {
      name: 'Quizzes',
      path: '/quizzes',
      icon: BookOpen,
    },
    {
      name: 'Battle',
      path: '/battle',
      icon: Swords,
    },
    {
      name: 'Coding',
      path: '/coding',
      icon: Code2,
    },
    {
      name: 'About',
      path: '/about',
      icon: Info,
    },
  ];

  const activeClass = ({ isActive }) =>
    `relative flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-[#063b49]'
        : 'text-slate-700 hover:text-[#063b49]'
    }`;

  // Close drawer after navigation
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full min-w-0 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div
        className="
          mx-auto
          flex
          h-16
          w-full
          min-w-0
          max-w-7xl
          items-center
          justify-between
          px-3
          sm:px-6
          lg:px-8
        "
      >
        {/* =========================
            LOGO
        ========================== */}
        <Link
          to="/"
          onClick={closeDrawer}
          className="
            flex
            min-w-0
            shrink-0
            items-center
            gap-2
            text-xl
            font-bold
            tracking-tight
            text-[#063b49]
            sm:text-2xl
          "
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#063b49] text-white">
            <BookOpen className="h-4 w-4" />
          </div>

          <span>
            Quiz<span className="text-[#00d98b]">Arena</span>
          </span>
        </Link>

        {/* =========================
            DESKTOP NAVIGATION
        ========================== */}
        <nav className="hidden min-w-0 lg:block">
          <ul className="flex items-center gap-5 lg:gap-7">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    end={link.path === '/'}
                    className={activeClass}
                  >
                    {({ isActive }) => (
                      <span className="relative flex items-center gap-2 whitespace-nowrap py-1">
                        <Icon className="h-4 w-4" />

                        <span>{link.name}</span>

                        {isActive && (
                          <span
                            className="
                              absolute
                              -bottom-2
                              left-0
                              h-0.5
                              w-full
                              rounded-full
                              bg-[#00d98b]
                            "
                          />
                        )}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* =========================
            DESKTOP AUTH
        ========================== */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {user ? (
            <>
              {/* Profile */}
              <Link
                to={accountPath}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  hover:text-[#063b49]
                "
              >
                <UserCircle className="h-4 w-4" />

                <span className="max-w-[120px] truncate">
                  {user.name}
                </span>
              </Link>

              {/* Logout */}
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border-slate-200
                  text-slate-700
                  transition
                  hover:border-red-200
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              {/* Login */}
              <Link
                to="/login"
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  hover:text-[#063b49]
                "
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>

              {/* Register */}
              <Link
                to="/register"
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-[#063b49]
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-white
                  transition
                  hover:bg-[#052f3a]
                "
              >
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </>
          )}
        </div>

        {/* =========================
            MOBILE DRAWER
        ========================== */}
        <div className="ml-3 shrink-0 lg:hidden">
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
                className="
                  h-10
                  w-10
                  rounded-lg
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  hover:text-[#063b49]
                "
              >
                <Menu className="h-6 w-6" />

                <span className="sr-only">
                  Open navigation menu
                </span>
              </Button>
            </DrawerTrigger>

            {/* =========================
                DRAWER CONTENT
            ========================== */}
            <DrawerContent
              className="
                h-full
                w-[min(22rem,90vw)]
                rounded-none
                border-l
                border-slate-200
                bg-white
              "
            >
              {/* Drawer Header */}
              <DrawerHeader className="border-b border-slate-200 px-5 py-5">
                <DrawerTitle
                  className="
                    flex
                    items-center
                    gap-2
                    text-left
                    text-xl
                    font-bold
                    tracking-tight
                    text-[#063b49]
                  "
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#063b49] text-white">
                    <BookOpen className="h-4 w-4" />
                  </div>

                  <span>
                    Quiz<span className="text-[#00d98b]">Arena</span>
                  </span>
                </DrawerTitle>
              </DrawerHeader>

              {/* =========================
                  MOBILE NAVIGATION
              ========================== */}
              <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                {/* Main Navigation */}
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.path === '/'}
                        onClick={closeDrawer}
                        className={({ isActive }) =>
                          `
                            flex
                            items-center
                            gap-3
                            rounded-lg
                            px-4
                            py-3
                            text-sm
                            font-medium
                            transition
                            ${
                              isActive
                                ? 'bg-[#e8fff7] text-[#063b49]'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-[#063b49]'
                            }
                          `
                        }
                      >
                        <Icon className="h-5 w-5 shrink-0" />

                        <span>{link.name}</span>
                      </NavLink>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-slate-200" />

                {/* =========================
                    LOGGED IN
                ========================== */}
                {user ? (
                  <div className="flex flex-col gap-2">
                    {/* User Information */}
                    <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8fff7] text-[#063b49]">
                        <UserCircle className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          Signed in as
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-[#063b49]">
                          {user.name}
                        </p>
                      </div>
                    </div>

                    {/* Profile */}
                    <Link
                      to={accountPath}
                      onClick={closeDrawer}
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-lg
                        px-4
                        py-3
                        text-sm
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        hover:text-[#063b49]
                      "
                    >
                      <UserCircle className="h-5 w-5" />
                      {accountLabel}
                    </Link>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        closeDrawer();
                        logout();
                      }}
                      className="
                        mt-1
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        px-4
                        py-3
                        text-left
                        text-sm
                        font-medium
                        text-red-600
                        transition
                        hover:bg-red-50
                      "
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  </div>
                ) : (
                  /* =========================
                     LOGGED OUT
                  ========================== */
                  <div className="flex flex-col gap-2">
                    {/* Login */}
                    <Link
                      to="/login"
                      onClick={closeDrawer}
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-lg
                        px-4
                        py-3
                        text-sm
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        hover:text-[#063b49]
                      "
                    >
                      <LogIn className="h-5 w-5" />
                      Login
                    </Link>

                    {/* Register */}
                    <Link
                      to="/register"
                      onClick={closeDrawer}
                      className="
                        mt-1
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-lg
                        bg-[#063b49]
                        px-4
                        py-3
                        text-sm
                        font-medium
                        text-white
                        transition
                        hover:bg-[#052f3a]
                      "
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