import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthField from "../components/auth/AuthField";
import AuthShell from "../components/auth/AuthShell";
import AuthTabs from "../components/auth/AuthTabs";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getApiErrorMessage } from "../utils/apiErrors";

const Register = () => {
  const navigate = useNavigate();
  const { setPendingEmail } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", { email, password, name: name || undefined });
      setPendingEmail(email);
      navigate("/verify-email", { state: { email } });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Get started"
      title="Create your account"
      subtitle="Verify your email with a one-time code, then start practicing."
    >
      <AuthTabs />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Nishtha Singh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Optional — shown in your profile"
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthField
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Repeat password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
              Creating account...
            </span>
          ) : (
            "Sign up"
          )}
        </button>
      </form>
      <p className="auth-footer-link">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
