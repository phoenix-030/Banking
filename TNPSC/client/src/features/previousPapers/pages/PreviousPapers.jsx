import React from "react";
import { exams } from "../data/exams";
import PaperCard from "../components/PaperCard";

const PreviousPapers = () => {
  return (
    <section className="max-w-7xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-8">
        Previous Year Papers
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <PaperCard
            key={exam.id}
            exam={exam}
          />
        ))}
      </div>
    </section>
  );
};

export default PreviousPapers;