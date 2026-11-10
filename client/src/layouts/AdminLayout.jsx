import { Outlet, Navigate } from 'react-router-dom';
import WorkspaceSidebar from '../components/WorkspaceSidebar';
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
    <div className="workspace-theme flex min-h-screen min-w-0 flex-col bg-[#0b0c10] md:flex-row">
      <WorkspaceSidebar />
      <main className="min-w-0 flex-1 bg-[#0b0c10]">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;