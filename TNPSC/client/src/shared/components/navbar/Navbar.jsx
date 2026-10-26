// import React, { useState } from "react";

import Logo from "./Logo";
import DesktopMenu from "./DesktopMenu";
// import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
// import BottomNav from "./BottomNav";

// const Navbar = () => {
  // const [isOpen, setIsOpen] = useState(false);

  // Replace with real auth state later
  // const isAuthenticated = false;

  import { Link } from "react-router-dom";

const Navbar = () => {
  const isAuthenticated = false;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo />

        {/* Desktop Navigation */}
        <DesktopMenu />

        {/* Right */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;