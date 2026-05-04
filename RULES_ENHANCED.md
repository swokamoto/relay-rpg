# 🎭 Relay RPG — Rules & Player's Guide
*Collaborative storytelling, play-by-post, driven by dice*

---

## What Kind of Game Is This?

Relay RPG is a **play-by-post storytelling game**. You're not trying to win — you're trying to tell a story worth reading. The dice create stakes, not outcomes. What the dice give you is a *constraint*, and constraints are what make stories interesting.

Think of it less like a board game and more like **collaborative improv with consequences**.

---

## 🚀 Example Settings

Not sure where to begin? Here are a few worlds you might step into:

Maybe you're huddled around a sputtering campfire, deep in a wilderness that seems to shift when you're not looking. The rain won't let up, and something out there is watching. What do you do to keep hope alive — and what secret about this place does each of you sense?

Or picture your crew's battered ship limping into a harbor where the locals trade rumors for coconuts and every alley promises a new adventure. Who's the first to chase a wild lead, and what trouble do you drag the rest of the crew into?

Or maybe you're all packed into a van, headlights cutting through the mist as you roll into a town with more legends than streetlights. What's the weirdest clue you've brought, and who's the first to spot something that shouldn't be there?

Let these scenes spark your own. Twist them, blend them, or invent something new together.

---

## 🧭 Game Structure

Each story is divided into four Acts:

**Act I** → **Act II** → **Act III** → **Climax**

Each Act ends when one of the following occurs:

✅ **3 Successes** → The party overcomes the challenge  
❌ **3 Failures** → The situation worsens or shifts dramatically

---

## 👤 Character Creation

**Before joining any story, you must create a complete character.**

Each player defines **4 Required Elements**:

- **📋 Name** – Your character's identity (`/name "Character Name"`)
- **📿 Conviction** – What drives your character (`/conviction "description"`)
- **⚔️ Talent** – What they are skilled at (`/talent "description"`)
- **🎭 Quirk** – A unique or defining trait (`/quirk "description"`)

These traits can be invoked during play for mechanical advantage. The richest play happens when all three non-name traits are in *tension* with each other.

> A character with **Conviction:** *"Never leave anyone behind"*, **Talent:** *"Infiltration and stealth"*, and **Quirk:** *"Terrible at lying"* will face genuinely interesting decisions. Their stealth training says *slip away*, their conviction says *go back*, and their honesty will make any cover story a disaster.

**Ask yourself before each turn:** *What does my character actually want here, and what are they afraid of?*

---

## 🚪 Joining & Leaving

### Joining
- Browse available stories with `/hooks`
- Click "Join Adventure" on a story post
- You can only participate in **one story at a time**
- A complete character (all 4 traits) is required

### Leaving
Use `/leave` to exit your current story:

**Before the story starts:** Simple `/leave` — exits immediately.

**During an active story:** Requires `/leave confirm:true`. If your departure drops the group below 2 players, the story ends automatically.

> Consider talking to your group before leaving an active story.

---

## 🎲 Dice System

All actions are resolved with **2d6**.

| Roll | Result |
|------|--------|
| 2–3  | 💥 Critical Failure — +2 failures, something goes badly wrong |
| 4–5  | ❌ Failure — +1 failure, things get worse |
| 6–8  | 🤔 Partial — tension builds (see below) |
| 9–10 | ✅ Success — +1 success |
| 11–12 | ⭐ Critical Success — +2 successes, something goes spectacularly right |

### Reading the Dice as a Storyteller

**⭐ Critical Success (11–12)**  
Something went *spectacularly* right. Don't just succeed — exceed. Open a door no one expected.
> *"Not only does the mechanism click open — you find a hidden compartment inside it with a message addressed to one of you."*

**✅ Success (9–10)**  
Clean forward motion. Carry momentum — hand the scene something to work with.
> *"The signal goes through. Someone picks up."*

**🤔 Partial (6–8)**  
Something worked, but with a cost, complication, or uncomfortable truth. The best partials introduce a new problem that's different from the old one, and put the next player in an interesting position.
> *"The door opens — but not before the chain snaps and the noise echoes down the hall."*

**❌ Failure (4–5)**  
Don't just say "it didn't work." Show what that failure *means*. Failures push the story sideways.
> *"The guard recognizes you. He's not raising the alarm yet — but his hand is on the radio."*

