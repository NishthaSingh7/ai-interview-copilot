import { useCallback, useRef, useState } from "react";

type SpeechCallbacks = {
  /** Raw speech text only — do not show directly to users */
  onRawUpdate?: (raw: string) => void;
  onRawFinal?: (raw: string) => void;
};

export const useSpeechToText = () => {
  const [listening, setListening] = useState(false);
  const rawRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback((callbacks?: SpeechCallbacks) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    rawRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finals = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finals += chunk;
        } else {
          interim += chunk;
        }
      }

      rawRef.current = (finals + interim).trim();
      callbacks?.onRawUpdate?.(rawRef.current);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      const raw = rawRef.current.trim();
      if (raw) {
        callbacks?.onRawFinal?.(raw);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, []);

  const resetLive = useCallback(() => {
    rawRef.current = "";
  }, []);

  const getRawTranscript = useCallback(() => rawRef.current.trim(), []);

  return {
    listening,
    startListening,
    stopListening,
    resetLive,
    getRawTranscript,
  };
};
