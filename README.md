# Family Story

Storytellers record short voice memos; AI places them on their life timeline and stitches them into chapters their family can read. Demo mode: one shared bucket of memos, no family accounts.

## Run it (Mac)

```bash
git clone git@github.com:riannamarquez/fireside2026.git && cd fireside2026
npm run setup        # installs everything, creates backend/.env and .env.local from the templates
```

Fill in the keys (ask Kenza, by DM, never commit them):
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → API keys → Secret key), `OPENAI_API_KEY`
- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Supabase publishable key)

Then:
```bash
npm run check-env    # says which keys are missing (never prints them)
npm start            # backend :8000 + frontend http://localhost:5173 — Ctrl+C stops both
```

Restart `npm start` after changing `backend/.env`; the backend only reads it at startup.

| Page | URL |
|---|---|
| Life Map / Record / Memories / Review / Read | http://localhost:5173 |
| Storytime (kids' book) | Memories → ✨ Storytime on any memory |
| QR for phones | `/qr` (phones need HTTPS, see below) |

**Phones (demo laptop only):** phones only allow the mic over HTTPS. With `npm start` running, run `npm run tunnel` (needs `brew install cloudflared`) and open the `https://….trycloudflare.com/qr` URL it prints. The QR on that page points at the tunnel.

Troubleshooting: `address already in use` on 8000 → the backend is already running, that's fine. `cd: no such file or directory: backend` → you're already in `backend/`, run from the project root.

## AI pipeline (`backend/ai.py`, one `OPENAI_API_KEY`)

| Function | Does |
|---|---|
| `transcribe(data, filename, people)` | gpt-4o-transcribe → transcript in her own language(s), roster names as spelling hints |
| `tag_memo(transcript, life_map, people)` | → `{stage_id, people, themes, summary, place, year_start, year_end, year_is_estimate, unmatched_people, tone, sensitive, sensitivity_reason}` stored in `memos.tags` |
| `write_chapter(stage, memos)` | → `{title, body}`; `body = {passages: [{text, memoId, memoIds, kind, uncertain}], yearRange, openQuestions, sensitive}` |

`passages[].memoId` matches the frontend's `Passage` type. `kind` is `quote` (her words), `narration`, or `connective` (AI-added context). Without `OPENAI_API_KEY` the functions fall back to stubs.

Optional env: `OPENAI_MODEL` (default `gpt-4.1`), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-transcribe`).
