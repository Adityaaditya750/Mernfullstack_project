import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="py-16">

      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto">

        <p className="text-blue-600 font-semibold text-lg mb-3">
          Welcome to Quiz Arena
        </p>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
          Compete.
          <span className="text-blue-600"> Learn.</span>
          <br />
          Win Together.
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Test your knowledge, challenge your friends, solve coding problems
          and compete in real-time quiz battles.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex justify-center gap-4 flex-wrap">

          {user ? (
            <Link
              to="/profile"
              className="bg-blue-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Get Started
              </Link>

              <Link
                to="/login"
                className="border border-blue-600 text-blue-600 px-7 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Login
              </Link>
            </>
          )}

        </div>
      </section>


      {/* Features */}
      <section className="max-w-6xl mx-auto mt-20">

        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
          What You Can Do
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Quiz */}
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-3xl mb-4">
              🧠
            </div>

            <h3 className="text-xl font-bold mb-2">
              Take Quizzes
            </h3>

            <p className="text-gray-600">
              Challenge yourself with quizzes covering programming,
              databases, web development, AI and many more topics.
            </p>
          </div>


          {/* Battle */}
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-3xl mb-4">
              ⚔️
            </div>

            <h3 className="text-xl font-bold mb-2">
              Real-Time Battles
            </h3>

            <p className="text-gray-600">
              Create or join a battle room and compete against other
              players in real time.
            </p>
          </div>


          {/* Coding */}
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-3xl mb-4">
              💻
            </div>

            <h3 className="text-xl font-bold mb-2">
              Coding Challenges
            </h3>

            <p className="text-gray-600">
              Solve coding problems and test your programming skills
              against different challenges.
            </p>
          </div>

        </div>

      </section>


      {/* Bottom CTA */}
      {!user && (
        <section className="text-center mt-20 bg-blue-600 text-white rounded-2xl p-10">

          <h2 className="text-3xl font-bold">
            Ready to test yourself?
          </h2>

          <p className="mt-3 text-blue-100">
            Create your account and start competing today.
          </p>

          <Link
            to="/register"
            className="inline-block mt-6 bg-white text-blue-600 px-7 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Create Account
          </Link>

        </section>
      )}

    </div>
  );
};

export default Home;