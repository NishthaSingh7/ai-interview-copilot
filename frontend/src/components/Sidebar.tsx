import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className={`h-screen transition-all duration-300 border-r border-[var(--border)] bg-[var(--card)] flex flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Top */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold">🎯 Interview.AI</h1>
            <p className="text-xs opacity-60">Mock Interview Coach</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-[#13151C]"
        >
          {collapsed ? "↪" : "↩"}
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 mb-6">
        {!collapsed && <p className="text-xs opacity-60 mb-2">NAVIGATION</p>}

        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${
            isActive("/")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          🏠 {!collapsed && "Home"}
        </button>

        {/* Interview */}
        <button
          onClick={() => navigate("/interview")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${
            isActive("/interview")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          🎤 {!collapsed && "Interview"}
        </button>

        {/* Feedback */}
        <button
          onClick={() => navigate("/feedback")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md ${
            isActive("/feedback")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          📊 {!collapsed && "Feedback"}
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="mt-auto p-3">
        <ThemeToggle collapsed={collapsed} />
      </div>
    </div>
  );
};

export default Sidebar;
