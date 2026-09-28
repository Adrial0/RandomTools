# Stickfight

Open `index.html` in a desktop browser. No build step or dependencies. Optional Google Fonts fall back to system fonts offline.

- **A / D:** move left / right
- **W:** jump (release and press again for another jump)
- **S:** crouch
- **Mouse:** aim and swing the sword around your fighter; no click required
- **Esc:** pause / resume
- **R:** retry the current round

Ten rounds introduce greatswords, axes, spears, hammers, quicker duelists, and multiple enemies. Cleared rounds unlock the next round; local browser storage remembers unlocked rounds. Select an unlocked round below the arena to replay it. Health resets each round.

The simulation uses a fixed 120 Hz step. Living fighters use a supported torso, articulated arms and legs, controlled walking, gravity-driven jumps, and damped impact knockback. Landing removes downward velocity without bounce. Defeated fighters use Verlet joint particles and iterative distance constraints to collapse as ragdolls. The player sword tracks the mouse with short exponential smoothing; enemy weapons retain slower spring-driven swings. Blade collisions transfer impulse, cause knockback, and deal damage based on speed and weapon mass. Blades can clash. This is a lightweight custom arcade physics solver, not a general-purpose rigid-body engine.

Optional impact audio is synthesized locally; toggle Sound on. Losing browser focus pauses the fight.


