import React from "react";

const StudyHub = () => {
  const sections = [
    "Subjects",
    "Notes",
    "Previous Papers",
    "Current Affairs",
    "Government Schemes",
    "Books",
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Study Hub
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div
            key={section}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg cursor-pointer"
          >
            <h2 className="font-semibold text-lg">
              {section}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyHub;