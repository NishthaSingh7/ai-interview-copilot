# AI Interview Co-Pilot

Resume-aware mock interview simulator — upload your PDF, pick a role, and get personalized AI-generated questions powered by Google Gemini.

**Live demo:** [ai-interview-co-pilot.netlify.app](https://ai-interview-co-pilot.netlify.app)

## Features

- PDF resume parsing with structured section extraction
- Role-based question generation (GenAI, Frontend, Backend, Full Stack, ML, DevOps, and more)
- Answer evaluation and session coaching via Gemini
- Transcript cleanup and budget-aware API usage
- Deployed frontend (Netlify) + backend (Railway)

## Stack

React · TypeScript · Tailwind CSS · FastAPI · Python · Google Gemini · MongoDB

## Run locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install && npm run dev
```

→ Backend: http://localhost:8000 · Frontend: http://localhost:5173

## Flow

Upload PDF → Select role → Start interview → Answer questions → Get AI feedback

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/upload-resume` | Parse PDF resume |
| POST | `/start-interview` | Generate personalized questions |
| POST | `/evaluate-answer` | Score and feedback on answers |
| POST | `/session-coaching` | End-of-session coaching summary |

## Supported roles

GenAI Engineer · Frontend · Backend · Full Stack · Data Scientist · ML Engineer · DevOps · Product Manager · System Design

## Project structure

```
├── frontend/       # React + TypeScript UI
├── backend/        # FastAPI + Gemini + resume parser
├── observability/  # Logging and monitoring setup
└── netlify.toml    # Frontend deploy + API proxy to Railway
```

## Roadmap

- Speech-to-text for spoken answers
- RAG over company/job descriptions
- Session history and progress tracking

---

Built by **Nishtha Singh** · [Portfolio](https://nishthasinghportfolio.netlify.app/)
