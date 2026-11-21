# The workflow: 10 questions, 10 reels, keep the winners

A sales video that works answers the one question stopping someone from buying. So instead of one ad, you make ten
short reels, each answering a different question, post them all, and let the clicks tell you which questions matter.

## 1. Find the 10 questions

Think like someone with the product page open and their thumb over "Add to cart". Pull questions from, in this order:
1. The product page itself: FAQ, reviews (especially 3- and 4-star ones), Q&A, the size chart, shipping and returns.
2. What the user tells you about their customers (DMs, comments, emails).
3. The usual buying worries for this kind of product.

Cover different worries, not ten versions of one. A good spread:

| Worry | Example questions |
|---|---|
| Does it work? | Does it really keep ice for 24 hours? Does it actually get the stain out? |
| Will it work for me? | Will it fit my cupholder? Is it OK for sensitive skin? Which size do I need? |
| Will it last? | What happens if I drop it? Does the color fade in the wash? |
| How do I use it? | Is it dishwasher safe? How long does it take to set up? |
| Is it worth it? | Why is it more than the cheap one? What do I actually get in the box? |
| Is it safe to buy? | What if I don't like it? How fast does it ship? |

Keep each question in the customer's words, short enough to read in two seconds. Only pick questions the page or the
user can actually answer, and where the answer helps the sale. Drop any whose honest answer is "no".

## 2. One reel = one question, about 20 seconds

| Time | Scene | Job |
|---|---|---|
| 0-3 s | `hook` | The question, word for word, over the product. It stops the scroll because the viewer has wondered it too |
| 3-8 s | `answer` | The straight answer first ("Yes. A full day."), then one line of why |
| 8-15 s | `points`, `stat`, `quote` or `compare` | The proof: how it works, a real number, a real review, or how it compares. One or two of these |
| 15-20 s | `cta` | Where to get it: the website, one reason to go now if the page has one (free shipping, a guarantee) |

Rules that make them sell:
- **Answer fast.** The answer lands by second 5. No intro, no logo sting.
- **One idea per scene,** big text, 7 words or fewer on screen at once (captions aside).
- **The product is in every scene.** Use the best photos for the hook and the CTA.
- **Talk like a person.** Short spoken sentences, "you" and "your", 45 to 55 words in total.
- **Real facts only.** Every number, claim and review comes from the page or the user, quoted exactly.
- **Same look across all ten:** brand colors, one voice, the same scene pattern, so they read as a set.
- Vary the proof scene between reels (a stat in one, a review in another), so the feed doesn't look copy-pasted.

## 3. Preview first, then the rest

Build reel 1 completely (voiceover, animated scenes, captions), render it, and show it before anything else. The user's
notes on reel 1 (faster, bigger hook text, another voice, other colors) apply to all ten, so fixing one fixes the set.
Then render the other nine in that exact style.

## 4. Tracking links (one per reel)

Each reel gets its own link to the product, so you can see which question brings the clicks and orders. Add these UTM
tags to the end of the product URL (after a `?`, or after `&` if the URL already has a `?`):

```
?utm_source=instagram&utm_medium=social&utm_campaign=sales-videos&utm_content=reel-01
```

- `utm_source`: where it's posted (`instagram`, `tiktok`, `facebook`, `youtube`). Use a separate link per platform.
- `utm_campaign`: the same for the whole batch (`sales-videos`, or `sales-videos-nov`).
- `utm_content`: the reel number, `reel-01` to `reel-10`. This is the one that tells the reels apart.

Write the full link for each reel into `reels/plan.md` and the spec's `"link"`. Show the clean domain in the video
itself (`coldspring.co`); the tracking link goes where people actually click:
- **Instagram:** links in captions don't click, so put the reel's link in the bio link (or a link-in-bio page with one
  button per reel), a story link sticker when you share the reel, or the auto-DM people get when they comment.
- **TikTok:** the bio link, or a product link if the account has TikTok Shop.
- **Facebook:** the caption (links are clickable there).
- **Ads:** each ad's website URL.

Reading the results: Shopify shows UTM visits and orders in **Analytics > Reports** (search for "UTM"); Google
Analytics shows them as the campaign and content in **Reports > Acquisition > Traffic acquisition**. Most other
store builders have a "traffic source" or "UTM" report. Compare reels by orders (or clicks if orders are few), not
views.

## 5. Make more of what works

After a week or two, take the 2 or 3 reels with the most clicks and orders and make new versions around those exact
questions: a new hook wording, another proof (a review instead of a stat), a different first photo. Retire the ones
that got nothing. Keep each batch's links (`utm_campaign`) separate so the numbers stay clean.

## reels/plan.md format

```markdown
# Sales reels: [Product name]
Product page: [URL]   Website shown in the videos: [domain]

| # | Question (hook) | Answer | Proof | Tracking link |
|---|---|---|---|---|
| 01 | Does it really keep ice for 24 hours? | Yes, a full day | stat: 24 h (from the page) | https://...&utm_content=reel-01 |
```
