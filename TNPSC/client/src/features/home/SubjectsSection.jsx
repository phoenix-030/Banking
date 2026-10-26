import React from "react";
import SubjectCard from "./components/SubjectCard";
import { subjects } from "./data/subjects";

const SubjectsSection = () => {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">
          TNPSC Subjects
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              icon={subject.icon}
              name={subject.name}
              description={subject.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;