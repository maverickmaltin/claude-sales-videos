# Claude sales videos: your product, 10 animated sales videos

A free AI Video Editor for Claude Code. Give Claude your product page or photos and it finds the 10 questions a customer
asks before buying, then turns each one into a 20-second animated vertical video (1080x1920 MP4) with a voiceover,
animated scenes and captions, plus a tracking link per video. No filming.

## Set it up

1. Install the [Claude desktop app](https://claude.com/download) and open the **Code** tab (Claude Code needs a paid
   Claude plan).
2. Make a folder called **AI Video Editor** on your Desktop and pick it as the folder Claude works in.
3. Paste this and send it:

```
Download the files from https://github.com/maverickmaltin/claude-sales-videos into this folder, read SKILL.md, then check my setup and walk me through anything that's missing.
```

Or download [the ZIP](https://github.com/maverickmaltin/claude-sales-videos/archive/refs/heads/main.zip), unzip it and
use the unzipped folder.

## Make the videos

Put your product photos in the folder's `photos/` folder (or send Claude your product page), then:

```
Find 10 questions a customer would ask before buying this product. Turn each one into a 20-second animated reel with a hook, a clear answer, and a call to visit my website.
```

```
Build the first reel with a voiceover, animated scenes, and captions. Show me a preview before rendering the rest.
```

Give it your changes, then say "Use the same style for the other nine."

## What's inside

| File | What it does |
|---|---|
| `SKILL.md` | The steps Claude follows and the video spec format |
| `workflow.md` | Picking questions, writing a reel that sells, tracking links (UTM) per reel |
| `scenes.js` | The animated scene types (hook, answer, points, stat, quote, compare, cta, custom HTML) |
| `render.js` | Renders a spec to MP4 in a headless browser and encodes it with ffmpeg |
| `CLAUDE.md` | Tells Claude Code to read SKILL.md in this folder |

By hand: `node render.js --check`, `node render.js reels/reel-01.json`, `--sheet` (one frame per scene), `--all`.

Needs Node.js 18+, ffmpeg, and Playwright (`npm install playwright-core`; it uses Google Chrome or Edge, or run
`npx playwright-core install chromium`). Claude installs these for you during the setup check. The voiceover uses your
computer's built-in voice, or [ElevenLabs](https://elevenlabs.io) if you add an `ELEVENLABS_API_KEY` to a `.env` file
here (videos that sell something need a paid ElevenLabs plan for the commercial license).

Only facts from your product page or from you go into the videos: no invented reviews, ratings or numbers.

MIT license.
