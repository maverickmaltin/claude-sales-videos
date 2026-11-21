---
name: sales-videos
description: Turns a product page or product photos into short animated vertical sales videos (1080x1920 MP4), each answering one question a customer asks before buying, with a voiceover, animated scenes and captions, plus a tracking link per video. Use when asked to check this AI Video Editor's setup, find customer questions, plan or build sales reels, or render the rest.
license: MIT
---

# AI Video Editor: your product, 10 animated sales videos

This folder is a small video studio. You (Claude) write each video as a short JSON spec, `render.js` animates it with
`scenes.js` in a headless browser, adds the voiceover and captions, and saves an MP4 with ffmpeg. Nothing is filmed.

| File | What it is |
|---|---|
| `SKILL.md` | This file: the steps and the spec format |
| `workflow.md` | How to pick the questions, write a 20-second reel that sells, and track which ones work. Read it before planning |
| `scenes.js` | The animated scene types (hook, answer, points, stat, quote, compare, cta, custom) |
| `render.js` | Renders a spec to MP4: `node render.js --check`, `node render.js reels/reel-01.json`, `--sheet`, `--all` |

The user is usually not technical. Talk plainly, do the work for them, and ask only what you can't find out yourself.
Everything goes in this folder: `photos/` (product photos), `reels/` (the plan and one spec per reel), `out/` (videos).

## 0. Check the setup

When the user asks you to check the setup (or before the first render), run:

```bash
node render.js --check
```

- `"ready": true` means go. Tell the user in one or two lines what's set up.
- Anything under `"fix"` is a one-time install. Explain each in plain words, ask, then run it for them:
  - **Node.js missing or too old** (`node` not found): on a Mac with Homebrew, `brew install node`; otherwise the user
    installs the LTS version from https://nodejs.org (it asks for their computer password, so they click through it),
    then reopens the Claude app.
  - **Playwright** (records the animation): `npm install playwright-core` in this folder. If there's no Google Chrome or
    Edge: `npx playwright-core install chromium` (about 150 MB).
  - **ffmpeg** (saves the MP4): `brew install ffmpeg` on a Mac with Homebrew, or `npm install ffmpeg-static` anywhere.
- **The voice** needs nothing: it uses the computer's built-in voice. For a much more natural voice the user can add an
  ElevenLabs key: they sign up at elevenlabs.io, find **API Keys** in their account (under Developers), create a key
  with text to speech access, and paste it into a file named `.env` in this folder as `ELEVENLABS_API_KEY=their-key`.
  ElevenLabs' free plan doesn't include a commercial license, so for videos that sell something they need a paid plan
  (check elevenlabs.io/pricing). Offer it, don't push it. Never print the key back, and never put it anywhere else.

Re-run `--check` after installing until it says ready.

## 1. Learn the product

The user gives a product page link, photos, or both.

- **A link:** read the page (fetch it, or use the browser if it blocks you). Note the product name, price, what it does,
  sizes/colors/options, materials or ingredients, shipping, returns, guarantees, real review quotes with their star
  ratings, and the real claims (numbers the page states). Download 3 to 6 good product images into `photos/` (the
  `og:image` and the gallery images; Shopify stores also answer at `<product-url>.json`).
- **Photos:** if they're attached in the chat but not on disk, ask the user to drop them into this folder's `photos/`
  folder (in Finder or File Explorer) and tell you when they're there. Name them simply (`front.jpg`, `in-hand.jpg`).
- Ask once for anything you can't find that the videos need: the website address to send people to (the CTA), and the
  product page link if they only sent photos.

**Only use facts from the page or the user.** Never invent reviews, ratings, numbers, test results, awards or
guarantees. If a question can't be answered from what you have, pick another question or ask the user.

## 2. Plan the reels

Follow `workflow.md`. Find the questions a customer asks before buying (10 unless the user asks for another number),
and save the plan as `reels/plan.md`: for each reel the question, the hook, the answer in one line, the proof, the CTA,
and its tracking link. Show the user the list of questions (short) and go on unless they want changes.

## 3. Write a reel spec

One file per reel: `reels/reel-01.json` ... `reels/reel-10.json`. Paths are relative to the spec file, so photos are
`../photos/front.jpg`.

```json
{
  "question": "Does it really keep ice for 24 hours?",
  "brand": { "name": "Coldspring", "url": "coldspring.co",
             "colors": { "bg": "#0F1D17", "accent": "#B8F2C9", "text": "#FFFFFF", "ink": "#0F1D17" } },
  "link": "https://coldspring.co/products/tumbler?utm_source=instagram&utm_medium=social&utm_campaign=sales-videos&utm_content=reel-01",
  "voice": { "engine": "auto" },
  "scenes": [
    { "type": "hook", "title": "Does it really keep ice for **24 hours?**", "photo": "../photos/front.jpg",
      "voice": "Does this tumbler really keep ice for 24 hours?" },
    { "type": "answer", "title": "Yes. **A full day.**", "sub": "Double-wall vacuum insulation", "stamp": "Still ice",
      "photo": "../photos/in-hand.jpg", "voice": "Yes. Fill it in the morning and there's still ice the next day." },
    { "type": "points", "title": "Why it **stays cold**", "items": ["Double steel walls", "Vacuum seal", "Locking lid"],
      "photo": "../photos/lid.jpg", "voice": "Two steel walls with a vacuum between them, and a lid that locks the cold in." },
    { "type": "cta", "title": "Get yours", "url": "coldspring.co", "button": "Free shipping over $40",
      "photo": "../photos/colors.jpg", "voice": "Grab yours at coldspring.co." }
  ]
}
```

