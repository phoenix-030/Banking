import React from "react";

const OptionItem = ({
  option,
  selected,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(option)}
      className={`w-full text-left p-4 border rounded-lg transition
        ${
          selected
            ? "bg-blue-600 text-white border-blue-600"
            : "hover:bg-gray-50"
        }`}
    >
      {option}
    </button>
  );
};

export default OptionItem;