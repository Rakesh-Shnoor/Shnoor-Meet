import { Menu, HelpCircle, MessageSquare, Settings, Grid } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useEffect } from "react";

export default function MeetingHeader({ toggleSidebar, onSwitchAccount, onManageAccount }) {
  const currentTime = format(new Date(), 'HH:mm • EEE, d MMM');

  const user = JSON.parse(localStorage.getItem("user"));

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white text-gray-700 border-b border-gray-100 h-16 shadow-sm">

      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2 ml-1">
          <div className="w-10 h-10 overflow-hidden">
            <img src="/logo.jpg" alt="logo" className="w-full h-full" />
          </div>

          <span className="text-lg md:text-xl text-gray-600">
            Shnoor{" "}
            <span className="text-gray-500 hidden sm:inline">
              International LLC Meetings
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">

        <div className="text-gray-500 mr-4 hidden md:block">
          {currentTime}
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <HelpCircle size={22} />
        </button>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MessageSquare size={22} />
        </button>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Settings size={22} />
        </button>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Grid size={22} />
        </button>

        <div className="relative" ref={profileRef}>

          <img
            src={user?.picture}
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-10 h-10 rounded-full cursor-pointer border hover:scale-105 transition"
          />

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white shadow-xl rounded-xl p-4 z-50">

              <div className="flex items-center gap-3 mb-4">
                <img src={user?.picture} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={onManageAccount}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Manage Account
              </button>

              <button
                onClick={onSwitchAccount}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Switch Account
              </button>

              <button
                className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 rounded"
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}