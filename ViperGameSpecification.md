# Game Specification: Viper

## Overview

Viper is a side-scrolling shooter web game optimized for desktop browsers (e.g., Chrome). Players control a spaceship ("Viper") flying horizontally above mountainous terrain, engaging incoming enemies, avoiding collisions, and collecting power-ups. The game progresses through levels, becoming increasingly challenging.

## Technical Requirements

- **Platform**: Web-based (HTML5, JavaScript, Canvas/WebGL)
- **Resolution**: 1280x720 pixels (16:9)
- **Graphics**:
  - Vector-based scrolling mountainous terrain
  - Sprites for Viper, enemies, power-ups, Stargate
- **Audio**:
  - Background music (looping)
  - Sound effects for shooting, explosions, power-ups, and level transitions

## Gameplay and Controls

### Controls

- **Movement**:
  - Up: `W` or `↑`
  - Down: `S` or `↓`
  - Speed Up (right): `D` or `→`
  - Slow Down (left): `A` or `←`
- **Shooting**:
  - Fire weapon: `Spacebar` or `Shift`

### Collision Rules

- Collisions with enemies, enemy projectiles, or terrain result in losing one life.
- Player starts with 3 lives.

## Player Details

- Instant vertical/horizontal movement, no inertia.
- Large explosion animation and sound on death.
- Respawn after a brief pause displaying "READY PLAYER ONE."

## Enemies

- Spawn randomly from the right side every 1-3 seconds.
- Increase in speed and firing rate with each level.

### Enemy Types

- **Drones**:

  - Points: 10
  - Slower horizontal speed, pursues Viper vertically
  - No shooting, collision damage only

- **Killers**:

  - Points: 20
  - Pursues player vertically, similar horizontal speed
  - Fires bullets twice per second toward predicted player position

- Enemies destroyed in one hit, accompanied by explosion animation and sound.

## Power-ups and Special Items

Random intervals between 5 and 20 seconds:

- **Free Life**: Adds one life (very rare)
- **Shield**: 10 seconds invincibility, visual glow around Viper
- **Stargate** (after 1-minute gameplay): Progresses to next level; enemies become faster and shoot more frequently

## Level Progression

- Infinite levels until player loses all lives.
- Levels increase enemy speed and fire rate (\~10-15% per level).
- Visual level indicators (background color shifts).

## Terrain

- Continuous scrolling mountains with varying peaks.
- Terrain collision results in instant player death.

## Scoring and User Interface (UI)

- **Score**: Drones (10 points), Killers (20 points)
- UI fixed at bottom of screen showing:

```
Lives: ❤️❤️❤️   |   Shield: 7s   |   Score: 320   |   Level: 2
```

## Game Flow and States

### Start

- Splash screen: "VIPER" and "PRESS SPACE TO START"

### Gameplay Loop

- Continuous scrolling playfield, random enemy and power-up appearances
- Player scores points by destroying enemies

### Player Death

- Explosion animation, brief pause
- Display "READY PLAYER ONE," respawn

### Game Over

- After losing all lives:

```
GAME OVER
Press R to Restart
```

## Visual and Audio Requirements

### Graphics

- Terrain: Vector graphics
- Sprites: Clear placeholder sprites (final assets provided later)

### Animations

- Detailed explosion animations for player and enemies

### Audio

- Looping background music
- Distinct sound effects for all actions and events

## Additional Technical Notes

- Chrome browser optimization with broad compatibility
- Modular, structured, maintainable code

## Future Considerations

- Replacement of placeholder graphics with final assets
- Expansion possibilities for additional power-ups or enemy types

