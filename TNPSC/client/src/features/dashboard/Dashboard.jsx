import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
return ( <section className="max-w-7xl mx-auto px-6 py-10">

  {/* Welcome */}
  <div className="bg-white border rounded-xl p-6 shadow-sm">
    <h1 className="text-3xl font-bold">
      Welcome Back 👋
    </h1>

    <p className="text-gray-600 mt-2">
      Continue your TNPSC preparation journey.
    </p>
  </div>

  {/* Quick Actions */}
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">
      Quick Actions
    </h2>

    <div className="grid gap-6 md:grid-cols-3">

      <Link
        to="/ai-tutor"
        className="border rounded-xl p-6 hover:shadow-md transition"
      >
        <h3 className="text-xl font-semibold">
          🤖 AI Tutor
        </h3>

        <p className="text-gray-600 mt-2">
          Ask questions and learn instantly.
        </p>
      </Link>

      <Link
        to="/mock-tests"
        className="border rounded-xl p-6 hover:shadow-md transition"
      >
        <h3 className="text-xl font-semibold">
          📝 Mock Tests
        </h3>

        <p className="text-gray-600 mt-2">
          Practice TNPSC exam questions.
        </p>
      </Link>

      <Link
        to="/study-planner"
        className="border rounded-xl p-6 hover:shadow-md transition"
      >
        <h3 className="text-xl font-semibold">
          📅 Study Planner
        </h3>

        <p className="text-gray-600 mt-2">
          Generate your study schedule.
        </p>
      </Link>

    </div>
  </div>

  {/* Recent Activity */}
  <div className="mt-10">
    <h2 className="text-2xl font-semibold mb-4">
      Recent Activity
    </h2>

    <div className="border rounded-xl p-6">
      <ul className="space-y-3">
        <li>Completed Group 4 Mock Test</li>
        <li>Asked 5 questions in AI Tutor</li>
        <li>Generated a new Study Plan</li>
      </ul>
    </div>
  </div>

</section>


);
};

export default Dashboard;
