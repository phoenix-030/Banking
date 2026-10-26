import StatsCard from "./components/StatsCard";
import { stats } from "./data/stats";

const StatsSection = () => {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-4xl font-bold text-slate-900">
            {/* Trusted by Aspirants Across India */}
            One Platform. Every Government Exam.
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Questions, mock tests, current affairs, and AI guidance.
            {/* Everything you need to prepare smarter and achieve success in competitive exams. */}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((item) => (
            <StatsCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;