**💥 Critical Failure (2–3)**  
Things got worse in a way that stings. But even a critical failure is a story gift — the best moments come from things going spectacularly wrong.
> *"The device overloads and sends a feedback pulse through every system in the building. Lights die. Alarms wake."*

> **The partial is the most common result statistically.** Learning to write *interesting complications* is more valuable than learning to write victories.

---

## ⚠️ Tension — The Partial Spiral

Each consecutive partial adds a 🔥 to the tension bar (shown with your roll result).

**3 consecutive partials = automatic failure** — the situation breaks against you.

Any success, failure, or crit resets the tension bar to zero.

This isn't a punishment — it's a pacing mechanism. If your table keeps landing partials, the story is building toward something. Your narration should reflect that things feel increasingly precarious.

> 🔥 Tension 1/3: *"You almost have it..."*  
> 🔥🔥 Tension 2/3: *"Your hands are shaking. Something feels wrong."*  
> 💢 Tension Breaks: *"That's when everything slips."*

---

## 🔁 Turn Structure

A turn has three parts — all written together as your `/turn` description:

**1. Interpret the previous roll**  
Open by acknowledging what the last result meant for the scene. Don't skip this — it's the connective tissue of the story.

**2. Narrate your character's action**  
Describe what your character does in response. Be specific. End on something with genuine stakes — a moment where success and failure would each pull the story somewhere different.  
**Your action must carry genuine risk** — if success and failure would both lead to the same place, it's not a real action.

**3. Roll**  
`/turn` sends your narration and rolls the dice. The result shapes what the next player inherits.

### Full Example

*Scene: Breaking into a guarded facility. Previous player rolled a **7 (Partial)**.*

> **Player B types into `/turn`:**
>
> *"The window catch gives — but the frame scrapes loud against the sill. Somewhere below, a guard stops walking. I freeze, pressed flat against the wall, watching the beam of his flashlight sweep closer. I have maybe three seconds to get through and pull the frame shut before the light finds me."*
>
> → rolls **9 (Success)**

Player B did three things: acknowledged the partial (the noise), put themselves in a tense situation, and ended on a clear action with stakes. Player C opens their turn by writing what that success *looks like*, then declares their own action and rolls.

### The "Yes, And" → "Yes, But" Spectrum

| Roll | Connector | What it means |
|------|-----------|---------------|
| ⭐ Critical Success | "Yes, and then some—" | Worked brilliantly AND opened a new door |
| ✅ Success | "And then—" | Build forward, add something |
| 🤔 Partial | "...but—" | Sort of worked, with a cost or complication |
| ❌ Failure | "No, and—" | Didn't work, AND now something is worse |
| 💥 Critical Failure | "No, and it gets much worse—" | A genuine escalation |

---

## 🌉 Act Transitions

When an Act ends, the **completing player** (who rolled the final success/failure) writes the transition to the next scene using `/transition`.

### The Formula: **"[Result], but [complication], therefore [next setup]"**

The words **but** and **therefore** create *causality* — each scene feels like it grows from the last.

**Success transition:**
> *"We escape the castle successfully, but the alarm brings reinforcements, therefore we must now outrun pursuing guards through the forest."*

**Failure transition:**
> *"The negotiation fails catastrophically, but we learn the duke's secret weakness, therefore we must now find another way to reach him."*

A **success transition** shouldn't feel like the story is over — victories come with complications. What did winning *cost*?  
A **failure transition** shouldn't feel like a dead end — what did going wrong *reveal*, and how does that change the next move?

> The best transitions make the next scene feel *inevitable* given what just happened.

---

## 🌍 Scene Truths

At the start of each Act, every player may declare **1 Truth** about the scene. Truths become canon instantly.

**Good truths do two things at once:**
- Establish something useful or interesting about the environment
- Subtly set up something for later

> *"The station has been abandoned for at least a decade — the emergency lights are running on backup power and they're almost out."*  
> (Sets atmosphere AND creates a ticking clock)

Truths can be physical details, facts about the situation, things your character knows, or emotional dynamics in the room. You're not saying what your character *does* — you're saying what *is*.

---

## 💠 Traits — Using Them Well

