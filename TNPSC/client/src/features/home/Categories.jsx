import React from "react";

const categories = [
"Group 1",
"Group 2",
"Group 2A",
"Group 4",
"VAO",
];

const Categories = () => {
return ( <section className="py-20 px-6"> <div className="max-w-7xl mx-auto">

```
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold">
        TNPSC Exam Categories
      </h2>

      <p className="mt-3 text-gray-600">
        Choose your target exam and start preparing with AI-powered tools.
      </p>
    </div>

    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
      {categories.map((category) => (
        <div
          key={category}
          className="p-6 text-center border rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <h3 className="text-xl font-semibold">
            {category}
          </h3>
        </div>
      ))}
    </div>

  </div>
</section>

);
};

export default Categories;
