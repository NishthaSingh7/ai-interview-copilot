import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../components/auth/AuthField";
import AuthShell from "../components/auth/AuthShell";
import { saveAuthToken, useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getApiErrorMessage } from "../utils/apiErrors";
import { normalizeEmail } from "../utils/email";

const OTP_LENGTH = 6;

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPendingEmail, refreshUser } = useAuth();
  const initialEmail =
    (location.state as { email?: string })?.email || getPendingEmail() || "";

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join("");

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, value: string) => {
    const d = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    if (d && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, i) => pasted[i] || "");
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError("Enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ access_token: string }>("/auth/verify-email", {
        email: normalizeEmail(email),
        otp,
      });
      saveAuthToken(res.data.access_token);
      await refreshUser();
      navigate("/interview", { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Verification failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    try {
      const res = await api.post<{ message: string }>("/auth/resend-otp", {
        email: normalizeEmail(email),
      });
      setMessage(res.data.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend code."));
    }
  };

  return (
    <AuthShell
      badge="Almost there"
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Check spam if you don't see it."
    >
      <form onSubmit={handleVerify} className="space-y-5">
        <AuthField
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <p className="auth-label mb-3">Verification code</p>
          <div className="auth-otp-boxes" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                aria-label={`Digit ${i + 1}`}
                className="auth-otp-digit"
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <button
          type="submit"
          disabled={loading || otp.length !== OTP_LENGTH}
          className="interview-cta-primary auth-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="interview-cta-spinner" />
              Verifying...
            </span>
          ) : (
            "Verify & start practicing"
          )}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button type="button" onClick={handleResend} className="interview-btn-ghost w-full">
        Resend code
      </button>

      <p className="auth-footer-link">
        Wrong email? <Link to="/register">Sign up again</Link>
        {" · "}
        <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
};

export default VerifyEmail;
