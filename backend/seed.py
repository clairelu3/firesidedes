"""Load demo data into Supabase. Run once before the demo:

    python seed.py

Reads seed_data/life_map.json, seed_data/people.json, and every audio file
in seed_data/memos/. Stages and people are skipped if the tables already have rows.
"""
import json
import mimetypes
from pathlib import Path

from main import Person, Stage, create_memo, get_life_map, get_people, insert_people, insert_stages

SEED = Path(__file__).parent / "seed_data"


def main():
    if get_life_map():
        print("life_stages already has rows, skipping")
    else:
        stages = [Stage(**s) for s in json.loads((SEED / "life_map.json").read_text())]
        print(f"inserted {len(insert_stages(stages))} stages")

    if get_people():
        print("people already has rows, skipping")
    else:
        people = [Person(**p) for p in json.loads((SEED / "people.json").read_text())]
        print(f"inserted {len(insert_people(people))} people")

    for f in sorted((SEED / "memos").iterdir()):
        if f.name.startswith("."):
            continue
        memo = create_memo(f.read_bytes(), f.name, mimetypes.guess_type(f.name)[0])
        print(f"uploaded {f.name} -> stage {memo['stage_id']}")


if __name__ == "__main__":
    main()
