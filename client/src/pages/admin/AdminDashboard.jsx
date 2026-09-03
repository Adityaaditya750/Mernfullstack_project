import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Total Users</h2>
          <p className="text-2xl font-bold text-gray-800 mt-2">1,250</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Active Sessions</h2>
          <p className="text-2xl font-bold text-gray-800 mt-2">45</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Pending Approvals</h2>
          <p className="text-2xl font-bold text-gray-800 mt-2">12</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Welcome, Admin {user?.name}</h2>
        <p className="text-gray-600">
          This is your control center. Use the sidebar to navigate to user management or settings.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;