import React from "react";

const SubjectCard = ({ icon, name, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="text-4xl mb-4">{icon}</div>

      <h3 className="text-xl font-semibold mb-2">
        {name}
      </h3>

      <p className="text-gray-600">
        {description}
      </p>
    </div>
  );
};

export default SubjectCard;