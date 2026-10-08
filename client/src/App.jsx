import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import Profile from './pages/user/Profile';
import QuizLibrary from './pages/user/QuizLibrary';
import QuizDetail from './pages/user/QuizDetail';
import QuizAttempt from './pages/user/QuizAttempt';
import QuizResult from './pages/user/QuizResult';
import QuizHistory from './pages/user/QuizHistory';
import BattleLobby from './pages/user/BattleLobby';
import BattleRoom from './pages/user/BattleRoom';
import AdminDashboard from './pages/admin/AdminDashboard';

// Route Guards
import ProtectedRoute from './route/ProtectedRoute';
import PublicRoute from './route/PublicRoute';

function App() {
  return (
    <Routes>
      {/* Public Routes with Main Layout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        
        {/* Only accessible if NOT logged in */}
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
        
        {/* Only accessible if logged in */}
        <Route 
          path="profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route path="quizzes" element={<ProtectedRoute><QuizLibrary /></ProtectedRoute>} />
        <Route path="coding" element={<ProtectedRoute><QuizLibrary codingOnly /></ProtectedRoute>} />
        <Route path="quiz/:quizId" element={<ProtectedRoute><QuizDetail /></ProtectedRoute>} />
        <Route path="quiz/:quizId/attempt/:responseId" element={<ProtectedRoute><QuizAttempt /></ProtectedRoute>} />
        <Route path="results/:responseId" element={<ProtectedRoute><QuizResult /></ProtectedRoute>} />
        <Route path="my-results" element={<ProtectedRoute><QuizHistory /></ProtectedRoute>} />
        <Route path="battle" element={<ProtectedRoute><BattleLobby /></ProtectedRoute>} />
        <Route path="battle/:roomId" element={<ProtectedRoute><BattleRoom /></ProtectedRoute>} />
      </Route>

      {/* Admin Routes with Admin Layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;