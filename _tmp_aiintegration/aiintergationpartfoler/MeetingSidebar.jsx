import { Video, Phone } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function MeetingSidebar() {
  const activeClass = "w-full flex items-center gap-4 px-4 py-3 bg-blue-50 text-blue-700 rounded-full font-medium shadow-sm transition-all group";
  const inactiveClass = "w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 text-gray-500 rounded-full font-medium transition-all group";

  return (
    <aside className="w-16 md:w-64 bg-white h-full border-r border-gray-100 flex flex-col py-6">
      <nav className="space-y-2 px-2">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? activeClass : inactiveClass}
        >
          <Video size={20} className="group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline">Meetings</span>
        </NavLink>
        
        <NavLink 
          to="/calls" 
          className={({ isActive }) => isActive ? activeClass : inactiveClass}
        >
          <Phone size={20} className="group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline">Calls</span>
        </NavLink>
      </nav>
    </aside>
  );
}
