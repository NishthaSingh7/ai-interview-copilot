import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../components/auth/AuthField";
import AuthShell from "../components/auth/AuthShell";
import AuthTabs from "../components/auth/AuthTabs";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getApiErrorMessage } from "../utils/apiErrors";
import { normalizeEmail } from "../utils/email";

type AuthMessageResponse = {
  message: string;
  verification_code?: string;
  delivery_note?: string;
  email_sent?: boolean;
};

type AccountStatusResponse = {
  exists: boolean;
  email_verified: boolean;
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setPendingEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || "/interview";

  const goToVerify = (
    normalizedEmail: string,
    payload?: Pick<AuthMessageResponse, "verification_code" | "delivery_note" | "email_sent">,
  ) => {
    setPendingEmail(normalizedEmail);
    navigate("/verify-email", {
      state: {
        email: normalizedEmail,
        verificationCode: payload?.verification_code,
        deliveryNote: payload?.delivery_note,
        emailSent: payload?.email_sent,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);

    try {
      await login(normalizedEmail, password);
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
        try {
          const res = await api.post<AuthMessageResponse>("/auth/resend-otp", {
            email: normalizedEmail,
          });
          goToVerify(normalizedEmail, res.data);
        } catch {
          goToVerify(normalizedEmail);
        }
        return;
      }

      if (ax.response?.status === 401 && normalizedEmail) {
        try {
          const statusRes = await api.post<AccountStatusResponse>("/auth/account-status", {
            email: normalizedEmail,
          });
          const { exists, email_verified } = statusRes.data;

          if (!exists) {
            setError("No account on this live site with that email. Sign up first (localhost accounts do not work here).");
            return;
          }

          if (!email_verified) {
            try {
              const res = await api.post<AuthMessageResponse>("/auth/resend-otp", {
                email: normalizedEmail,
              });
              goToVerify(normalizedEmail, res.data);
            } catch {
              goToVerify(normalizedEmail);
            }
            return;
          }

          setError("Wrong password. Try again or sign up with a new email.");
          return;
        } catch {
          /* fall through */
        }
      }

      setError(
        getApiErrorMessage(err, typeof detail === "string" ? detail : "Could not log in."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Welcome back"
      title="Log in to your account"
      subtitle="You must sign up and verify on this site before logging in."
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
