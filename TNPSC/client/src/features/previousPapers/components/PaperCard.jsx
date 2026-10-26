import React from "react";
import { Link } from "react-router-dom";

const PaperCard = ({ exam }) => {
  return (
    <div className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
      <h2 className="text-xl font-semibold">
        {exam.title}
      </h2>

      <p className="mt-2 text-gray-600">
        {exam.description}
      </p>

      <p className="mt-2 text-sm text-gray-500">
        Total Papers: {exam.totalPapers}
      </p>

      <Link
        to={`/previous-papers/${exam.id}`}
        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        View Papers
      </Link>
    </div>
  );
};

export default PaperCard;