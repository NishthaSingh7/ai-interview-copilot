import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../components/auth/AuthField";
import AuthShell from "../components/auth/AuthShell";
import AuthTabs from "../components/auth/AuthTabs";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../utils/apiErrors";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setPendingEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || "/interview";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const ax = err as {
        response?: { status?: number; data?: { detail?: string | { code?: string } } };
      };
      const detail = ax.response?.data?.detail;
      if (
        ax.response?.status === 403 &&
        typeof detail === "object" &&
        detail?.code === "EMAIL_NOT_VERIFIED"
      ) {
        setPendingEmail(email);
        navigate("/verify-email", { state: { email } });
        return;
      }
      const message = getApiErrorMessage(
        err,
        typeof detail === "string" ? detail : "Invalid email or password.",
      );
      setError(
        ax.response?.status === 401
          ? `${message} Accounts on this site are separate from localhost—use Sign up if you have not registered here yet, or verify your email if you just signed up.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Welcome back"
      title="Log in to your account"
      subtitle="Use the email and password you registered on this site (not your local dev account)."
    >
      <AuthTabs />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="auth-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="interview-cta-primary auth-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="interview-cta-spinner" />
              Logging in...
            </span>
          ) : (
            "Log in"
          )}
        </button>
      </form>
      <p className="auth-footer-link">
        Don&apos;t have an account? <Link to="/register">Sign up free</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
