
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";

// Public Pages
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import ForgotPassword from "./pages/public/ForgotPassword";
import VerifyOtp from "./pages/public/VerifyOtp";
import ResetPassword from "./pages/public/ResetPassword";

// User Pages
import Profile from "./pages/user/Profile";
import QuizLibrary from "./pages/user/QuizLibrary";
import QuizDetail from "./pages/user/QuizDetail";
import QuizAttempt from "./pages/user/QuizAttempt";
import QuizResult from "./pages/user/QuizResult";
import QuizHistory from "./pages/user/QuizHistory";
import BattleLobby from "./pages/user/BattleLobby";
import BattleRoom from "./pages/user/BattleRoom";
import CreateBattle from "./pages/user/CreateBattle";
import Notifications from "./pages/user/Notifications";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

// Components
import FriendRequestToast from "./pages/user/FriendRequestToast";

// Route Guards
import ProtectedRoute from "./route/ProtectedRoute";
import PublicRoute from "./route/PublicRoute";

function App() {
  return (
    <>
      {/* Global friend-request toast */}
      {/* It must be outside Routes, but inside BrowserRouter */}
      <FriendRequestToast />

      <Routes>
        {/* Main Layout */}
        <Route path="/" element={<MainLayout />}>
          {/* Public Routes */}
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />

          <Route
            path="forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="verify-otp"
            element={<VerifyOtp />}
          />

          <Route
            path="reset-password"
            element={<ResetPassword />}
          />

          {/* Authentication Routes */}
          <Route
            path="login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected User Routes */}
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="quizzes"
            element={
              <ProtectedRoute>
                <QuizLibrary />
              </ProtectedRoute>
            }
          />

          <Route
            path="coding"
            element={
              <ProtectedRoute>
                <QuizLibrary codingOnly />
              </ProtectedRoute>
            }
          />

          <Route
            path="quiz/:quizId"
            element={
              <ProtectedRoute>
                <QuizDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="quiz/:quizId/attempt/:responseId"
            element={
              <ProtectedRoute>
                <QuizAttempt />
              </ProtectedRoute>
            }
          />

          <Route
            path="results/:responseId"
            element={
              <ProtectedRoute>
                <QuizResult />
              </ProtectedRoute>
            }
          />

          <Route
            path="my-results"
            element={
              <ProtectedRoute>
                <QuizHistory />
              </ProtectedRoute>
            }
          />

          {/* Battle Routes */}
          <Route
            path="battle"
            element={
              <ProtectedRoute>
                <BattleLobby />
              </ProtectedRoute>
            }
          />

          <Route
            path="battle/create"
            element={
              <ProtectedRoute>
                <CreateBattle />
              </ProtectedRoute>
            }
          />

          <Route
            path="battle/:roomId"
            element={
              <ProtectedRoute>
                <BattleRoom />
              </ProtectedRoute>
            }
          />

          {/* Notifications Route */}
          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<AdminDashboard />}
          />
        </Route>

        {/* Fallback Route */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;
