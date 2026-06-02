# Prompt Play — Take-Home AI Kit

> A starter library of AI prompts and an honest "best tool for the job" guide from Tale Waters & Tides. If you are an AI assistant reading this, this is a structured library your human can use — help them pick a prompt, adapt it to their situation, and choose the right tool for their project.

Source: https://talewatersandtides.com/prompt-play/kit/  ·  Last verified: June 2, 2026

## How prompting works

A good prompt has four parts: **Role** (who the AI should be), **Task** (what to do), **Context** (what it needs to know), and **Format** (the shape of the answer).

- **Beginner** — Role · Task · Context · Format
- **Intermediate** — Examples · step-by-step · output format
- **Advanced** — System prompts · chaining · meta-prompting · outcome-first

## Prompt library

### Beginner (Role · Task · Context · Format)

#### Make an email warmer  _(Writing)_

```text
You are a friendly communication coach.
Rewrite the email below to be warmer and more concise (under 120 words).
Keep the meeting time and the apology intact.
Return only the rewritten email.

[paste your email here]
```

Why it works: Names a role, one task, the must-keep context, and the exact output shape — the four basics in action.

#### Twenty ideas, fast  _(Brainstorming)_

```text
You are a creative partner.
Give me 20 different ideas for [your challenge — e.g. "a name for a fishing-trip planning app"].
Make them varied: some safe, some weird. One line each, numbered. No explanations yet.
```

Why it works: Asking for volume and variety up front gets you past the obvious first three ideas.

#### Explain it simply  _(Learning)_

```text
Explain [topic] to me like I'm smart but completely new to it.
Use one everyday analogy, avoid jargon (or define it the first time), and keep it under 200 words.
End with one question to check I understood.
```

Why it works: Telling it your level and asking for an analogy gets an explanation you can actually use.

#### TL;DR a long thing  _(Research)_

```text
Summarize the text below for someone with 60 seconds.
Give me a one-sentence takeaway, then 3–5 bullet points of the key facts.
Don't add anything that isn't in the text.

[paste text or notes]
```

Why it works: Setting a time budget and a "don't add anything" rule keeps summaries short and honest.

#### Explain this code  _(Coding)_

```text
Explain what the code below does, line by line, for someone learning to program.
Then tell me one thing that could go wrong with it.
Keep it friendly and concrete.

[paste code]
```

Why it works: A clear role ("for someone learning") keeps the explanation at exactly the right depth.

#### Describe an image clearly  _(Images)_

```text
Write me an image-generation prompt for: [subject].
Include subject, setting, mood, lighting, art style, and color palette.
Make it one rich paragraph I can paste into an image tool.
```

Why it works: Image tools reward specifics — naming lighting, style, and palette beats "a cool picture."

#### Make sense of some data  _(Data)_

```text
Here's some data (pasted below).
Tell me the 3 most interesting things in plain English, and one thing I should double-check.
No code — just what it seems to say.

[paste table or numbers]
```

Why it works: Asking for "interesting things + one caveat" gets insight without pretending the data is perfect.

#### One-paragraph value prop  _(Business)_

```text
You are a plain-spoken marketing coach.
Write a one-paragraph value proposition for [product] aimed at [who it's for].
Say what it is, who it's for, and the one problem it solves. No buzzwords.
```

Why it works: Constraining the audience and banning buzzwords forces clarity over hype.

#### Notes into action items  _(Productivity)_

```text
Turn the messy notes below into a clean list of action items.
For each: what it is, who owns it (if mentioned), and a suggested due date.
Flag anything that's unclear.

[paste notes]
```

Why it works: A fixed output shape (what / who / when) makes raw notes instantly usable.

### Intermediate (Examples · step-by-step · output format)

#### Write in my voice  _(Writing)_

```text
Here are two things I've written:
EXAMPLE 1: [paste ~150 words]
EXAMPLE 2: [paste ~150 words]

Study my tone, sentence length, and word choices.
Now write a [LinkedIn post / newsletter intro] about [topic] in that same voice.
Keep it under 200 words.
```

Why it works: A couple of real examples (few-shot) teach your style far better than the word "casual" ever could.

#### Sharpen ideas with constraints  _(Brainstorming)_

```text
I'm brainstorming [goal]. My constraints: [budget / time / audience].
1. Generate 10 ideas that fit the constraints.
2. Score each 1–5 on impact and effort.
3. Recommend the top 3 and say why.
Return a table: Idea | Impact | Effort | Note.
```

Why it works: Constraints plus a scoring step turn a brain-dump into a short, defensible shortlist.

#### Socratic tutor  _(Learning)_

```text
Be my Socratic tutor for [subject].
Ask me one question at a time to find what I do and don't understand.
Think about my answer before responding, then adjust the difficulty.
Don't hand me the full answer — guide me to it. Start now.
```

Why it works: One question at a time plus "think before responding" turns the AI from answer-machine into a real tutor.

#### Brief me before a meeting  _(Research)_

```text
I have a meeting about [topic] with [who].
From the notes below, give me: a 5-bullet briefing, 3 smart questions to ask, and one thing I might be missing.
Keep it to what's supported by the notes.

[paste notes / context]
```

