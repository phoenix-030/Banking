import React from "react";
import { useParams } from "react-router-dom";

import { exams } from "../data/exams";
import { papersMap } from "../data";

const PreviousPaperDetails = () => {
  const { examId } = useParams();

  const exam = exams.find(
    (item) => item.id === examId
  );

  if (!exam) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold">
          Exam Not Found
        </h1>
      </div>
    );
  }

  const examPapers = papersMap[examId] || [];

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">
        {exam.title}
      </h1>

      <p className="text-gray-500 mt-2 mb-8">
        Previous Year Question Papers
      </p>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Year</th>
              <th className="p-4 text-left">Questions</th>
              <th className="p-4 text-left">Language</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {examPapers.length > 0 ? (
              examPapers.map((paper) => (
                <tr
                  key={paper.id}
                  className="border-t"
                >
                  <td className="p-4">
                    {paper.year}
                  </td>

                  <td className="p-4">
                    {paper.questions}
                  </td>

                  <td className="p-4">
                    {paper.language}
                  </td>

                  <td className="p-4">
                    <a
                      href={paper.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="p-8 text-center text-gray-500"
                >
                  No papers available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PreviousPaperDetails;