import React from "react";

const ExamCard = ({ title, description, onStart }) => {
  return (
    <div className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-gray-600">
        {description}
      </p>

      <button
        onClick={onStart}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Start Test
      </button>
    </div>
  );
};

export default ExamCard;