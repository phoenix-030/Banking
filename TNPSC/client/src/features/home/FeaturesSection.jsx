import React from "react";
import FeatureCard from "./components/FeatureCard";
import { features } from "./data/features";

const FeaturesSection = () => {
  return (
   <section className="py-20 bg-white">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Everything You Need to Succeed
      </h2>

      <p className="mt-3 text-slate-600">
        Learn, practice, and stay exam-ready—all in one place.
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard key={feature.id} {...feature} />
      ))}
    </div>
  </div>
</section>
  );
};

export default FeaturesSection;