#!/usr/bin/env python3
"""
Sync prompt templates from gpt-image2/awesome-gptimage2-prompts repo.
Designed to run in GitHub Actions on a daily schedule.

Downloads prompts.json from the upstream repo, converts to open-design
compatible format, and writes prompts.json for the gallery site.
"""

import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

UPSTREAM_URL = "https://raw.githubusercontent.com/gpt-image2/awesome-gptimage2-prompts/main/prompts.json"
OUTPUT = Path(__file__).resolve().parent.parent / "prompts.json"

CATEGORY_RULES = [
    (r"profile|avatar|portrait|selfie|headshot", "Profile / Avatar"),
    (r"social.?media|instagram|tiktok|story|post|reel", "Social Media Post"),
    (r"game|gaming|screenshot|hud|rpg|fps|fighting", "Game UI"),
    (r"ui|ux|dashboard|app|landing|saas|website|mockup|interface", "UI / UX"),
    (r"poster|flyer|banner|cover|thumbnail", "Poster"),
    (r"illustration|illustrated|drawing|cartoon|anime|chibi|manga", "Illustration"),
    (r"infographic|diagram|chart|data|stats|timeline", "Infographic"),
    (r"logo|brand|identity|icon", "Logo / Brand"),
    (r"photo|photography|cinematic|film|editorial|35mm|dslr", "Photography"),
    (r"product|packaging|mock.?up|3d.?render", "Product"),
    (r"card|invitation|greeting|wedding|birthday", "Card"),
    (r"sticker|emoji", "Sticker"),
    (r"comic|manga|panel|strip", "Comic"),
    (r"texture|pattern|wallpaper", "Texture / Pattern"),
    (r"character|design|sheet|reference", "Character Design"),
    (r"food|recipe|cook|cuisine|restaurant", "Food"),
    (r"travel|map|city|landmark|architecture", "Travel"),
    (r"fashion|outfit|clothing|style", "Fashion"),
    (r"interior|room|furniture|decor|house", "Interior Design"),
    (r"education|learn|school|tutorial|explain", "Education"),
]

TAG_KEYWORDS = [
    "anime", "cinematic", "3d", "photo", "illustration", "cartoon",
    "minimal", "vintage", "retro", "cyberpunk", "fantasy", "realistic",
    "watercolor", "oil-painting", "pixel-art", "flat-design", "isometric",
    "dark", "neon", "pastel", "monochrome", "vibrant", "elegant",
    "game", "ui", "poster", "portrait", "landscape", "product",
    "food", "fashion", "travel", "architecture", "nature", "tech",
    "japanese", "chinese", "korean", "western", "east-asian",
]


def slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80].rsplit("-", 1)[0] if len(text) > 80 else text


def detect_category(title, desc):
    combined = f"{title} {desc}".lower()
    for pattern, cat in CATEGORY_RULES:
        if re.search(pattern, combined):
            return cat
    return "General"


def extract_tags(title, desc, prompt):
    combined = f"{title} {desc} {prompt}".lower()
    return [kw for kw in TAG_KEYWORDS if kw in combined][:6]


def detect_aspect(prompt):
    m = re.search(r"--ar\s*(\d+:\d+)", prompt)
    if m:
        return m.group(1)
    if re.search(r"vertical|portrait|9:16|4:5", prompt, re.I):
        return "9:16"
    if re.search(r"horizontal|landscape|16:9|widescreen", prompt, re.I):
        return "16:9"
    return "1:1"


def is_image_prompt(item):
    title = item.get("title", "").lower()
    surface = item.get("surface", "").lower()
    if surface and surface != "image":
        return False
    if re.search(r"\bvideo\b|\banimation\b|\bmotion\b", title):
        if not re.search(r"image|photo|poster|still|frame|screenshot", title):
            return False
    return True


def convert(item):
    if not is_image_prompt(item):
        return None
    title = item.get("title", "").strip()
    if not title:
        return None
    desc = item.get("description", "").strip()
    content = item.get("content", "").strip()
    if not content:
        return None

    author_info = item.get("author", {})
    if isinstance(author_info, dict):
        author_name = author_info.get("name", "unknown")
        author_link = author_info.get("link", "")
    else:
        author_name = str(author_info)
        author_link = ""

    slug = slugify(title)
    item_id = item.get("id", "")
    if item_id:
        slug = f"{slug}-{item_id}"

    thumbs = item.get("mediaThumbnails", [])
    media = item.get("media", [])
    refs = item.get("referenceImages", [])
    preview = ""
    if thumbs and isinstance(thumbs, list) and thumbs[0]:
        preview = thumbs[0]
    elif media and isinstance(media, list) and media[0]:
        preview = media[0]
    elif refs and isinstance(refs, list) and refs[0]:
        preview = refs[0]

    return {
        "id": slug,
        "surface": "image",
        "title": title,
        "summary": desc or title,
        "category": detect_category(title, desc),
        "tags": extract_tags(title, desc, content),
        "model": "gpt-image-2",
        "aspect": detect_aspect(content),
        "prompt": content,
        "previewImageUrl": preview,
        "source": {
            "repo": "gpt-image2/awesome-gptimage2-prompts",
            "license": "CC-BY-4.0",
            "author": author_name,
            "url": author_link or item.get("sourceLink", ""),
        },
    }


def main():
    print("Downloading upstream prompts.json...")
    tmp = Path("/tmp/upstream-prompts.json")
    subprocess.run(
        ["curl", "-sL", "-o", str(tmp), "--retry", "3", UPSTREAM_URL],
        check=True, timeout=300,
    )

    with open(tmp) as f:
        data = json.load(f)

    items = data.get("items", [])
    print(f"Upstream: {len(items)} items")

    templates = []
    skipped = 0
    for item in items:
        result = convert(item)
        if result:
            templates.append(result)
        else:
            skipped += 1

    # Sort: by category then title
    templates.sort(key=lambda t: (t["category"], t["title"]))

    output = {"total": len(templates), "templates": templates}
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=None, separators=(",", ":"))

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Written: {len(templates)} templates ({skipped} skipped), {size_kb:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
