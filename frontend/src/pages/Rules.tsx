import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const limits = [
  {
    title: "One mock interview per day",
    body: "Each verified account can start one new interview session per calendar day (UTC). Finish or stop that session — you cannot start another until the next day.",
  },
  {
    title: "Email verification required",
    body: "Sign up with a real email. We send a 6-digit OTP so fake addresses cannot burn our free AI quota.",
  },
  {
    title: "Shared AI budget (free tier)",
    body: "We use Gemini on a free API tier. If daily AI calls are exhausted, questions and scoring still work using offline fallbacks — the app will not crash.",
  },
  {
    title: "Speech cleaning",
    body: "Voice answers are cleaned locally for tech terms (WebRTC, JWT, etc.). Full AI transcript polish may be limited to save API calls.",
  },
  {
    title: "Login required for Interview & Feedback",
    body: "Home and this Rules page are public. Starting an interview and viewing session feedback require a verified account.",
  },
];

const Rules = () => {
  const { user } = useAuth();

  return (
    <div className="interview-room flex-1 overflow-y-auto">
      <div className="interview-room-grid" aria-hidden />
      <div className="interview-room-spotlight" aria-hidden />

      <div className="relative z-10 min-h-full p-6 md:p-10 max-w-3xl mx-auto">
        <span className="home-hero-badge">Beta · Fair use</span>

        <h1 className="text-3xl md:text-4xl font-bold mt-5 mb-4 tracking-tight">
          Usage{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-500">
            rules
          </span>
        </h1>

        <p className="opacity-70 text-lg mb-8 leading-relaxed">
          Interview Copilot is in an active building phase. These limits keep the product free and
          fair while we run on a shared Gemini API key.
        </p>

        <div className="home-setup-card mb-8 border-amber-500/30 bg-amber-500/5">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Still evolving</p>
          <p className="text-sm opacity-80 mt-2 leading-relaxed">
            Features, question quality, and limits may change as we deploy. Check this page before
            recording a demo or sharing the app publicly.
          </p>
        </div>

        <div className="space-y-5 mb-10">
          {limits.map((item, i) => (
            <div key={item.title} className="rules-item">
              <span className="rules-num">{i + 1}</span>
              <div>
                <h2 className="font-semibold text-lg">{item.title}</h2>
                <p className="text-sm opacity-70 mt-2 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/" className="interview-btn-ghost px-5 py-2.5">
            Home
          </Link>
          {user?.email_verified ? (
            <>
              <Link to="/interview" className="interview-cta-primary px-5 py-2.5">
                Interview room
              </Link>
              <Link to="/feedback" className="interview-btn-ghost px-5 py-2.5">
                Feedback
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="interview-cta-primary px-5 py-2.5">
                Sign up
              </Link>
              <Link to="/login" className="interview-btn-ghost px-5 py-2.5">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rules;
