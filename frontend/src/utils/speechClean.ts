/** Fast local fixes before/after server-side Gemini cleaning */
export function applyLocalSpeechFixes(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  const fixes: [RegExp, string][] = [
    [/\bw\s*eb\s*r\s*t\s*c\b/gi, "WebRTC"],
    [/\bweb\s+r\s*t\s+c\b/gi, "WebRTC"],
    [/\bweb\s+rtc\b/gi, "WebRTC"],
    [/\bjava\s*script\b/gi, "JavaScript"],
    [/\btype\s*script\b/gi, "TypeScript"],
    [/\bnode\s*js\b/gi, "Node.js"],
    [/\breact\s*js\b/gi, "React"],
    [/\bmongo\s*d\s*b\b/gi, "MongoDB"],
    [/\bfast\s*api\b/gi, "FastAPI"],
    [/\bj\s*w\s*t\b/gi, "JWT"],
    [/\bgen\s*ai\b/gi, "GenAI"],
    [/\bllama\s*3\b/gi, "Llama 3"],
  ];

  text = text.replace(/\s+/g, " ");
  for (const [pattern, replacement] of fixes) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\bi\b/g, "I");
  text = text.replace(/\b(uh+|um+)\b/gi, "");
  text = text.replace(/\s+/g, " ").trim();

  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) text += ".";
  }

  return text;
}
