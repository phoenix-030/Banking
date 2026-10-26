import React from "react";
import { useNavigate } from "react-router-dom";

const exams = [
  "Group 1",
  "Group 2",
  "Group 2A",
  "Group 4",
  "VAO",
  "Police",
];

const MockTests = () => {
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl bg-red-800 mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-8">
        TNPSC Mock Tests
      </h1>

      <div className="grid bg-amber-500 gap-6 md:grid-cols-3">
        {exams.map((exam) => (
          <div
            key={exam}
            className="border rounded-2xl bg-blue-300 p-30 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">
              {exam}
            </h2>

            <p className="mt-2 text-gray-600">
              Practice questions for {exam}.
            </p>

            <button
              onClick={() =>
                navigate(
                  `/mock-tests/${exam
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`
                )
              }
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Start Test
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MockTests;