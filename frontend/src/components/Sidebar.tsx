import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const onAuthPage = ["/login", "/register", "/verify-email"].includes(location.pathname);

  return (
    <div
      className={`h-screen transition-all duration-300 border-r border-[var(--border)] bg-[var(--card)] flex flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold">
              Interview<span className="text-[var(--primary)]">.AI</span>
            </h1>
            <p className="text-xs opacity-60">Mock Interview Coach</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-[#13151C]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "↪" : "↩"}
        </button>
      </div>

      <div className="px-3 mb-6">
        {!collapsed && <p className="text-xs opacity-60 mb-2">NAVIGATION</p>}

        <button
          type="button"
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${
            isActive("/")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          {!collapsed ? "Home" : "H"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/interview")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${
            isActive("/interview")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          {!collapsed ? "Interview" : "I"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/feedback")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-2 ${
            isActive("/feedback")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          {!collapsed ? "Feedback" : "F"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/rules")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md ${
            isActive("/rules")
              ? "bg-[var(--primary)] text-white"
              : "hover:bg-gray-200 dark:hover:bg-[#13151C]"
          }`}
        >
          {!collapsed ? "Rules" : "R"}
        </button>
      </div>

      <div className="px-3 mb-4 mt-auto">
        {!collapsed && user && (
          <div className="mb-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
            <p className="text-xs opacity-50 mb-1">Signed in as</p>
            <p className="text-sm font-medium truncate" title={user.email}>
              {user.email}
            </p>
          </div>
        )}

        {!user ? (
          <div className={`flex flex-col gap-2 ${collapsed ? "items-center" : ""}`}>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className={`interview-cta-primary text-sm py-2.5 ${
                collapsed ? "px-2 w-full" : "w-full"
              } ${isActive("/register") ? "ring-2 ring-white/30" : ""}`}
            >
              {!collapsed ? "Sign up" : "+"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`interview-btn-ghost text-sm w-full ${
                isActive("/login") ? "border-[var(--primary)]" : ""
              }`}
            >
              {!collapsed ? "Log in" : "In"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="interview-btn-ghost w-full text-sm"
          >
            {!collapsed ? "Log out" : "Out"}
          </button>
        )}

        {!collapsed && !user && !onAuthPage && (
          <p className="text-xs opacity-45 mt-3 text-center leading-relaxed">
            Sign up to unlock your daily mock interview
          </p>
        )}
      </div>

      <div className="p-3">
        <ThemeToggle collapsed={collapsed} />
      </div>
    </div>
  );
};

export default Sidebar;
