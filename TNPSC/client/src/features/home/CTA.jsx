import React from "react";
import { Link } from "react-router-dom";

const CTA = () => {
return ( <section className="py-20 px-6 bg-blue-600"> <div className="max-w-4xl mx-auto text-center text-white">

```
    <h2 className="text-3xl md:text-4xl font-bold">
      Ready to Start Your TNPSC Preparation?
    </h2>

    <p className="mt-4 text-lg">
      Join thousands of aspirants using AI-powered learning,
      mock tests, and study plans to achieve their goals.
    </p>

    <div className="mt-8">
      <Link
        to="/register"
        className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
      >
        Register Free
      </Link>
    </div>

  </div>
</section>


);
};

export default CTA;
