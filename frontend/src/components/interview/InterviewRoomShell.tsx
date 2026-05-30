import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const InterviewRoomShell = ({ children }: Props) => (
  <div className="interview-room flex-1 overflow-y-auto">
    <div className="interview-room-grid" aria-hidden />
    <div className="interview-room-spotlight" aria-hidden />
    <div className="relative z-10 min-h-full p-6 md:p-10 max-w-5xl mx-auto">{children}</div>
  </div>
);

export default InterviewRoomShell;
