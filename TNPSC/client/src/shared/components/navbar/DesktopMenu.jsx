// import React from "react";
// import { Link } from "react-router-dom";

// // const navLinks = [
// //   {
// //     name: "Home",
// //     path: "/",
// //   },
// //   {
// //     name: "Mock Tests",
// //     path: "/mock-tests",
// //   },
// //   {
// //     name: "Previous Papers",
// //     path: "/previous-papers",
// //   },
// //   {
// //     name: "AI Tutor",
// //     path: "/ai-tutor",
// //   },
// //   {
// //     name: "Dashboard",
// //     path: "/dashboard",
// //   },
// // ];

// // const navLinks = [
// //   {
// //     name: "Home",
// //     path: "/",
// //   },
// //   {
// //     name: "Materials",
// //     path: "/study-hub",
// //   },
// //   {
// //     name: "Mock Tests",
// //     path: "/mock-tests",
// //   },
// //   {
// //     name: "AI Mentor",
// //     path: "/ai-tutor",
// //   },
// //   {
// //     name: "Previous Year Question",
// //     path: "/dashboard",
// //   },
// // ];

// const DesktopMenu = () => {
//   return (
//     <ul className="hidden md:flex items-center gap-8 font-medium">
//       {navLinks.map((link) => (
//         <li key={link.path}>
//           <Link
//             to={link.path}
//             className="hover:text-blue-600 transition-colors"
//           >
//             {link.name}
//           </Link>
//         </li>
//       ))}
//     </ul>
//   );
// };

// export default DesktopMenu;
import { NavLink } from "react-router-dom";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Materials", path: "/study-hub" },
  { name: "Mock Tests", path: "/mock-tests" },
  { name: "AI Mentor", path: "/ai-tutor" },
  { name: "Previous Papers", path: "/previous-papers" },
];

const DesktopMenu = () => {
  return (
    <ul className="hidden md:flex items-center gap-8">
      {navLinks.map((link) => (
        <li key={link.path}>
          <NavLink
            to={link.path}
            className={({ isActive }) =>
              `font-medium transition-colors ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
              }`
            }
          >
            {link.name}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};

export default DesktopMenu;