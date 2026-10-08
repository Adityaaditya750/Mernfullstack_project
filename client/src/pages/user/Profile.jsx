import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 sm:text-xl">User Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and application status.</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="grid gap-1 bg-gray-50 px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="break-words text-sm text-gray-900 sm:col-span-2">{user?.name}</dd>
            </div>
            <div className="grid gap-1 bg-white px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="break-all text-sm text-gray-900 sm:col-span-2">{user?.email}</dd>
            </div>
            <div className="grid gap-1 bg-gray-50 px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="text-sm capitalize text-gray-900 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user?.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {user?.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:px-6">
          <Link
            to="/quizzes"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#063b49] px-4 text-sm font-semibold text-white transition hover:bg-[#052f3a] sm:w-auto"
          >
            Explore quizzes
          </Link>
          <Link
            to="/my-results"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#063b49] transition hover:bg-slate-50 sm:w-auto"
          >
            My quiz results
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;