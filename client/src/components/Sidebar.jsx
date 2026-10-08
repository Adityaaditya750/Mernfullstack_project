import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <aside className="flex w-full shrink-0 flex-col bg-gray-800 text-white md:sticky md:top-0 md:h-screen md:w-64">
      <div className="border-b border-gray-700 p-4 text-xl font-bold sm:text-2xl">
        Admin Panel
      </div>
      <nav className="flex flex-wrap gap-1 p-2 sm:p-3 md:flex-1 md:flex-col md:gap-2 md:p-4">
        <Link to="/admin" className="rounded px-3 py-2 text-sm hover:bg-gray-700 sm:px-4">Quiz studio</Link>
        <Link to="/" className="rounded px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 sm:px-4">Back to Site</Link>
      </nav>
      <div className="border-t border-gray-700 p-3 sm:p-4 md:mt-auto">
        <button
          onClick={logout}
          className="w-full rounded bg-red-600 py-2 text-sm hover:bg-red-700 sm:text-base"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;