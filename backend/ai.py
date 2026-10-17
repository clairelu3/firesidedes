"""AI functions. These are stubs; the AI person replaces the bodies.

Keep the signatures and return shapes the same so main.py doesn't need to change.
"""


def transcribe(data: bytes, filename: str) -> str:
    """Audio bytes -> transcript text."""
    return f"[stub transcript for {filename}]"


def tag_memo(transcript: str, life_map: list[dict], people: list[dict]) -> dict:
    """Transcript + context -> tags.

    Returns {"stage_id": <id from life_map or None>, "people": [names], "themes": [str]}
    """
    return {
        "stage_id": life_map[0]["id"] if life_map else None,
        "people": [],
        "themes": [],
    }


def write_chapter(stage: dict, memos: list[dict]) -> dict:
    """Stage + its memos -> {"title": str, "body": str}."""
    transcripts = "\n\n".join(m["transcript"] or "" for m in memos)
    return {
        "title": stage["label"],
        "body": f"[stub chapter from {len(memos)} memos]\n\n{transcripts}",
    }
