import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

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

  const [selectedRole, setSelectedRole] = useState("");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleStart = () => {
    if (!selectedRole || !resumeUploaded) {
      alert("Upload resume + select role first ❌");
      return;
    }

    localStorage.setItem("role", selectedRole);

    navigate("/interview");
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto">
      {/* Badge */}
      <span className="bg-[var(--card)] border border-[var(--border)] px-4 py-1 rounded-full text-sm">
        🚀 AI-POWERED MOCK INTERVIEWS
      </span>

      {/* Heading */}
      <h1 className="text-5xl font-bold mt-6 mb-4">
        Ace your next{" "}
        <span style={{ color: "var(--primary)" }}>tech interview.</span>
      </h1>

      <p className="opacity-70 mb-10">
        Upload your resume, pick a role, and get grilled by AI that understands
        your work.
      </p>

      {/* Stats */}
      <div className="flex gap-16 mb-10">
        <div>
          <p className="font-bold">12+</p>
          <p className="opacity-60 text-sm">Roles Covered</p>
        </div>

        <div>
          <p className="font-bold">RAG</p>
          <p className="opacity-60 text-sm">Smart Questions</p>
        </div>

        <div>
          <p className="font-bold">AI</p>
          <p className="opacity-60 text-sm">Evaluation</p>
        </div>

        <div>
          <p className="font-bold">0</p>
          <p className="opacity-60 text-sm">Sessions</p>
        </div>
      </div>

      {/* Upload */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Step 1 — Upload Resume</h2>

        <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-6 flex justify-between items-center">
          {/* Hidden Input */}
          <input
            type="file"
            accept=".pdf"
            id="resumeUpload"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              if (!file.name.endsWith(".pdf")) {
                alert("Only PDF allowed ❌");
                return;
              }

              const formData = new FormData();
              formData.append("file", file);

              try {
                const res = await api.post("/upload-resume", formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });

                const data = res.data;

                console.log("📥 RESPONSE:", data);

                if (data.sections) {
                  // ✅ store structured JSON
                  localStorage.setItem(
                    "sections",
                    JSON.stringify(data.sections),
                  );

                  setResumeUploaded(true);
                  setFileName(file.name);
                }
              } catch (err) {
                console.error(err);
                alert("Upload failed ❌");
              }
            }}
          />

          {/* UI */}
          <p className="opacity-60">
            {resumeUploaded ? `📄 ${fileName}` : "Drag and drop file here"}
          </p>

          <label
            htmlFor="resumeUpload"
            className="px-4 py-2 border border-[var(--border)] rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-[#13151C]"
          >
            Browse files
          </label>
        </div>

        {/* Success */}
        {resumeUploaded && (
          <p className="text-green-500 mt-2 text-sm">
            ✅ Resume uploaded successfully
          </p>
        )}
      </div>

      {/* Roles */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Step 2 — Select Job Role</h2>

        <div className="grid grid-cols-3 gap-4">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`border border-[var(--border)] p-3 rounded-md transition ${
                selectedRole === role
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "hover:border-[var(--primary)]"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Start */}
        <div className="mt-6">
          <button
            onClick={handleStart}
            className={`px-5 py-2 rounded-md ${
              selectedRole && resumeUploaded
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                : "bg-gray-200 dark:bg-[#13151C] opacity-60"
            }`}
          >
            Enter Interview Room →
          </button>

          <p className="text-yellow-500 mt-2 text-sm">
            ⚠ Upload resume and select a role to begin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
