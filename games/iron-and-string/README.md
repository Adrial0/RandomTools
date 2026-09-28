# Iron & String

Open `index.html` in a desktop browser. No build step or dependencies. Optional Google Fonts fall back to system fonts offline.

- **A / D:** move left / right
- **W:** jump (hold to jump again after landing)
- **S:** crouch
- **Mouse:** aim and swing the sword around your fighter; no click required
- **Esc:** pause / resume
- **R:** retry the current round

Ten rounds introduce greatswords, axes, spears, hammers, quicker duelists, and multiple enemies. Cleared rounds unlock the next round; local browser storage remembers unlocked rounds. Select an unlocked round below the arena to replay it. Health resets each round.

The simulation uses a fixed 120 Hz step, Verlet joint particles, iterative distance constraints, active balance forces, gravity, and ground friction. Weapon angles use damped spring acceleration and inertia. Blade collisions transfer impulse, cause knockback, and deal damage based on speed and weapon mass. Blades can clash. Dead fighters lose their balance forces and collapse as ragdolls. This is a lightweight custom arcade physics solver, not a general-purpose rigid-body engine.

Optional impact audio is synthesized locally; toggle Sound on. Losing browser focus pauses the fight.