Top level: `brand.name` (small chip at the top; `"chip": false` hides it), `brand.url`, `brand.colors` (take them from
the product page or the photos: `bg` dark background, `accent` one bright brand color, `ink` dark text on the accent),
`voice`, `scenes`. Optional: `captions: false`, `progress: false` (the thin bar at the top), `music` (`"../music.mp3"` or
`{"file": "../music.mp3", "volume": 0.12}`, only music the user owns or has rights to), `font`, `fps` (default 30),
`size` (default `1080x1920`), `captionsTop` (default 1440 px). `question` and `link` are notes for you and the user.

Every scene: `type`, `voice` (what the voiceover says during it; the scene lasts as long as the line, plus a beat),
`photo`, optional `duration` (seconds, overrides the voice length), `transition` (`enter` default, `up`, `left`,
`none`), `captions: false`, `focus` (where to crop the photo, like `"center 30%"`), `fit: "contain"` (show the whole
photo, for cut-outs). `**word**` in any text paints it in the accent color.

| type | Fields | What it shows |
|---|---|---|
| `hook` | `title`, `sticker` (default `?`) | The question slamming in word by word over the product card. Captions are off here (the title says it) |
| `answer` | `title`, `sub`, `stamp` | Big photo, the answer in an accent box, an optional stamp ("STILL ICE") |
| `points` | `title`, `items` (2-4 short lines), `icon` | Reasons popping in one by one, photo in a circle |
| `stat` | `value`, `prefix`, `suffix`, `decimals`, `label`, `source` | A number counting up inside a ring. Only real numbers |
| `quote` | `text`, `author`, `stars` | A real review on a card with stars. Only real reviews, quoted exactly |
| `compare` | `title`, `left {title, items}`, `right {title, items}` | Typical alternative vs this product, row by row. Keep it fair: no named competitors unless the user asks |
| `cta` | `title`, `url`, `button` | Product card, the website in a pill with a moving arrow, one line under it |
| `custom` | `html`, `css`, `background: false` | Your own animated HTML (see below) |

**Custom scenes.** `html` goes inside a full-screen 1080x1920 scene, `css` is added to the page. Animate only with CSS
`@keyframes` and always use fill mode `both` (e.g. `animation: myMove .6s ease-out .4s both`); the delay counts from
the scene's start. `render.js` controls every animation's clock, so `setTimeout`, `requestAnimationFrame` and
transitions won't render. Keep text out of the bottom 380 px (the app's buttons cover it) and away from the captions
line around y 1440.

Length: about 20 seconds is 45 to 55 spoken words over 4 to 6 scenes. `render.js` prints the length; adjust the lines.

## 4. Check it, then render

```bash
node render.js reels/reel-01.json --sheet     # out/reel-01-sheet.png: one frame per scene
```

Open the sheet image and look at it: text readable and inside the frame, nothing covering the product, photo crops
good, the facts right. Fix the spec and check again. Then:

```bash
node render.js reels/reel-01.json             # out/reel-01.mp4, about 30-60 seconds
```

Show the video to the user: give the path and open it for them (`open out/reel-01.mp4` on a Mac,
`start "" out\reel-01.mp4` on Windows). **When they asked for a preview first, stop here** and ask for changes.
Apply their changes to reel 1 and render it again until they're happy, then carry the same style (colors, scene
pattern, voice, pacing) to the others.

`node render.js reels/reel-01.json --still 4.5` saves the single frame at 4.5 s if you need a close look.

## 5. Render the rest

Write the other specs in the approved style, check each with `--sheet`, then:

```bash
node render.js --all                          # renders every reels/*.json without an up-to-date MP4
```

## 6. Deliver

Give the user: the folder `out/` with the 10 MP4s, and a short table of reel, question, and its tracking link (from
`reels/plan.md`). Remind them in one line where the link goes (see `workflow.md`, "Tracking links") and that the
winners are the questions to make more videos about.

## Voices

- `"voice": {"engine": "auto"}` (default): ElevenLabs when `ELEVENLABS_API_KEY` is set, otherwise the computer's
  built-in voice.
- Built-in: `"name"` picks a voice (Mac: `say -v '?'` lists them; Windows: an installed voice name), `"rate"` is words
  per minute (Mac default about 180).
- ElevenLabs: `"engine": "elevenlabs"`, optional `"id"` (a voice ID from their Voices page) and `"model"`. Voice clips
  are cached in `out/.voice/`, so re-rendering costs nothing until a line changes.
- `"engine": "none"` or `--no-voice`: silent, with captions timed to reading speed.
- Write the voice lines the way they should be said. Numbers and websites read fine (`24 hours`, `coldspring.co`).

## No browser here?

If `--check` can't get a browser running (for example in a cloud sandbox), make a page that plays the reel instead:
`node render.js reels/reel-01.json --html` writes `out/reel-01.html`. Tell the user the MP4s need this folder on their
own computer in Claude Code.
