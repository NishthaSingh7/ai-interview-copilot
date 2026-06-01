import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  INTERVIEW_MODE_KEY,
  JOB_DESCRIPTION_KEY,
  QUESTION_LIMITS,
  type InterviewMode,
} from "../constants/interview";
import { api } from "../services/api";
import { loadHistory } from "../utils/interviewSession";

const roles = [
  "GenAI Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "ML Engineer",
  "DevOps Engineer",
  "Product Manager",
  "System Design",
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedRole, setSelectedRole] = useState("");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("full");
  const [jobDescription, setJobDescription] = useState("");
  const [showJd, setShowJd] = useState(false);

  useEffect(() => {
    const sections = localStorage.getItem("sections");
    const storedRole = localStorage.getItem("role");
    const storedFileName = localStorage.getItem("resumeFileName");
    const storedMode = localStorage.getItem(INTERVIEW_MODE_KEY) as InterviewMode | null;
    const storedJd = localStorage.getItem(JOB_DESCRIPTION_KEY);

    if (sections) {
      setResumeUploaded(true);
      if (storedFileName) setFileName(storedFileName);
    }
    if (storedRole) setSelectedRole(storedRole);
    if (storedMode === "quick" || storedMode === "full") setInterviewMode(storedMode);
    if (storedJd) {
      setJobDescription(storedJd);
      setShowJd(true);
    }

    const history = loadHistory();
    setSessionCount(history.length);
    if (history[0]) setLastScore(history[0].overallScore);
  }, []);

  const ready = selectedRole && resumeUploaded;
  const setupProgress = (resumeUploaded ? 1 : 0) + (selectedRole ? 1 : 0);

  const handleStart = () => {
    if (!ready) return;
    localStorage.setItem("role", selectedRole);
    localStorage.setItem(INTERVIEW_MODE_KEY, interviewMode);
    if (jobDescription.trim()) {
      localStorage.setItem(JOB_DESCRIPTION_KEY, jobDescription.trim());
    } else {
      localStorage.removeItem(JOB_DESCRIPTION_KEY);
    }
    navigate("/interview");
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await api.post("/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.sections) {
        localStorage.setItem("sections", JSON.stringify(res.data.sections));
        localStorage.setItem("resumeFileName", file.name);
        setResumeUploaded(true);
        setFileName(file.name);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Is the backend running on port 8000?");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="interview-room flex-1 overflow-y-auto">
      <div className="interview-room-grid" aria-hidden />
      <div className="interview-room-spotlight" aria-hidden />

      <div className="relative z-10 min-h-full p-6 md:p-10 max-w-5xl mx-auto">
        <span className="home-hero-badge">AI Interview Copilot</span>

        <h1 className="text-4xl md:text-5xl font-bold mt-5 mb-4 tracking-tight leading-tight">
          Ace your next{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-500">
            tech interview
          </span>
        </h1>

        <p className="opacity-70 max-w-xl mb-10 text-lg">
          Upload your resume, choose your target role, and step into a mock interview room
          built around your real experience.
        </p>

        {!user && (
          <div className="mb-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Sign in to start interviewing</p>
              <p className="text-sm opacity-60 mt-1">
                Free account · email verification · one mock interview per day
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="interview-cta-primary px-6 py-2.5 text-sm">
                Sign up
              </Link>
              <Link to="/login" className="interview-btn-ghost px-6 py-2.5 text-sm">
                Log in
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard value="9" label="Roles" />
          <StatCard value="Gemini" label="Question AI" sub="Personalized" />
          <StatCard value="Gemini" label="Evaluation" sub="Per answer" />
          <StatCard
            value={sessionCount > 0 ? String(sessionCount) : "0"}
            label="Sessions"
            sub={lastScore !== null ? `Last: ${lastScore}/10` : "Complete one to score"}
            highlight={sessionCount > 0}
          />
        </div>

        <div className="home-setup-card mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-semibold">Interview setup</h2>
              <p className="text-sm opacity-60 mt-1">
                {setupProgress}/2 steps complete
              </p>
            </div>
            <div className="home-setup-dots" aria-hidden>
              <span className={resumeUploaded ? "done" : ""} />
              <span className={selectedRole ? "done" : ""} />
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <StepNumber n={1} done={resumeUploaded} />
                <h3 className="font-medium">Upload resume</h3>
              </div>

              <label
                htmlFor="resumeUpload"
                className={`home-dropzone block ${resumeUploaded ? "home-dropzone-done" : ""} ${uploading ? "home-dropzone-loading" : ""}`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  id="resumeUpload"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="home-dropzone-icon">
                      {uploading ? (
                        <span className="interview-cta-spinner" />
                      ) : (
                        <svg
                          className="w-6 h-6 opacity-70"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {uploading
                          ? "Parsing your resume..."
                          : resumeUploaded
                            ? fileName
                            : "Drop your PDF here or click to browse"}
                      </p>
                      <p className="text-sm opacity-50 mt-1">
                        {resumeUploaded
                          ? "Resume ready — we’ll tailor questions to your projects & skills"
                          : "PDF only · max typical resume size"}
                      </p>
                    </div>
                  </div>
                  {!uploading && (
                    <span className="home-dropzone-btn shrink-0">
                      {resumeUploaded ? "Replace file" : "Browse"}
                    </span>
                  )}
                </div>
              </label>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <StepNumber n={2} done={Boolean(selectedRole)} />
                <h3 className="font-medium">Select target role</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`home-role-chip ${selectedRole === role ? "home-role-chip-active" : ""}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-medium mb-3">Session length</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <ModeCard
                  active={interviewMode === "quick"}
                  title="Quick practice"
                  desc={`${QUESTION_LIMITS.quick} questions · ~2 min each`}
                  onClick={() => setInterviewMode("quick")}
                />
                <ModeCard
                  active={interviewMode === "full"}
                  title="Full session"
                  desc={`~${QUESTION_LIMITS.full} questions · ~3 min each`}
                  onClick={() => setInterviewMode("full")}
                />
              </div>
            </section>

            <section>
              <button
                type="button"
                onClick={() => setShowJd(!showJd)}
                className="text-sm font-medium opacity-80 hover:opacity-100 flex items-center gap-2"
              >
                <span>{showJd ? "▼" : "▶"}</span>
                Job description (optional)
              </button>
              {showJd && (
                <div className="mt-3">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={5}
                    placeholder="Paste the job posting here — questions will align with this role + your resume..."
                    className="interview-textarea w-full"
                  />
                  {jobDescription.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobDescription("");
                        localStorage.removeItem(JOB_DESCRIPTION_KEY);
                      }}
                      className="text-xs opacity-50 mt-2 hover:opacity-80"
                    >
                      Clear job description
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={!ready}
            className="interview-cta-primary w-full sm:w-auto"
          >
            Enter interview room →
          </button>
          {!ready && (
            <p className="text-sm opacity-50">
              Complete both steps above to unlock the interview room.
            </p>
          )}
          {ready && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {interviewMode === "quick" ? "Quick" : "Full"} session · {selectedRole}
              {jobDescription.trim() ? " · JD added" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ModeCard = ({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`home-role-chip text-left ${active ? "home-role-chip-active" : ""}`}
  >
    <p className="font-medium">{title}</p>
    <p className="text-xs opacity-60 mt-1">{desc}</p>
  </button>
);

const StatCard = ({
  value,
  label,
  sub,
  highlight,
}: {
  value: string;
  label: string;
  sub?: string;
  highlight?: boolean;
}) => (
  <div className={`home-stat-card ${highlight ? "home-stat-card-highlight" : ""}`}>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
    <p className="text-sm opacity-60 mt-0.5">{label}</p>
    {sub && <p className="text-xs opacity-40 mt-1 truncate">{sub}</p>}
  </div>
);

const StepNumber = ({ n, done }: { n: number; done: boolean }) => (
  <span
    className={`home-step-num ${done ? "home-step-num-done" : ""}`}
    aria-label={done ? `Step ${n} complete` : `Step ${n}`}
  >
    {done ? "✓" : n}
  </span>
);

export default Home;
