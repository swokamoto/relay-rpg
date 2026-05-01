# 🎲 Play-by-Post RPG Rules
Welcome to a collaborative, narrative-driven RPG played entirely through Discord. This is a shared storytelling experience where players build scenes together through actions, consequences, and creativity.

---

## 🚀 Getting Started: Example Settings

Not sure where to begin? Here are a few worlds you might step into:


Maybe you’re huddled around a sputtering campfire, deep in a wilderness that seems to shift when you’re not looking. The rain won’t let up, and something out there is watching. What do you do to keep hope alive—and what secret about this place does each of you sense?

Or picture your crew’s battered ship limping into a harbor where the locals trade rumors for coconuts and every alley promises a new adventure. Who’s the first to chase a wild lead, and what trouble do you drag the rest of the crew into?

Or maybe you’re all packed into a van, headlights cutting through the mist as you roll into a town with more legends than streetlights. What’s the weirdest clue you’ve brought, and who’s the first to spot something that shouldn’t be there?

Let these scenes spark your own. Twist them, blend them, or invent something new together. The best stories start with a single spark and grow with every player’s voice.

---

## 🧭 Game Structure
Each story is divided into:

**Act I** → **Act II** → **Act III** → **Climax**

Each Act represents a scene or phase of the story.

---

## 🎯 Act Resolution
Each Act ends when one of the following occurs:

✅ **3 Successes** → The party overcomes the challenge  
❌ **3 Failures** → The situation worsens or shifts dramatically

---

## 🌉 **Act Transitions** *(The Bridge Between Scenes)*

When an Act reaches 3 successes or failures, the **completing player** (who rolled the final success/failure) must provide a **scene transition** using the `/transition` command.

### The Transition Formula:
**"[How the result plays out], but [complication], therefore [next scene setup]"**

### Examples:

**Success Transition:**
> "We escape the castle successfully, but the alarm brings reinforcements, therefore we must now outrun pursuing guards through the forest."

**Failure Transition:**  
> "The negotiation fails catastrophically, but we learn the duke's secret weakness, therefore we must now find another way to reach him."

### Enhanced Act Transitions:
- **Act I → II:** *"The initial challenge leads to greater complications..."*
- **Act II → III:** *"The situation escalates as the true scope of the story becomes clear..."*  
- **Act III → Climax:** *"The climax approaches! Everything leads to this final confrontation..."*

---

## 🎲 Dice System
All actions are resolved using:

**2d6** (two six-sided dice)

| Roll | Result |
|------|--------|
| 2–5  | ❌ Failure |
| 6–8  | ⚠ Partial Success (with complication) |
| 9–12 | ✅ Success |

---

## 👤 Character Creation
**Before joining any story, you must create a complete character.**

Each player defines **4 Required Elements**:

**📋 Name** – Your character's identity (use `/name "Character Name"`)
**📿 Conviction** – What drives your character (use `/conviction "description"`)
**⚔️ Talent** – What they are skilled at (use `/talent "description"`)
**🎭 Quirk** – A unique or defining trait (use `/quirk "description"`)

These traits can be invoked during play for mechanical advantage.

---

## 🚪 Joining & Leaving Adventures

### Joining Stories
- Browse available stories with `/jobs`
- Click "Join Adventure" button on story posts  
- You can only participate in **one story at a time**
- Complete character required (all 4 traits: name, conviction, talent, quirk)

### Leaving Stories
Use `/leave` to exit your current story:

**📋 Before Story Starts (Job Phase):**
- Simple `/leave` - exits immediately
- Shows how many players remain  
- Warns if story drops below 2 player minimum

**⚔️ During Active Story:**
- Requires confirmation: `/leave confirm:true`
- Shows warning about story disruption
- Displays time since last story activity
- If story drops below 2 players → Adventure automatically ends

**💡 Important Notes:**
- You cannot join another story while already in one
- Consider discussing with your group before leaving active stories
- Stories with insufficient players will be removed from the job board

