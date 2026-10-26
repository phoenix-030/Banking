// import CountUp from "react-countup";

const StatsCard = ({ value, suffix, label }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <h3 className="text-4xl font-extrabold text-indigo-600">
        {/* <CountUp end={value} duration={2} /> */}
        {value}
        {suffix}
      </h3>

      <div className="mx-auto my-4 h-px w-12 bg-slate-200"></div>

      <p className="text-base font-medium tracking-wide text-slate-600">
        {label}
      </p>
    </div>
  );
};

export default StatsCard;