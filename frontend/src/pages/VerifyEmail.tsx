import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../components/auth/AuthField";
import AuthShell from "../components/auth/AuthShell";
import { saveAuthToken, useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getApiErrorMessage } from "../utils/apiErrors";
import { normalizeEmail } from "../utils/email";
import { codeToDigits, OTP_LENGTH } from "../utils/otp";

type VerifyLocationState = {
  email?: string;
  verificationCode?: string;
  emailSent?: boolean;
  deliveryNote?: string;
  accountExists?: boolean;
};

type AuthMessageResponse = {
  message: string;
  email_sent?: boolean;
  verification_code?: string;
  delivery_note?: string;
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPendingEmail, refreshUser } = useAuth();
  const routeState = (location.state as VerifyLocationState) || {};
  const initialEmail = routeState.email || getPendingEmail() || "";

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [displayCode, setDisplayCode] = useState(routeState.verificationCode || "");
  const [error, setError] = useState(
    routeState.accountExists
      ? "An account with this email already exists. Use the code below or tap Resend code."
      : "",
  );
  const [message, setMessage] = useState("");
  const [deliveryNote, setDeliveryNote] = useState(routeState.deliveryNote || "");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join("");

  const applyVerificationCode = useCallback((code: string) => {
    setDisplayCode(code);
    setDigits(codeToDigits(code));
  }, []);

  useEffect(() => {
    if (routeState.verificationCode) {
      applyVerificationCode(routeState.verificationCode);
    }
    if (routeState.emailSent !== false) {
      setMessage("Check your inbox for the 6-digit code (and spam folder).");
    }
  }, [routeState.verificationCode, routeState.emailSent, applyVerificationCode]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleResend = async () => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setError("Enter your email first.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const res = await api.post<AuthMessageResponse>("/auth/resend-otp", {
        email: normalized,
      });
      if (res.data.verification_code) {
        applyVerificationCode(res.data.verification_code);
      }
      setDeliveryNote(res.data.delivery_note || "");
      setMessage(
        res.data.email_sent
          ? "New code sent to your email."
          : res.data.message || "Could not send email.",
      );
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend code."));
    }
  };

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
    applyVerificationCode(pasted);
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

  return (
    <AuthShell
      badge="Almost there"
      title="Verify your email"
      subtitle="Enter the 6-digit code from your email."
    >
      {deliveryNote && <p className="auth-error mb-4">{deliveryNote}</p>}
      {displayCode && (
        <div className="auth-otp-fallback mb-4">
          <p className="auth-otp-fallback-label">Your verification code</p>
          <p className="auth-otp-fallback-code">{displayCode}</p>
        </div>
      )}
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
