# Stickfight

Open `index.html` in a desktop browser. No build step or dependencies. Optional Google Fonts fall back to system fonts offline.

- **A / D:** move left / right
- **W:** jump (release and press again for another jump)
- **S:** crouch
- **Mouse:** aim the sword tip; move closer to retract the arm or farther to extend it, limited by limb length. No click required.
- **Esc:** pause / resume
- **R:** retry the current round

Fourteen rounds introduce greatswords, axes, spears, hammers, quicker duelists, archers, spellcasters, and mixed enemy groups. The arena is 1500 units wide (25% wider than the original). Cleared rounds unlock the next round; local browser storage remembers unlocked rounds. Select an unlocked round below the arena to replay it. Health resets each round.

The simulation uses a fixed 120 Hz step. Living fighters use a supported torso, articulated arms and legs, controlled walking, gravity-driven jumps, and damped impact knockback. Landing removes downward velocity without bounce. Defeated fighters use Verlet joint particles and iterative distance constraints to collapse as ragdolls. The player sword tracks the mouse with short exponential smoothing; enemy weapons retain slower spring-driven swings. Blade collisions transfer impulse, cause knockback, and deal damage based on speed and weapon mass. Blades can clash. This is a lightweight custom arcade physics solver, not a general-purpose rigid-body engine.

Optional impact audio is synthesized locally; toggle Sound on. Losing browser focus pauses the fight.



## Attacking and blocking

The player's sword changes direction only when the mouse moves. Holding the mouse still keeps the same guard angle, including during movement and knockback. No automatic thrusts or counterattacks are applied. Moving with WASD can carry your blade into an opponent; passive knockback cannot create a damaging player attack.

Place your blade in an incoming weapon's path to block. Swept, thickness-aware blade contact deflects the weapons and transfers momentum to both fighters, with sparks and optional impact sound. Clashes give a limited physical kick; reduced impact strength and velocity caps prevent excessive launches. Contact never rewinds movement or gravity; residual overlap can separate freely without freezing the fighters. Blocking works while holding a guard; there is no block button or automatic chance roll. After a blocked swing, physical recoil moves the blade; mouse input chooses the next swing. Recoil does not trigger an automatic counterattack. Attacks that miss the guard can still hit your body.


## Enemy behavior

Enemies observe the player's position, velocity, and blade motion on a delayed cadence (roughly 0.1–0.3 simulation seconds, depending on difficulty). They chase retreats, maintain weapon range, back away when crowded, and try to parry or evade incoming swings. They may duck high attacks or jump away from low ones. Defensive recovery can lead to a quicker counterattack.

Attack choices mix high, middle, and low cuts, forward lunges, and feints. Windup and recovery times vary with weapon weight and enemy speed. Attack directions are committed during the windup, leaving opportunities to dodge. Nearby enemies try to avoid occupying the same space. These are physical attempts using the same movement and weapon collisions as the player, not guaranteed blocks or invulnerability.

## Ranged enemies and arm reach

Rounds 11–14 introduce the new ranged enemies. Archers carry a bow and fire gold arrows; intercept an arrow with the blade to deflect it, potentially back into an enemy. Spellcasters carry a glowing staff, wear a pointed hat, and fire purple orbs that pass through swords. Dodge those orbs. Both enemies telegraph their shots, keep their distance, and commit to their aim shortly before firing. Projectiles are cleared when retrying or changing rounds.

The cursor targets the sword tip. Mouse distance sets shoulder-to-hand extension to 10–54 units; the sword itself remains rigid and keeps its full length. Within that reachable region the tip follows the cursor. Inside or outside it, reach clamps rather than stretching the arm. Arm joints retain lengths of 27 and 28 units. Moving the mouse closer or farther can now make deliberate thrusting or retracting motions, and those changes in reach participate in collision detection.
