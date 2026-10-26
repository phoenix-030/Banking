import React from "react";
import { useParams } from "react-router-dom";

import { examQuestionMap } from "../data";
import QuestionCard from "../components/QuestionCard";

const TestPage = () => {
  const { examName } = useParams();

  const questions =
    examQuestionMap[examName] || [];

  if (questions.length === 0) {
    return (
      <section className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">
          No Questions Found
        </h1>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto py-10">
      <QuestionCard
        questionData={questions[0]}
      />
    </section>
  );
};

export default TestPage;

// import React from "react";
// import { useParams } from "react-router-dom";

// const TestPage = () => {
//   const { examName } = useParams();

//   return (
//     <div className="py-10">
//       <h1 className="text-3xl font-bold">
//         {examName} Mock Test
//       </h1>
//     </div>
//   );
// };

// export default TestPage;