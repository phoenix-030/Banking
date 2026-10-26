import React from "react";
import { Link } from "react-router-dom";

const Logo = () => {
  return (
    <Link
      to="/"
      className="flex items-center gap-2"
    >
      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
        T
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">
          TNPSC AI
        </h1>

        <p className="text-xs text-gray-500">
          Smart Exam Preparation
        </p>
      </div>
    </Link>
  );
};

export default Logo;