# Thistle Skim

## Physics
- **Frame.** Side view: the lake surface is y = 0, with height upward. The sim is fixed-step at 120 Hz with gravity 640 units/s². A throw leaves the hand 34 units up.
- **Aim.** Pulling back from the stone sets the throw: up to 560 units/s, at an angle from −35° to 60°.
- **Skips.** A stone meeting the water:
  - sinks if it comes in steeper than 26° below horizontal, or slower than 110 units/s horizontally;
  - otherwise rebounds with restitution 0.6–0.84 (flatter entries keep more lift) and loses 14% of its forward speed.
  - When the rebound would be under 30 units/s, it skitters and goes under.
  - A flat, full-power throw makes five or six skips over 450–750 units.
- **Obstacles.**
  - Lily pads always spring the stone up at least 190 units/s.
  - Rocks reflect it about their surface normal.
  - Reeds stop it where it meets the water there.
  - Ducks drift on a sine path and stop a stone that reaches them low.
  - Wind adds a constant horizontal push.
- **Lanterns.** A lantern is lit when the stone's swept path passes within its radius.

## Par
- `solve` simulates a 72 × 72 grid of angles (−10° to 45°) and speeds (120–560), collects the distinct sets of lanterns each aim lights, and keeps only the maximal sets.
- It then finds the smallest number of throws whose sets cover every lantern.
- Ducks are left out of the solver, so they only demand timing.
- `tools/par.ts` also reports, per lantern, the share of a 48 × 48 aim grid that lights it at all. The designs were tuned until every lantern is reachable (the tightest are about 1% of the grid, and only in the last lakes).
- The tests re-solve every lake and replay its solution throws.

## Stars and stones
- You hold par + 2 stones.
- Stars: three lanterns for par throws, two for one over, one for any finish.

## Feel
- **Camera.** It flies in from the far shore and pans home, follows the stone in flight at 1.55×, and returns to the hand to aim.
- **Aiming aids.**
  - A power ring around the stone turns gold near full strength.
  - A red dot warns when the throw is too steep to skip.
  - The first arc is dotted ahead.
- **Feedback.** Each skip widens three flattened ripple rings. A lit lantern sends sparks up, glows and streaks warm light down the water. A toast counts long runs of skips.
- **Attract mode.** It throws the solver's solutions on five showcase lakes.
