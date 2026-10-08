import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-600" role="status">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/admin' } }} />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-gray-100 md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:h-screen md:overflow-y-auto lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;