---

## 💠 Traits (Resources)
- Each trait can be used **once per story**
- When used, it grants **+2 to your roll**
- You must incorporate the trait into your action narratively

**Example:**
> "Drawing on my Conviction: *Protect the innocent*, I step between the monster and the villagers." *(+2 bonus)*

---

## 🌍 Scene Setup
At the start of each Act:

Each player may declare **1 Truth** about the scene

**A Truth is:**
- A detail about the environment
- A fact about the situation  
- Something that becomes canon

**Example:**
> "The bridge is unstable and swaying in the wind."

---

## 🔁 Turn Structure (Core Gameplay)

### Taking a Turn:
1. **A player declares an action**
   - They describe what their character does, then roll 2d6

2. **Another player may take the lead**
   - They must **interpret the previous result** based on the roll
   - Continue the narrative using:
     - **"...but"** → on Failure or Partial Success
     - **"...and then"** → on Success
   - Describe their own action
   - Roll 2d6
   - They may also choose to use a Trait

### Example Flow:
**Player A:**
> "I charge the gate and try to force it open." *(rolls 7)*

**Player B:**  
> "The gate gives way slightly, **but** the noise alerts nearby guards. I slip inside and look for a way to disable the alarm." *(rolls 10)*

**Player C:**
> "You find the mechanism, **and then** I jam it with my dagger before it can trigger."

---

## 🤝 Table Etiquette
- **Build on** what others create — don't override or ignore
- Keep actions **concise and forward-moving**
- **Embrace complications** — they make the story better
- **Share the spotlight**

---

## ☠️ Player Death & Rerolling


Character death is never a mechanical consequence and cannot be caused by another player. If you wish for your character to die, you may choose this as part of your epilogue at the end of the story.

If you choose character death in your epilogue:
- Treat it as a major story moment—describe how it happens and its impact on the story.
- Your character's fate will be included in the final Story Chronicle.

Otherwise, all characters survive the story, regardless of outcome.

---

## 🔥 The Finale
After Act III, the story enters the **Finale**.

- The participants begin with **Failure Points** equal to the number of failed Acts
- Players may still use any remaining Traits
- This is the **final resolution** of the story
- **No transition required** – goes directly to story completion

---

## 🏁 Ending the Story

### After the Finale completes:

**The Host will:**
- Describe the final outcome using `/finale "outcome description"`

**Each player will:**
Post one of the following using `/epilogue`:

📖 **Character Growth** - How did your character change or what did they learn?  
🧵 **Unresolved Thread** - What question or mystery remains from this story?  
🔮 **Future Hook** - What new story idea does this inspire?

**Story Chronicle:**
Once all epilogues are submitted, the complete story (finale + all epilogues) will be posted together as a **Story Chronicle** to the community.

---

## 🌌 Final Notes
This game is about:
- **collaboration**
- **creativity** 
- **momentum**

There are no "wrong" moves — only interesting consequences.

**Play boldly, build together, and let the story surprise you.**

---

## 🎮 Discord Commands Quick Reference

**Character Creation (Required First):**
- `/name "Character Name"` - Set your character's name
- `/conviction "description"` - Define your driving motivation
- `/talent "description"` - Define your signature ability  
- `/quirk "description"` - Define your personality trait

**Job Board:**
- `/post "story description"` - Create a new story for others to join
- `/jobs` - View available stories to join
- `/leave` - Leave your current job or adventure

**Core Gameplay:**
- `/turn "narrative"` - Take a narrative turn with optional trait
- `/transition "statement"` - Bridge scenes when Act completes (Acts I-III)
- `/truth "scene detail"` - Declare a truth about the current scene
- `/roll` - Roll dice with optional trait bonus

**Story Management:**
- `/begin "scene description"` - (Host) Start the story with opening scene
- `/status` - Check story progress and character sheets

**Story Completion:**
- `/finale "outcome"` - (Host) Describe final story outcome
- `/epilogue` - Share your character's final reflection