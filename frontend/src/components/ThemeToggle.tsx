import { useTheme } from "../hooks/useTheme";

const ThemeToggle = ({ collapsed }: { collapsed?: boolean }) => {
  const { dark, setDark } = useTheme();

  return (
    <button
      onClick={() => setDark(!dark)}
      className="w-full px-3 py-2 rounded-md border border-[var(--border)] hover:bg-gray-200 dark:hover:bg-[#13151C]"
    >
      {collapsed ? "🌗" : dark ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );
};

export default ThemeToggle;
