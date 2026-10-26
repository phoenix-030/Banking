import React, { useState } from "react";
import OptionItem from "./OptionItem";

const QuestionCard = ({ questionData }) => {
  const [selected, setSelected] = useState("");

  return (
    <div className="border rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">
        {questionData.question}
      </h2>

      <div className="space-y-3">
        {questionData.options.map((option) => (
          <OptionItem
            key={option}
            option={option}
            selected={selected === option}
            onSelect={setSelected}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;