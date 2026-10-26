import React from "react";
import { NavLink } from "react-router-dom";
import { navItems } from "./navLinks";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <Icon size={22} />
              <span className="text-xs font-medium">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;