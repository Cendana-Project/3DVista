#!/usr/bin/env python3
"""Ensure all 3DVista audio player objects have "loop":true.

Why a script:
3DVista's player defaults audio `loop` to false (`this.get("loop",!1)` in
tdvplayer.js). Whenever the tour is re-published from 3DVista Studio or audio
items are added/edited, `"loop":true` can be dropped or reset. This script makes
enforcing `"loop":true` repeatable and idempotent.

Usage:
    python scripts/patch-audio-loop.py            # apply "loop":true to all audio objects
    python scripts/patch-audio-loop.py --check    # report only, exit 1 if any audio lacks "loop":true
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATE_FILES = [
    ROOT / "public/Vista/script_general.js",
    ROOT / "public/Vista/script_mobile.js",
    ROOT / "script_general.js",
    ROOT / "script_mobile.js",
]

AUDIO_CLASSES = (
    "Audio",
    "MediaAudio",
    "PanoramaAudio",
    "DirectionalPanoramaAudio",
    "PhotoAudio",
    "PhotoAlbumAudio",
)

CLASS_PATTERN = re.compile(
    r'"class"\s*:\s*"(' + "|".join(AUDIO_CLASSES) + r')"'
)
LOOP_PATTERN = re.compile(r'"loop"\s*:\s*(true|false)')


def object_spans(text: str) -> list[tuple[int, int]]:
    """Return (start, end) index pairs for every balanced {...} object.

    Single forward pass that tracks string literals (including backslash
    escapes) and brace depth, so escaped quotes inside `click`/`html` values
    cannot desynchronise the scan.
    """
    spans: list[tuple[int, int]] = []
    stack: list[int] = []
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c == '"':
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == '"':
                    break
                i += 1
            i += 1
            continue
        if c == "{":
            stack.append(i)
        elif c == "}" and stack:
            spans.append((stack.pop(), i))
        i += 1
    return spans


def process(path: Path, apply: bool) -> tuple[int, int, int]:
    """Return (total_audio, already_ok, fixed_or_needed)."""
    with path.open("r", encoding="utf-8", newline="") as fh:
        text = fh.read()

    # Attribute each audio `"class"` to its innermost enclosing object, so an
    # ancestor container that merely holds audio entries is never patched.
    spans = object_spans(text)
    inner_by_pos: dict[int, tuple[int, int]] = {}
    for pos in (m.start() for m in CLASS_PATTERN.finditer(text)):
        enclosing = [
            (start, end)
            for start, end in spans
            if start < pos < end
        ]
        if not enclosing:
            continue
        inner_by_pos[pos] = min(enclosing, key=lambda s: s[1] - s[0])

    audio_spans = sorted(set(inner_by_pos.values()), key=lambda s: s[0])

    already_ok = 0
    needs_fix = 0
    edits: list[tuple[int, int, str]] = []

    for start, end in audio_spans:
        obj = text[start : end + 1]
        loop_match = LOOP_PATTERN.search(obj)
        if loop_match:
            if loop_match.group(1) == "true":
                already_ok += 1
                continue
            new_obj = (
                obj[: loop_match.start()]
                + '"loop":true'
                + obj[loop_match.end() :]
            )
            needs_fix += 1
            edits.append((start, end + 1, new_obj))
        else:
            new_obj = obj[:-1] + ',"loop":true}'
            needs_fix += 1
            edits.append((start, end + 1, new_obj))

    if apply and edits:
        chunks: list[str] = []
        cursor = 0
        for s, e, replacement in edits:
            chunks.append(text[cursor:s])
            chunks.append(replacement)
            cursor = e
        chunks.append(text[cursor:])
        with path.open("w", encoding="utf-8", newline="") as fh:
            fh.write("".join(chunks))

    return len(audio_spans), already_ok, needs_fix


def main() -> None:
    check = "--check" in sys.argv
    pending = 0
    for path in CANDIDATE_FILES:
        if not path.exists():
            continue
        total, ok, changed = process(path, apply=not check)
        rel = path.relative_to(ROOT)
        state = "ok" if changed == 0 else ("needs patch" if check else "patched")
        print(f"{str(rel):32s} total={total:<3d} ok={ok:<3d} {state} ({changed})")
        if check and changed > 0:
            pending += changed
    if check:
        sys.exit(1 if pending else 0)


if __name__ == "__main__":
    main()