Each trait can be used **once per story** for a **+2 to your roll** — once spent, they're gone until the next story. You must incorporate the trait into your action narratively.

The +2 shifts your odds meaningfully. But traits have a second function: they're **narrative declarations**. When you invoke a trait, you're saying *this moment is important enough to define my character by.*

**Good times to use a trait:**
1. When failure would end something important — a scene at 2 failures, a critical moment
2. When you want a moment to land — the climax of an arc you've been building
3. When the trait fits the fiction perfectly and it would feel wrong *not* to use it

**Hold off when:**
1. It's the first roll of the game (you haven't earned the dramatic weight yet)
2. A partial is honestly fine — complications drive good stories
3. When someone else's trait use would tell the better story right now

> **💡 Tip:** Even a +2 only shifts the odds. Save traits for moments that matter.

---

## 🎬 The Host's Role

If you're the **Host** (the player who created the story with `/post`):

- You start the story with `/begin` — make the opening atmospheric and *immediate*. Start in the middle of something happening, not before it.
- You write the finale with `/finale` — honor what the dice and players built. Don't override the story they made; reflect it back with weight.
- During play, you're a participant like everyone else — but you hold the connective tissue of the world.
- You can `/invite` other players mid-story, and `/remove` someone if needed.

**A good opening answers three questions:**
1. Where are we?
2. What is happening right now?
3. What decision do the players face immediately?

---

## 🔥 The Finale

After Act III, the story enters the **Climax**.

- Participants begin with **failure points equal to the number of failed Acts**
- Players may still use any remaining traits
- This is the final resolution of the story — no transition required

---

## 📜 Epilogues & Chronicle

After the finale, everyone posts an epilogue. Pick whichever type feels true:

**📖 Character Growth** — What changed for them? What did they learn or lose or become?  
**🧵 Unresolved Thread** — What question does this story leave unanswered?  
**🔮 Future Hook** — What seed did this story plant? What might grow from it?

> A good epilogue doesn't summarize what happened — it reveals what it *meant*.

Once all epilogues are submitted, the complete story (finale + all epilogues) is posted as a **Story Chronicle** to the community.

---

## ☠️ Death & Rerolling

Character death is never a mechanical consequence and cannot be caused by another player. If you wish for your character to die, you may choose this in your epilogue — treat it as a major story moment. Otherwise, all characters survive regardless of outcome.

---

## 🤝 Table Etiquette

- **Build on** what others create — don't override or ignore
- Keep actions **concise and forward-moving**
- **Embrace complications** — they make the story better
- **Share the spotlight**

---

## 📊 Quick Mechanics Reference

| Mechanic | Detail |
|----------|--------|
| Dice | 2d6 |
| Critical Failure | ≤3 → +2 failures |
| Failure | 4–5 → +1 failure |
| Partial | 6–8 → builds tension (no direct effect) |
| Success | 9–10 → +1 success |
| Critical Success | ≥11 → +2 successes |
| Scene ends | 3 successes or 3 failures |
| Tension | 3 consecutive partials = auto failure |
| Traits | +2 bonus, each used once per story |
| Acts | 4 total (Act I, II, III, Climax) |

---

## ❌ Common Mistakes

**❌ Writing a turn that ignores the previous result**  
✅ Start your turn by acknowledging or building on what just happened

**❌ Ending your turn with a safe action where success and failure feel identical**  
✅ End with something that has genuine risk — where both outcomes would change the story differently

**❌ Using a trait on the first roll "just in case"**  
✅ Wait for a moment that genuinely calls for it

**❌ Transition: "We succeeded. We go to the next place."**  
✅ Transition: "We succeeded, *but* it cost us X, *therefore* now we face Y"

**❌ Truth: "There's a sword on the table."** (No story function)  
✅ Truth: "The sword on the table has a name carved into the blade — someone's name you recognize."

**❌ Starting your turn by saying "You fail, nothing happens"**  
✅ Building on the failure — what did it cost, reveal, or set in motion?

**❌ Playing a character who is good at everything**  
✅ Playing a character whose strengths and flaws pull in different directions

---

*The best play-by-post games feel like reading a novel that no one planned but everyone made together. Bring your curiosity, build on what's there, and trust the dice to make it interesting.*
