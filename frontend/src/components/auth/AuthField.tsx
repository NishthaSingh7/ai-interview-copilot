import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export default function AuthField({ label, hint, id, className = "", ...props }: Props) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="auth-field">
      <label htmlFor={fieldId} className="auth-label">
        {label}
      </label>
      <input id={fieldId} className={`auth-input ${className}`} {...props} />
      {hint && <p className="auth-hint">{hint}</p>}
    </div>
  );
}
