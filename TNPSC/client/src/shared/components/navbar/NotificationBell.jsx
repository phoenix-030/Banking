import React, { useState } from "react";

const notifications = [
  {
    id: 1,
    message: "New Group 4 Mock Test Available",
  },
  {
    id: 2,
    message: "Current Affairs Updated",
  },
  {
    id: 3,
    message: "Study Plan Reminder",
  },
];

const NotificationBell = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        🔔

        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold">
              Notifications
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="p-4 border-b hover:bg-gray-50"
              >
                {item.message}
              </div>
            ))}
          </div>

          <div className="p-3 text-center">
            <button className="text-blue-600 text-sm">
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;