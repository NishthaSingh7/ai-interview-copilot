export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  email_verified: boolean;
};

export type UsageToday = {
  usage_date: string;
  interviews_used_today: number;
  interviews_allowed_per_day: number;
  can_start_interview: boolean;
  limit_message?: string | null;
  next_reset_note: string;
  resets_at_utc?: string | null;
  resets_at_display?: string | null;
};