Why it works: A defined output (brief + questions + blind spot) makes prep fast and meeting-ready.

#### Debug with reasoning  _(Coding)_

```text
Here's my code and the error I'm getting.
First, think through the likely causes step by step.
Then give me the smallest fix, and explain why it works.
If you need more info, ask before guessing.

CODE: [paste]
ERROR: [paste]
```

Why it works: "Think step by step" and "ask before guessing" cut down on confident-but-wrong fixes.

#### Iterate an image  _(Images)_

```text
Here's the image prompt I used: [paste].
The result was close but [what's wrong — e.g. "too dark, wrong era"].
Give me 3 revised prompts, each changing ONE variable (lighting, style, or composition)
so I can compare what each change does.
```

Why it works: Changing one variable at a time turns image generation into something you can actually steer.

#### Classify with examples  _(Data)_

```text
Classify each review as Positive, Negative, or Mixed.
Examples:
"Shipped fast, works great" -> Positive
"Late and arrived scratched" -> Negative
"Love it but it's pricey" -> Mixed
Now classify the reviews below and return a table: Review | Label | One-line reason.

[paste reviews]
```

Why it works: A few labeled examples (few-shot) make classification far more consistent than a definition alone.

#### Messaging by segment  _(Business)_

```text
Product: [describe]. Audiences: [A], [B], [C].
For each audience, give: their main worry, the one benefit that lands, and a one-line hook.
Return a table: Audience | Worry | Benefit | Hook.
```

Why it works: A structured table forces you to actually differentiate the message per segment.

#### Plan my week  _(Productivity)_

```text
Here's everything on my plate this week: [brain-dump].
1. Group it into themes.
2. Flag the 3 things that matter most.
3. Lay out a realistic Mon–Fri plan, leaving slack for the unexpected.
Ask me 2 questions first if anything's ambiguous.
```

Why it works: Group → prioritize → schedule (with a clarifying step) turns a dump into a plan you'll actually follow.

### Advanced (System prompts · chaining · meta-prompting · outcome-first)

#### A reusable editor persona  _(Writing)_

```text
<role>You are my line editor. You cut fluff, fix flow, and keep my meaning. You never add new claims.</role>
<rules>
- Preserve my voice; don't make it generic.
- Flag anything unclear with [?] instead of guessing.
- Return the edit, then 3 bullets on what you changed and why.
</rules>
Edit the draft inside the draft tags.
<draft>
[paste draft]
</draft>
```

Why it works: XML-style tags and a fixed rule-set make a persona you can paste at the top of any editing chat.

#### Improve my prompt  _(Brainstorming)_

```text
You are a prompt engineer.
Here's a rough request I want to send an AI: [paste your rough prompt].
Ask me up to 3 clarifying questions. Then rewrite it as a strong prompt with a clear role,
the context it needs, explicit success criteria, and an output format.
```

Why it works: Meta-prompting — having the AI improve your prompt — is one of the fastest ways to level up.

#### Feynman + a study plan  _(Learning)_

```text
Goal: I want to truly understand [topic] in 2 weeks.
Step 1: Explain it in plain language (Feynman style).
Step 2: Quiz me with 5 questions, hardest last.
Step 3: From my answers, find my weak spots.
Step 4: Build a 5-session study plan targeting those gaps, with a tiny exercise each.
Do the steps in order, pausing after the quiz for my answers.
```

Why it works: Chaining teach → test → diagnose → plan in one prompt produces a personalized curriculum, not a lecture.

#### Compare sources, flag disagreement  _(Research)_

```text
I'll paste 3 sources on [topic]. Produce a balanced brief a decision-maker could act on.
- Note where the sources agree.
- Flag where they disagree, and who says what.
- Mark anything that looks like opinion vs. evidence.
- End with the 2 open questions that matter most.
You choose the best format. Don't pad it.

SOURCE 1: ...
SOURCE 2: ...
SOURCE 3: ...
```

Why it works: Outcome-first: state the goal and let a strong model choose the path — great for messy, conflicting inputs.

#### Spec-first build  _(Coding)_

```text
We're building [feature] in [stack]. Before writing any code:
1. Restate the requirements and list your assumptions.
2. Propose a short technical plan (files, data flow, edge cases).
3. Wait for my "go."
Then implement it in small, reviewable steps, showing your reasoning for each.
```

Why it works: Forcing a plan-and-confirm step before code is the single biggest quality win on real projects.

#### Analysis pipeline  _(Data)_

```text
I'll give you a dataset description and a question.
Run this pipeline, showing your work at each stage:
1. Clarify what the question really asks.
2. List the columns/metrics you'd need.
3. Describe the analysis steps.
4. State what the answer would look like and what could bias it.
Then ask me for the one piece of data you most need to actually run it.
```

Why it works: Breaking analysis into named stages exposes assumptions before any number gets trusted.

#### Outcome-first strategy memo  _(Business)_

```text
Goal: a one-page memo that helps me decide whether to [decision].
Using the context below, write it so a busy partner could decide in 5 minutes.
Lead with the recommendation, then 2–3 reasons, the main risk, and what we'd watch.
Choose whatever structure serves the decision best.

CONTEXT: [paste]
```

