import { useEffect, useState } from "react";

export function useQuestionTimer(
  durationSeconds: number,
  paused: boolean,
  resetKey: number,
) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setRemaining(durationSeconds);
    setExpired(false);
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (paused || remaining <= 0) {
      if (remaining <= 0) setExpired(true);
      return;
    }

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [paused, remaining, resetKey]);

  return { remaining, expired };
}
