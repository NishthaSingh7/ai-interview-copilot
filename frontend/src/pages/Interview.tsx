import { useState } from "react";
import { api } from "../services/api";

type Question = {
  question: string;
  tag: string;
};

const Interview = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false); // 🔥 controls button visibility

  const startInterview = async () => {
    try {
      setLoading(true);

      const sections = JSON.parse(localStorage.getItem("sections") || "{}");
      const role = localStorage.getItem("role");

      if (!sections || !role) {
        alert("Missing data ❌");
        return;
      }

      const res = await api.post("/start-interview", {
        sections,
        role,
      });

      setQuestions(res.data.questions || []);
      setStarted(true); // 🔥 hide button after success
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions ❌");
    } finally {
      setLoading(false);
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "PROJECT":
        return "bg-purple-500";
      case "SKILL":
        return "bg-green-500";
      case "EXPERIENCE":
        return "bg-yellow-500";
      case "ROLE":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex-1 p-10">
      <h1 className="text-3xl font-bold mb-6">🎤 Interview Room</h1>

      {/* 🔥 BUTTON (ONLY BEFORE START) */}
      {!started && (
        <button
          onClick={startInterview}
          disabled={loading}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg mb-6"
        >
          {loading ? "Generating..." : "Start Interview 🚀"}
        </button>
      )}

      {/* 🔥 LOADING STATE */}
      {loading && (
        <p className="animate-pulse mb-4">🤖 Generating your interview...</p>
      )}

      {/* 🔥 QUESTIONS */}
      {started && (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div
              key={index}
              className="relative p-5 border border-[var(--border)] rounded-xl bg-[var(--card)]"
            >
              {/* TAG */}
              <span
                className={`absolute top-2 right-2 text-xs px-2 py-1 rounded text-white ${getTagColor(
                  q.tag,
                )}`}
              >
                {q.tag}
              </span>

              {/* QUESTION */}
              <p className="font-medium pr-16">
                {index + 1}. {q.question}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Interview;
