# GPT Image 2 Prompt Gallery

> 2700+ curated prompts for OpenAI's GPT Image 2 model — search, filter, copy.

**[Live Site](https://eazylee.xyz/gpt-image2-gallery/)**

## What is this

A brutalist-style prompt gallery for GPT Image 2. Monospace everything, sharp edges, no fluff. Browse thousands of hand-curated prompts, filter by category, search in English or Chinese, copy with one click.

## Features

- **2700+ prompts** — curated from [awesome-gptimage2-prompts](https://github.com/gpt-image2/awesome-gptimage2-prompts)
- **Instant search** — real-time filtering across title, summary, and tags
- **Category filter** — pill-based navigation with counts
- **One-click copy** — grab any prompt straight to clipboard
- **Preview images** — every prompt comes with its sample output
- **Auto-synced** — GitHub Action pulls fresh prompts daily at 04:23 UTC
- **Zero dependencies** — pure HTML + CSS + vanilla JS, no build step

## Design

Brutalist aesthetic. Monospace type, `0px` radius, `none` shadows, `2px` solid borders. Inspired by [slock.ai](https://slock.ai). Functional over decorative.

```
--bg:       #F5F0E8   --text:     #1A1A1A
--bg-card:  #FFFDF7   --accent:   #D4503A
--border:   #C8C0B4   --font:     Menlo, Consolas, monospace
```

## Architecture

```
index.html          ← single page, semantic markup
style.css           ← brutalist tokens + responsive grid
app.js              ← virtual scroll, search, filter, modal
prompts.json        ← 2744 templates with preview images
scripts/
  sync-prompts.py   ← upstream fetch + format conversion
.github/workflows/
  sync.yml          ← daily cron job
```

## Data Source

Prompt content sourced from [gpt-image2/awesome-gptimage2-prompts](https://github.com/gpt-image2/awesome-gptimage2-prompts), licensed under CC-BY-4.0.

## Local Development

```bash
# any static server works
python3 -m http.server 8000
# open http://localhost:8000
```

## License

Gallery code: MIT. Prompt content: CC-BY-4.0 (see individual source attribution).
