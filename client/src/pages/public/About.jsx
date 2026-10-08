const About = () => {
  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <article className="mx-auto w-full max-w-4xl rounded-xl bg-white p-5 shadow sm:p-8 lg:p-10">
        <h1 className="mb-4 text-2xl font-bold text-gray-800 sm:text-3xl">About Us</h1>
        <p className="mb-4 text-sm leading-relaxed text-gray-600 sm:text-base">
          We are a dedicated team providing the best authentication solutions for modern web applications.
          Our platform is built using the MERN stack (MongoDB, Express, React, Node.js) and styled with Tailwind CSS.
        </p>
        <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
          Our mission is to simplify the development process for startups and developers by providing robust
          boilerplate code that is secure, scalable, and easy to maintain.
        </p>
      </article>
    </div>
  );
};

export default About;