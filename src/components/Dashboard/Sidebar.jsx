import React, { useState } from 'react';
import {
  FaUserCircle,
  FaFileUpload,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-indigo-700 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b border-indigo-600">
        <h2 className={`font-bold text-xl ${collapsed ? 'hidden' : 'block'}`}>
          Dashboard
        </h2>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <a
          href="#profile"
          className="flex items-center p-2 rounded hover:bg-indigo-600"
        >
          <FaUserCircle className="mr-2" />
          {!collapsed && 'Profile'}
        </a>
        <a
          href="#upload"
          className="flex items-center p-2 rounded hover:bg-indigo-600"
        >
          <FaFileUpload className="mr-2" />
          {!collapsed && 'Upload'}
        </a>
      </nav>
    </div>
  );
};

export default Sidebar;
