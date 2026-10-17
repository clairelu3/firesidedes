"""AI functions: Whisper transcription, memo tagging, chapter writing (all OpenAI, one OPENAI_API_KEY).

Signatures and return shapes match what main.py expects. Without OPENAI_API_KEY the old stubs run,
so the rest of the app still works for anyone who doesn't have the key.
"""
import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1")
TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


# ---------- Helpers ----------

def _call_json(name: str, system: str, user: str, schema: dict) -> dict:
    """One OpenAI call constrained to a JSON schema (strict structured output)."""
    res = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}},
    )
    choice = res.choices[0]
    if choice.message.refusal:
        raise RuntimeError(f"Model declined: {choice.message.refusal}")
    if choice.finish_reason == "length":
        raise RuntimeError("Model response was cut off")
    return json.loads(choice.message.content)


def _context(life_map: list[dict], people: list[dict]) -> str:
    """Life map + roster as text: the context for every AI step."""
    stages = "\n".join(
        f"- [stage_id={s['id']}] {s['label']}: {s.get('place') or '?'}, "
        f"{s.get('start_year') or '?'}–{s.get('end_year') or '?'}"
        + (f". {s['notes']}" if s.get("notes") else "")
        for s in life_map
    )
    roster = "\n".join(
        f"- {p['name']}"
        + (f" (also called {p['nickname']})" if p.get("nickname") else "")
        + (f" — {p['relationship']}" if p.get("relationship") else "")
        for p in people
    )
    return (
        f"<life_map>\n{stages or '(no life stages yet)'}\n</life_map>\n\n"
        f"<people_roster>\n{roster or '(no people yet)'}\n</people_roster>"
    )


# ---------- 1. Transcribe ----------

def transcribe(data: bytes, filename: str, people: list[dict] | None = None) -> str:
    """Audio bytes -> transcript text, in whatever language(s) she spoke.

    The roster's names and nicknames go in as a spelling hint, so "阿偉" / "Ah-Wei" come out right.
    """
    if not client:
        return f"[stub transcript for {filename}: set OPENAI_API_KEY in backend/.env]"
    names = ", ".join(
        p["name"] + (f" ({p['nickname']})" if p.get("nickname") else "") for p in (people or [])
    )
    hint = "Family memory. May mix Mandarin, Taiwanese, and English." + (f" Names: {names}." if names else "")
    res = client.audio.transcriptions.create(model=TRANSCRIBE_MODEL, file=(filename, data), prompt=hint)
    return res.text


# ---------- 2-3. Extract + anchor ----------

_nullable_int = {"type": ["integer", "null"]}
_nullable_str = {"type": ["string", "null"]}

TAG_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "summary", "stage_id", "place", "year_start", "year_end", "year_is_estimate",
        "people", "unmatched_people", "themes", "tone", "sensitive", "sensitivity_reason",
    ],
    "properties": {
        "summary": {"type": "string", "description": "One plain-English sentence on what this memo is about."},
        "stage_id": {**_nullable_int, "description": "stage_id from the life map, or null if truly unclear."},
        "place": _nullable_str,
        "year_start": _nullable_int,
        "year_end": _nullable_int,
        "year_is_estimate": {"type": "boolean"},
        "people": {"type": "array", "items": {"type": "string"}, "description": "Roster names (exact spelling) of people mentioned."},
        "unmatched_people": {"type": "array", "items": {"type": "string"}, "description": "People mentioned who are not in the roster."},
        "themes": {"type": "array", "items": {"type": "string"}, "description": "Short event/theme labels, e.g. 'moved to Taipei'."},
        "tone": {"type": "string", "description": "One or two words, e.g. 'nostalgic', 'funny'."},
        "sensitive": {"type": "boolean"},
        "sensitivity_reason": _nullable_str,
    },
}

TAG_SYSTEM = """You help a family preserve a parent's or grandparent's life story. The storyteller records short voice memos whenever a memory comes back; you tag each memo so it can be placed on her life timeline and later woven into chapters.

You receive the storyteller's life map (life stages with places and years), a roster of the people in her life, and one memo transcript. The transcript may mix languages (for example Mandarin and English) and may contain speech-to-text errors.

How to tag:
- stage_id: anchor the memo to the life stage it is about, using the stage_id values from the life map. Use clues like places, ages, schools, or who she lived with ("when we moved to Taipei" points to the Taipei stage even if no year is spoken). Use null only if nothing in the memo points to a stage.
- Years: give a year range when one is spoken or can be reasonably inferred from the life stage. Set year_is_estimate to true unless she states the year outright.
- people: match people to the roster by name, nickname, or relationship ("my oldest cousin"), and return their roster name exactly. Put anyone you cannot match in unmatched_people, described as she refers to them.
- sensitive: true if the memo touches crime or arrests, mental illness, addiction, affairs, abuse, or family estrangement. These stay private until she decides who sees them, so lean toward flagging. Explain briefly in sensitivity_reason.
- Write summary, place, themes, and tone in English even when she spoke another language, so her English-speaking kids can read them. Keep names as she says them.
- Do not invent facts that are not in the transcript or the life map."""


