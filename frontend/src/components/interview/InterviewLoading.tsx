type Props = {
  role: string;
};

const InterviewLoading = ({ role }: Props) => (
  <div className="interview-loading flex flex-col items-center justify-center py-20">
    <div className="interview-interviewer mb-8">
      <div className="interview-avatar-ring interview-avatar-ring-active">
        <div className="interview-avatar">
          <div className="flex items-end justify-center gap-1 h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="wave-bar rounded-full"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-sm font-medium mt-4">AI Interviewer</p>
    </div>

    <span className="interview-badge-live mb-4">
      <span className="live-dot" />
      Preparing session
    </span>

    <h2 className="text-xl font-semibold mb-2">Building your interview</h2>
    <p className="text-sm opacity-60 text-center max-w-md mb-8">
      Crafting questions for <strong className="opacity-90">{role}</strong> based on your
      resume...
    </p>

    <ul className="text-sm opacity-50 space-y-2">
      <li className="interview-loading-step">Analyzing projects</li>
      <li className="interview-loading-step" style={{ animationDelay: "0.4s" }}>
        Mapping skills to role
      </li>
      <li className="interview-loading-step" style={{ animationDelay: "0.8s" }}>
        Generating question set
      </li>
    </ul>
  </div>
);

export default InterviewLoading;
