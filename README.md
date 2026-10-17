# Family Story

Storytellers record short voice memos; AI places them on their life timeline and stitches them into chapters their family can read.

## Setup (5 min)

1. `npm install` (an `.npmrc` sets `legacy-peer-deps`; if `npm run dev` complains about a missing native binding, delete `node_modules` + `package-lock.json` and reinstall)
2. Supabase project → **SQL Editor** → run `supabase/schema.sql`, then `supabase/seed.sql` (demo family)
3. `cp .env.example .env.local` and fill in the Supabase URL + anon key
4. Add the OpenAI key (used for Whisper **and** the AI steps): Supabase dashboard → Edge Functions → Secrets → `OPENAI_API_KEY`. Then deploy the functions:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy process-memo --no-verify-jwt
   npx supabase functions deploy stitch-chapter --no-verify-jwt
   ```
5. `npm run dev`

Demo: open `/invite/00000000-0000-0000-0000-000000000001` on a laptop and scan with a phone. Phones only allow the mic on **HTTPS**, so use the deployed (Vercel) URL or a tunnel, not your LAN IP.

## How the pieces fit

| Piece | Where | What |
|---|---|---|
| Schema + types | `supabase/schema.sql`, `src/lib/types.ts` | families, members, life_stages, people, memos, chapters; `audio` storage bucket |
| QR → join → record | `src/pages/JoinRecord.tsx`, `src/components/FamilyQR.tsx` | `/join/:familyId` joins the family if you're new, then shows the record button |
| Recorder | `src/lib/useRecorder.ts` | MediaRecorder + live browser transcription (Web Speech API) |
| AI: tag a memo | `supabase/functions/process-memo` | transcript + life map + roster → life stage, people, place, years, sensitivity |
| AI: write a chapter | `supabase/functions/stitch-chapter` | tagged memos for one life stage → chapter where every sentence cites its memos |
| Client calls | `src/lib/ai.ts` | `processMemo(memoId)`, `stitchChapter(familyId, lifeStageId)` |

Optional secrets: `OPENAI_MODEL` (default `gpt-4.1`) and `OPENAI_TRANSCRIBE_MODEL` (default `whisper-1`) let you change models without redeploying.

Chapter shape (for the review + reader screens): `chapter.sentences = [{ text, memo_ids, kind: 'quote' | 'narration' | 'connective', uncertain }]`, plus `open_questions` (contradictions to ask her about), `status` (`draft` / `approved` / `hidden`) and `audience`. Approved chapters are locked; `stitchChapter` returns them unchanged unless `force` is true.
