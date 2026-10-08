import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  return (
    <div className="min-h-screen w-full min-w-0 bg-gray-50">
      <Navbar />
      <main className="w-full min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;