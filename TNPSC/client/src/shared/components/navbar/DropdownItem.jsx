import React, { memo } from "react";
import { Link } from "react-router-dom";

const DropdownItem = ({
  to,
  icon: Icon,
  children,
  onClick,
  danger = false,
}) => {
  const classes = `
    flex items-center gap-3
    w-full px-4 py-3
    text-sm font-medium
    rounded-lg
    transition-all duration-200
    ${
      danger
        ? "text-red-600 hover:bg-red-50"
        : "text-slate-700 hover:bg-slate-100"
    }
  `;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {Icon && <Icon size={18} className="shrink-0" />}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
};

export default memo(DropdownItem);