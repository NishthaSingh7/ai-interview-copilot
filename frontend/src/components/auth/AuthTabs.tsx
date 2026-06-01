import { Link, useLocation } from "react-router-dom";

const tabs = [
  { path: "/login", label: "Log in" },
  { path: "/register", label: "Sign up" },
] as const;

export default function AuthTabs() {
  const { pathname } = useLocation();

  return (
    <div className="auth-tabs" role="tablist" aria-label="Authentication">
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            role="tab"
            aria-selected={active}
            className={`auth-tab ${active ? "auth-tab-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
