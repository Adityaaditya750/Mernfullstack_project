import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-gray-800 h-screen text-white flex flex-col">
      <div className="p-4 text-2xl font-bold border-b border-gray-700">
        Admin Panel
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/admin" className="block py-2 px-4 hover:bg-gray-700 rounded">Dashboard</Link>
        <Link to="/admin/users" className="block py-2 px-4 hover:bg-gray-700 rounded">Users</Link>
        <Link to="/" className="block py-2 px-4 hover:bg-gray-700 rounded text-gray-400">Back to Site</Link>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button 
          onClick={logout} 
          className="w-full bg-red-600 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;