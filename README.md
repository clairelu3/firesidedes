# Family Story

Storytellers record short voice memos; AI places them on their life timeline and stitches them into chapters their family can read. Demo mode: one shared bucket of memos, no family accounts.

## Run it

**Backend** (FastAPI, port 8000):
```bash
cd backend
python3 -m venv venv && venv/bin/pip install -r requirements.txt
cp .env.example .env        # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
venv/bin/uvicorn main:app --reload
```

**Frontend** (Vite, port 5173, proxies `/api` → backend):
```bash
npm install                 # .npmrc sets legacy-peer-deps
npm run dev                 # laptop only
npm run dev:phone           # HTTPS on your Wi-Fi IP so phones can scan the QR and use the mic
```

Demo: open `/qr` on the laptop, scan with a phone → `/r` → record → it shows up placed on the timeline in the live feed.

## AI pipeline (`backend/ai.py`, one `OPENAI_API_KEY`)

| Function | Does |
|---|---|
| `transcribe(data, filename)` | Whisper → transcript (any language, code-switching) |
| `tag_memo(transcript, life_map, people)` | → `{stage_id, people, themes, summary, place, year_start, year_end, year_is_estimate, unmatched_people, tone, sensitive, sensitivity_reason}` stored in `memos.tags` |
| `write_chapter(stage, memos)` | → `{title, body}`; `body = {passages: [{text, memoId, memoIds, kind, uncertain}], yearRange, openQuestions, sensitive}` |

`passages[].memoId` matches the frontend's `Passage` type. `kind` is `quote` (her words), `narration`, or `connective` (AI-added context). Without `OPENAI_API_KEY` the functions fall back to stubs.

Optional env: `OPENAI_MODEL` (default `gpt-4.1`), `OPENAI_TRANSCRIBE_MODEL` (default `whisper-1`).