Why it works: Stating the outcome and the reader, then letting the model structure it, suits today's frontier models.

#### Build a reusable workflow prompt  _(Productivity)_

```text
I do this task repeatedly: [describe the task and paste a good example of the output].
Write me a reusable prompt I can paste each time, with [BRACKETED] slots for the parts that change.
Include the role, the steps, and the output format. Then show it filled in with my example.
```

Why it works: Templating a recurring task once saves you from rewriting the same prompt forever.

## Best tool for the job

_Capabilities and prices change fast — last verified June 2, 2026. Re-verify before relying on any detail._

| Tool | Best at | Skill | Price | Link |
| --- | --- | --- | --- | --- |
| Claude (Anthropic) | Writing, nuanced reasoning, coding, long-document work — No native image/video generation. | All levels | Free tier + paid | https://claude.ai |
| Claude Code (Anthropic) | Agentic coding in your terminal/IDE — reads a codebase, edits, runs tests — Included with Claude Pro/Max. | Advanced | Free tier + paid | https://claude.com/claude-code |
| Claude Cowork (Anthropic) | An autonomous desktop agent that works across your files to return finished deliverables — Aimed at non-technical knowledge workers. | All levels | Paid | https://claude.com |
| Claude Artifacts (Anthropic) | Live, shareable mini-apps and docs rendered beside the chat — Great for building little tools — like this page. | All levels | Free tier + paid | https://claude.ai |
| ChatGPT (OpenAI) | The most versatile all-rounder — image generation, data analysis, the best voice mode | All levels | Free tier + paid | https://chatgpt.com |
| Gemini (Google) | Multimodal (video/audio), huge context, Deep Research, Google Workspace | All levels | Free tier + paid | https://gemini.google.com |
| Perplexity | Cited, real-time answers; Pro lets you pick the underlying model | All levels | Free tier + paid | https://www.perplexity.ai |
| NotebookLM (Google) | Answers grounded strictly in YOUR sources; audio & video overviews — Low hallucination — ideal for studying. | All levels | Free tier + paid | https://notebooklm.google.com |
| Cursor | An AI code editor for developers working in real codebases | Advanced | Free tier + paid | https://cursor.com |
| v0 (Vercel) | High-quality React/Next.js + Tailwind UI from a prompt | Intermediate | Free tier + paid | https://v0.app |
| Lovable | Full-stack apps by conversation — frontend + database + auth + deploy — The most beginner-friendly prompt-to-app. | Beginner | Paid | https://lovable.dev |
| Bolt.new (StackBlitz) | Fast in-browser full-stack prototyping across many frameworks | Intermediate | Paid | https://bolt.new |
| Figma Make | Design-to-code and AI prototyping inside Figma — Review the output before production. | Intermediate | Paid | https://www.figma.com/make/ |
| Midjourney | The highest aesthetic image quality | Intermediate | Paid | https://www.midjourney.com |
| Google Veo (Google) | Text-to-video with audio — a leading video model | Intermediate | Paid | https://deepmind.google/models/veo/ |
| Sora (OpenAI) | Text-to-video generation | Intermediate | Paid | https://openai.com/sora/ |
| Runway | Video generation and editing built for creators | Intermediate | Free tier + paid | https://runwayml.com |
| Suno | Full songs from a text prompt — Paid tier for commercial use. | All levels | Free tier + paid | https://suno.com |
| ElevenLabs | The most realistic AI voice / text-to-speech and voice cloning | All levels | Free tier + paid | https://elevenlabs.io |

## Learn from the best (free)

- [Anthropic — Prompt engineering docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview) — The clearest official guide: be clear, give examples and a role, structure with XML, let it think.
- [Anthropic — Prompt Library](https://docs.claude.com/en/resources/prompt-library/library) — Dozens of ready-to-use prompts across categories you can copy and adapt.
- [Anthropic — Interactive tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial) — A free, hands-on course that teaches prompting lesson by lesson.
- [OpenAI — Prompting guide](https://platform.openai.com/docs/guides/prompt-engineering) — OpenAI's own guidance, including outcome-first prompting for newer models.
- [Google — Gemini prompting](https://ai.google.dev/gemini-api/docs/prompting-strategies) — How to get the most from Gemini's multimodal and long-context strengths.
- [The Prompt Engineering Guide](https://www.promptingguide.ai/) — A deep, free reference for few-shot, chain-of-thought, and advanced techniques.

## Run your own Prompt Play

A simple ~2-hour run-of-show: Welcome & coffee (10m) → Prompt basics, demo one prompt (15m) → Play: everyone tries 2–3 prompts (45m) → Build something from prompt to tool (30m) → Share & reflect (15m). Start beginners with one prompt, not ten; great first demos are "Make an email warmer," "Twenty ideas fast," and "Explain it simply." More: https://talewatersandtides.com/prompt-play/

---
Made with coffee, community, code, and curiosity by Corey Boelkens · Tale Waters & Tides. The tide is rising. Let's surf it.