def tag_memo(transcript: str, life_map: list[dict], people: list[dict]) -> dict:
    """Transcript + context -> tags.

    Returns {"stage_id": <id from life_map or None>, "people": [names], "themes": [str], ...}
    plus summary, place, year_start, year_end, year_is_estimate, unmatched_people, tone,
    sensitive, sensitivity_reason.
    """
    if not client:
        return {"stage_id": life_map[0]["id"] if life_map else None, "people": [], "themes": []}

    tags = _call_json(
        "memo_tags",
        TAG_SYSTEM,
        f"{_context(life_map, people)}\n\n<memo_transcript>\n{transcript}\n</memo_transcript>\n\nTag this memo.",
        TAG_SCHEMA,
    )
    # Keep only roster names the model actually matched; anything else goes to unmatched.
    roster = {p["name"] for p in people}
    tags["unmatched_people"] += [n for n in tags["people"] if n not in roster]
    tags["people"] = [n for n in tags["people"] if n in roster]
    return tags


# ---------- 4-5. Cluster + write ----------

CHAPTER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "year_range", "passages", "open_questions", "sensitive"],
    "properties": {
        "title": {"type": "string", "description": "Warm and specific, e.g. 'The house on Zhongshan Road'."},
        "year_range": {"type": "string", "description": "e.g. '1968–1975' or 'around 1970'."},
        "passages": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["text", "memo_refs", "kind", "uncertain"],
                "properties": {
                    "text": {"type": "string"},
                    "memo_refs": {"type": "array", "items": {"type": "string"}, "description": "Memo refs like 'm1'."},
                    "kind": {"type": "string", "enum": ["quote", "narration", "connective"]},
                    "uncertain": {"type": "boolean"},
                },
            },
        },
        "open_questions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Contradictions or gaps to ask the storyteller about, as short questions to her.",
        },
        "sensitive": {"type": "boolean"},
    },
}

CHAPTER_SYSTEM = """You turn a storyteller's short voice memos into one chapter of her family's book. Her children and grandchildren will read it to understand her life, so the chapter has to sound like her, not like you.

You receive the life stage this chapter covers and the memos anchored to it. Each memo has a ref (m1, m2, ...), a transcript, and its tags.

How to write:
- Keep her voice. Prefer her own words: quote her directly wherever a phrase carries her personality, and mark those passages kind "quote". Retell other parts close to how she said them ("narration"). Add only short "connective" passages that order events and explain context a grandchild would need (where a place is, who a person is).
- Each passage is one to three sentences. Order events chronologically within the stage.
- Every passage lists the memo_refs it comes from. A connective passage cites the memos it bridges. Never write a passage with no source.
- Never invent events, names, dates, or feelings that are not in the memos or the life stage. If a detail is uncertain, say so in the text ("around 1970", "she thinks it was") and set uncertain to true.
- If two memos disagree (for example, a cousin leaving in 1972 versus 1974), do not pick one. Write it neutrally and add a short question for her to open_questions.
- Set sensitive to true if any included memo is flagged sensitive.
- Write the chapter in English. Translate quotes into English if she spoke another language, and keep names and place names as she says them."""


def write_chapter(stage: dict, memos: list[dict]) -> dict:
    """Stage + its memos -> {"title": str, "body": {...}}.

    body (jsonb) = {
      "passages": [{"text", "memoId", "memoIds", "kind": "quote"|"narration"|"connective", "uncertain"}],
      "yearRange": str, "openQuestions": [str], "sensitive": bool
    }
    memoId is the first cited memo, so it plugs straight into the frontend's Passage type.
    """
    if not client:
        transcripts = "\n\n".join(m["transcript"] or "" for m in memos)
        return {"title": stage["label"], "body": f"[stub chapter from {len(memos)} memos]\n\n{transcripts}"}

    ref_to_id = {}
    blocks = []
    for i, m in enumerate(memos, start=1):
        ref = f"m{i}"
        ref_to_id[ref] = m["id"]
        tags = m.get("tags") or {}
        years = f"{tags.get('year_start') or '?'}–{tags.get('year_end') or '?'}" + (" (estimate)" if tags.get("year_is_estimate") else "")
        who = ", ".join((tags.get("people") or []) + (tags.get("unmatched_people") or []))
        blocks.append(
            f'<memo ref="{ref}" years="{years}" place="{tags.get("place") or "?"}" '
            f'people="{who}" sensitive="{bool(tags.get("sensitive"))}">\n{m.get("transcript") or ""}\n</memo>'
        )

    stage_line = (
        f"{stage['label']} — {stage.get('place') or '?'}, {stage.get('start_year') or '?'}–{stage.get('end_year') or '?'}"
        + (f". {stage['notes']}" if stage.get("notes") else "")
    )
    draft = _call_json(
        "chapter",
        CHAPTER_SYSTEM,
        f"<chapter_stage>{stage_line}</chapter_stage>\n\n<memos>\n" + "\n\n".join(blocks) + "\n</memos>\n\nWrite this chapter.",
        CHAPTER_SCHEMA,
    )

    passages = []
    for p in draft["passages"]:
        ids = [ref_to_id[r] for r in p["memo_refs"] if r in ref_to_id]
        passages.append({
            "text": p["text"],
            "memoId": ids[0] if ids else None,
            "memoIds": ids,
            "kind": p["kind"],
            "uncertain": p["uncertain"],
        })

    return {
        "title": draft["title"],
        "body": {
            "passages": passages,
            "yearRange": draft["year_range"],
            "openQuestions": draft["open_questions"],
            "sensitive": draft["sensitive"] or any((m.get("tags") or {}).get("sensitive") for m in memos),
        },
    }
