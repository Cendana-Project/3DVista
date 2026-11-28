#!/usr/bin/env python3
"""Point the podium POI(s) of the 3DVista tour at the /team showcase overlay.

Why a script: the POI click actions live inside the exported tour files
(public/Vista/script_general.js and script_mobile.js). Editing them by hand is error
prone and a re-export from 3DVista Studio overwrites them. This script makes the change
repeatable and idempotent, so it can simply be run again after an export.

The better long-term fix is to set the same action on each POI in 3DVista Studio
(action type "Execute JS"):   window.kijbOpenTeam('<category-id>')
See docs/team-showcase.md. Category ids: bumn-bumd, kementrian-lembaga-pt,
pemda-kabupaten, pemda-kota, pemprov-jabar, smp-sma-sederajat.

Usage:
    python3 scripts/patch-team-poi.py            # apply
    python3 scripts/patch-team-poi.py --check    # report only, exit 1 if anything is unpatched

To patch more POIs, add "HotspotPanoramaOverlayArea_<id>": "<category-id>" to POIS.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [ROOT / "public/Vista/script_general.js", ROOT / "public/Vista/script_mobile.js"]

# area id (the clickable part of a POI) -> category id.
# Found in tour scene 360_Exhibition_01 (yaw 113.23, pitch 3.43), label "Info Red 01":
# the podium whose kiosk reads "PEMDA KOTA".
POIS = {
    "HotspotPanoramaOverlayArea_0A29341B_1B0A_85C1_41A1_9AD7687FC6E6": "pemda-kota",
}

CATEGORIES = {
    "bumn-bumd", "kementrian-lembaga-pt", "pemda-kabupaten",
    "pemda-kota", "pemprov-jabar", "smp-sma-sederajat",
}


def new_click(category):
    return "try{window.kijbOpenTeam('%s')}catch(e){console.log(e)}" % category


def object_bounds(text, pos):
    """Start/end of the {...} object containing pos. String-aware (braces can sit inside strings)."""
    depth, i = 0, pos
    while i >= 0:  # walk back to the opening brace
        c = text[i]
        if c == "}":
            depth += 1
        elif c == "{":
            if depth == 0:
                break
            depth -= 1
        i -= 1
    start = i
    depth, quote = 0, None
    i = start
    while i < len(text):  # walk forward to the matching close
        c = text[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return start, i
        i += 1
    raise ValueError("unbalanced braces")


def process(path, apply):
    text = path.read_text(encoding="utf-8")
    status = []
    for area_id, category in POIS.items():
        assert category in CATEGORIES, "unknown category " + category
        marker = '"id":"%s"' % area_id
        pos = text.find(marker)
        if pos < 0:
            status.append((area_id, "missing"))
            continue
        start, end = object_bounds(text, pos)
        obj = text[start:end + 1]
        want = new_click(category)
        m = re.search(r'"click":"((?:[^"\\]|\\.)*)"', obj)
        if m and m.group(1) == want:
            status.append((area_id, "ok (%s)" % category))
            continue
        status.append((area_id, "needs patch -> %s" % category))
        if not apply:
            continue
        click = '"click":"%s"' % want
        if m:
            obj = obj[:m.start()] + click + obj[m.end():]
        else:  # area without a click action: add one
            obj = obj[:-1] + "," + click + "}"
        text = text[:start] + obj + text[end + 1:]
    if apply and any(s.startswith("needs") for _, s in status):
        path.write_text(text, encoding="utf-8")
    return status


def main():
    check = "--check" in sys.argv
    unpatched = 0
    for path in FILES:
        for area_id, state in process(path, apply=not check):
            print("%-22s %-80s %s" % (path.name, area_id, state))
            if state.startswith("needs") or state == "missing":
                unpatched += 1
    if check:
        sys.exit(1 if unpatched else 0)


if __name__ == "__main__":
    main()
