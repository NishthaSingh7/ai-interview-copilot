export const OTP_LENGTH = 6;

export function codeToDigits(code: string): string[] {
  const digits = code.replace(/\D/g, "").slice(0, OTP_LENGTH);
  return Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] || "");
}
