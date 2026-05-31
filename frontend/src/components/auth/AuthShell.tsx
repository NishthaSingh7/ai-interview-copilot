import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  children: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
};

const perks = [
  { icon: "🎯", text: "One focused mock interview per day" },
  { icon: "🎤", text: "Speak or type — AI cleans your answers" },
  { icon: "📊", text: "Instant score & coach feedback" },
  { icon: "🔒", text: "Verified email — no fake signups" },
];

export default function AuthShell({ children, title, subtitle, badge }: Props) {
  return (
    <div className="auth-page min-h-full flex items-center justify-center p-6 md:p-10">
      <div className="auth-grid w-full max-w-5xl">
        <aside className="auth-brand-panel hidden lg:flex flex-col justify-between">
          <div>
            <Link to="/" className="auth-logo">
              Interview<span className="auth-logo-accent">.AI</span>
            </Link>
            <p className="auth-brand-tagline mt-6">
              Your AI mock interview copilot — practice like it&apos;s the real room.
            </p>
            <ul className="auth-perk-list mt-10">
              {perks.map((p) => (
                <li key={p.text} className="auth-perk-item">
                  <span className="auth-perk-icon" aria-hidden>
                    {p.icon}
                  </span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs opacity-45">Built for GenAI & full-stack interview prep</p>
        </aside>

        <div className="auth-card">
          <div className="lg:hidden mb-6 text-center">
            <Link to="/" className="auth-logo text-xl">
              Interview<span className="auth-logo-accent">.AI</span>
            </Link>
          </div>

          {badge && <span className="home-hero-badge mb-4">{badge}</span>}
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
