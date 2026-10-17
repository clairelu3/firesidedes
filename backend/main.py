import mimetypes
import os
from typing import Any, Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import create_client

import ai

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="dt-hackathon API")
router = APIRouter(prefix="/api")


# ---------- Models ----------

class Stage(BaseModel):
    label: str
    place: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    notes: str | None = None


class Person(BaseModel):
    name: str
    nickname: str | None = None
    relationship: str | None = None


ChapterStatus = Literal["draft", "approved", "hidden"]


class ChapterUpdate(BaseModel):
    status: ChapterStatus | None = None
    title: str | None = None
    body: Any = None  # jsonb column: string or structured JSON


# ---------- Shared helpers (also used by seed.py) ----------

def get_life_map() -> list[dict]:
    return sb.table("life_stages").select("*").order("start_year").execute().data


def get_people() -> list[dict]:
    return sb.table("people").select("*").order("name").execute().data


def insert_stages(stages: list[Stage]) -> list[dict]:
    return sb.table("life_stages").insert([s.model_dump() for s in stages]).execute().data


def insert_people(people: list[Person]) -> list[dict]:
    return sb.table("people").insert([p.model_dump() for p in people]).execute().data


def create_memo(data: bytes, filename: str, content_type: str | None) -> dict:
    content_type = content_type or mimetypes.guess_type(filename)[0] or "audio/webm"
    ext = os.path.splitext(filename)[1] or ".webm"
    path = f"{uuid4()}{ext}"

    sb.storage.from_("memos").upload(path, data, {"content-type": content_type})
    url = sb.storage.from_("memos").get_public_url(path)

    life_map = get_life_map()
    people = get_people()
    transcript = ai.transcribe(data, path, people)
    tags = ai.tag_memo(transcript, life_map, people)

    # Only keep stage_id if it's a real stage, so a bad AI guess can't break the insert
    try:
        stage_id = int(tags.get("stage_id"))
    except (TypeError, ValueError):
        stage_id = None
    if stage_id not in {s["id"] for s in life_map}:
        stage_id = None

    row = sb.table("memos").insert({
        "audio_url": url,
        "transcript": transcript,
        "tags": tags,
        "stage_id": stage_id,
    }).execute()
    return row.data[0]


def generate_chapter(stage_id: int) -> dict:
    stages = sb.table("life_stages").select("*").eq("id", stage_id).execute().data
    if not stages:
        raise HTTPException(404, "Stage not found")
    memos = (
        sb.table("memos").select("*").eq("stage_id", stage_id)
        .order("created_at").execute().data
    )
    if not memos:
        raise HTTPException(400, "No memos for this stage yet")

    chapter = ai.write_chapter(stages[0], memos)
    row = sb.table("chapters").insert({
        "stage_id": stage_id,
        "title": chapter.get("title"),
        "body": chapter["body"],
        "status": "draft",
    }).execute()
    return row.data[0]


# ---------- Onboarding ----------

@router.post("/life-map")
def post_life_map(stages: list[Stage]):
    return insert_stages(stages)


@router.get("/life-map")
def read_life_map():
    return get_life_map()


@router.post("/people")
def post_people(people: list[Person]):
    return insert_people(people)


@router.get("/people")
def read_people():
    return get_people()


# ---------- Memos ----------

@router.post("/memos")
async def upload_memo(file: UploadFile):
    data = await file.read()
    return create_memo(data, file.filename or "memo.webm", file.content_type)


@router.get("/memos")
def list_memos(stage_id: int | None = None):
    query = sb.table("memos").select("*").order("created_at")
    if stage_id is not None:
        query = query.eq("stage_id", stage_id)
    return query.execute().data


@router.post("/memos/{memo_id}/storybook")
def post_storybook(memo_id: int, regenerate: bool = False):
    """Storytime: turn one memo into a rhyming kids' picture book. Saved in memos.tags.storybook."""
    rows = sb.table("memos").select("*").eq("id", memo_id).execute().data
    if not rows:
        raise HTTPException(404, "Memo not found")
    memo = rows[0]
    tags = memo.get("tags") or {}
    if tags.get("sensitive"):
        raise HTTPException(403, "This memory is private, so it can't become a storybook.")
    if not memo.get("transcript"):
        raise HTTPException(400, "This memory hasn't been transcribed yet.")
    if tags.get("storybook") and not regenerate:
        return tags["storybook"]

    stage = None
    if memo.get("stage_id") is not None:
        found = sb.table("life_stages").select("*").eq("id", memo["stage_id"]).execute().data
        stage = found[0] if found else None

    book = ai.write_storybook(memo, stage, get_people())
    sb.table("memos").update({"tags": {**tags, "storybook": book}}).eq("id", memo_id).execute()
    return book


# ---------- Chapters ----------

@router.post("/chapters/generate")
def post_generate_chapter(stage_id: int):
    return generate_chapter(stage_id)


@router.patch("/chapters/{chapter_id}")
def update_chapter(chapter_id: int, update: ChapterUpdate):
    changes = update.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update")
    rows = sb.table("chapters").update(changes).eq("id", chapter_id).execute().data
    if not rows:
        raise HTTPException(404, "Chapter not found")
    return rows[0]


@router.get("/chapters")
def list_chapters(status: ChapterStatus | None = None, stage_id: int | None = None):
    query = sb.table("chapters").select("*").order("id")
    if status:
        query = query.eq("status", status)
    if stage_id is not None:
        query = query.eq("stage_id", stage_id)
    return query.execute().data


app.include_router(router)
