# Stickfight — 3D

Open `index.html` in a desktop browser with WebGL enabled. The main page is now the fully 3D version: movement uses both ground axes, the camera rotates freely, and blades, arrows, body collisions, and ragdolls are simulated in 3D. No server, build step, or runtime network connection is required. The Three.js renderer and its MIT license are vendored locally.

The previous 2D game remains at `index-2d.html`, also linked in the header. Its files and progress are preserved. See `README-2d.md` for that version.

## Controls

- **WASD:** move relative to the camera. W moves forward and S moves backward.
- **Mouse:** look around.
- **Hold left mouse + move mouse:** move the sword independently of the camera. Horizontal motion sweeps sideways, vertical motion raises or lowers the blade. Moving the sword control farther from its neutral position extends the arm.
- **Mouse wheel:** fine control over arm extension/retraction.
- **Space:** jump; release before jumping again.
- **Ctrl or C:** crouch.
- **V:** switch between first-person and third-person views at any time. Third person is the default; camera preference is saved.
- **R:** retry the current round.
- **Esc:** pause and release the mouse. Click Resume to capture it again.

Click Play to capture the mouse. If mouse capture is unavailable, use right-mouse drag to look and left-mouse drag to control the sword. Keyboard and mouse are required; touch controls are not implemented.

## Combat

There is no click-to-run attack animation. Mouse movement directs the blade, and swing velocity determines damage. Position your sword in the path of an enemy weapon or arrow to intercept it. Clashes transfer bounded recoil to both fighters without rewinding their positions. Arrows can be deflected back into enemies. Spellcasters create fixed circular purple zones with a visible fill timer; move outside the circle before it erupts. Swords cannot block these zones.

Living characters use a stable articulated locomotion controller with gravity, jumping and impulse knockback. Defeated characters become 3D Verlet ragdolls with constrained limbs and ground contact. This is a custom arcade physics solver, not a general rigid-body physics engine.

## Campaign

Fourteen rounds retain the previous progression: melee first, archers in round 2, and spellcasters in round 3. Later groups grow to eight enemies: two alternating mages, three archers, and three melee fighters. Some melee fighters stay near ranged allies as guards; a pale diamond above the head identifies them. Guards pursue normally after their ranged allies are defeated. Other melee enemies approach, circle, vary swings, attempt defensive reactions, and counterattack.

3D progression is saved separately in local storage under `stickfight-3d-progress`. Existing 2D saves are unchanged. Unlocked rounds are selectable beneath the arena. Health, projectiles, spell zones, and corpses reset when retrying or changing rounds.

## Implementation and validation

- `physics3d.js`: rendering-independent 3D simulation, collisions, enemy AI, and campaign state.
- `game3d.js`: Three.js scene, first/third-person cameras, pointer-lock input, HUD, audio, and effects.
- `style3d.css`: 3D interface.
- `vendor/three.min.js`: pinned Three.js 0.160.1 classic build, retained for direct local-file compatibility. License: `vendor/three-LICENSE.txt`.

Run the automated checks with Node:

```
node --test physics3d.test.cjs render3d.test.cjs physics.test.cjs
```

The new checks cover movement in both ground axes, jumps, arm reach, swept 3D weapon collisions, arrow deflection, dodgeable area attacks, ranged/guard behavior, mage alternation, ragdoll settling, all campaign rounds, and real Three.js scene transforms/UI callbacks. The renderer tests mock WebGL and browser host APIs; they do not replace live browser visual/playtesting. This environment did not permit live local-file browser verification.
