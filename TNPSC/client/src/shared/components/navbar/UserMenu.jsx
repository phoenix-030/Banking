import React, { useRef, useState } from "react";
// import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import DropdownItem from "./DropdownItem";
import useClickOutside from "./useClickOutside";

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef(null);

  useClickOutside(
    menuRef,
    () => {
      setIsOpen(false);
    },
    isOpen
  );

  const user = {
    name: "John Doe",
    email: "john@example.com",
    avatar: "",
  };

  const handleLogout = () => {
    console.log("Logout");
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar Button */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Avatar
          name={user.name}
          image={user.avatar}
          size="md"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-3 w-72
            overflow-hidden rounded-2xl
            border border-slate-200
            bg-white
            shadow-xl
            z-50
          "
        >
          {/* User Info */}
          <div className="border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={user.name}
                image={user.avatar}
                size="lg"
              />

              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900">
                  {user.name}
                </h3>

                <p className="truncate text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <DropdownItem to="/profile">
              Profile
            </DropdownItem>

            <DropdownItem to="/dashboard">
              Dashboard
            </DropdownItem>

            <DropdownItem to="/study-planner">
              Study Planner
            </DropdownItem>

            <DropdownItem to="/settings">
              Settings
            </DropdownItem>
          </div>

          {/* Footer */}
          <div className="border-t p-2">
            <DropdownItem
              danger
              onClick={handleLogout}
            >
              Logout
            </DropdownItem>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;