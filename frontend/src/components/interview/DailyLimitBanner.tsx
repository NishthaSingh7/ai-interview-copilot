import { Link } from "react-router-dom";
import type { UsageToday } from "../../types/auth";

type Props = {
  usage: UsageToday;
};

export default function DailyLimitBanner({ usage }: Props) {
  return (
    <div className="daily-limit-banner mb-8" role="alert">
      <div className="daily-limit-icon" aria-hidden>
        ⏳
      </div>
      <div className="flex-1 min-w-0">
        <p className="daily-limit-title">Daily interview limit reached</p>
        <p className="daily-limit-body mt-2">
          You&apos;ve used your{" "}
          <strong>
            {usage.interviews_used_today} of {usage.interviews_allowed_per_day}
          </strong>{" "}
          free mock interview{usage.interviews_allowed_per_day > 1 ? "s" : ""} for today.
        </p>
        <p className="daily-limit-body mt-2 opacity-80">
          {usage.limit_message ||
            "Come back after your limit resets to practice again with fresh AI questions and feedback."}
        </p>
        {usage.resets_at_display && (
          <p className="daily-limit-reset mt-4">
            <span className="daily-limit-reset-label">Next available:</span>{" "}
            {usage.resets_at_display}
          </p>
        )}
        <p className="text-xs opacity-50 mt-3">{usage.next_reset_note}</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/feedback" className="interview-btn-ghost text-sm px-4 py-2">
            View past feedback
          </Link>
          <Link to="/rules" className="interview-btn-ghost text-sm px-4 py-2">
            See usage rules
          </Link>
          <Link to="/" className="interview-btn-ghost text-sm px-4 py-2">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
