import React from "react";

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="group p-8 rounded-2xl border border-gray-200 bg-white hover:shadow-xl transition-all duration-300">
      <div className="text-3xl mb-5">{icon}</div>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {title}
      </h3>

      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;