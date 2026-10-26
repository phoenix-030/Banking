import React from "react";
import { currentAffairs } from "./data/currentAffairs";

const CurrentAffairs = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Current Affairs
      </h1>

      <div className="grid gap-4">
        {currentAffairs.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 shadow"
          >
            <h2 className="text-xl font-semibold">
              {item.title}
            </h2>

            <p className="text-gray-500">
              {item.category}
            </p>

            <p>{item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CurrentAffairs;