import { ENEMY_CONFIG } from '../constants';
import { GAME_STATES } from '../constants';

export default class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemies = [];
        this.explosions = [];
        this.activeShots = [];
        this.lastSpawnTime = 0;
        this.spawnTimer = 0;
    }

    update(deltaTime) {
        // Only spawn enemies if game is in PLAYING state
        if (!this.game.stateManager || this.game.stateManager.state !== GAME_STATES.PLAYING) {
            console.log('Game not in PLAYING state, current state:', this.game.stateManager ? this.game.stateManager.state : 'undefined');
            return;
        }

        // Update spawn timer
        this.spawnTimer += deltaTime;
        console.log('Game state:', this.game.stateManager.state, 'Level:', this.game.level, 'Spawn timer:', this.spawnTimer.toFixed(2), 'Interval:', this.getSpawnInterval().toFixed(2));

        // Spawn enemies
        if (this.spawnTimer >= this.getSpawnInterval()) {
            console.log('Attempting to spawn enemy');
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            // Move enemy horizontally based on direction
            enemy.x += enemy.speed * deltaTime * enemy.direction;

            // Debug log for enemy position
            console.log(`Enemy ${enemy.type} position: x=${enemy.x.toFixed(2)}, y=${enemy.y.toFixed(2)}, direction=${enemy.direction}`);

            if (enemy.type === 'DRONE') {
                // Direct tracking for drones - no random offset
                const targetY = this.game.player.y + (this.game.player.height / 2) - (enemy.height / 2);
                const dy = targetY - enemy.y;
                
                // Apply vertical acceleration more aggressively for drones
                if (Math.abs(dy) > 2) { // Smaller deadzone for more precise tracking
                    const direction = Math.sign(dy);
                    enemy.verticalSpeed += direction * enemy.verticalAcceleration * deltaTime;
                    
                    // Higher max speed for drones
                    enemy.verticalSpeed = Math.max(
                        Math.min(enemy.verticalSpeed, enemy.maxVerticalSpeed),
                        -enemy.maxVerticalSpeed
                    );
                    
                    // Apply vertical movement
                    enemy.y += enemy.verticalSpeed * deltaTime;
                } else {
                    // Slower deceleration for smoother movement
                    enemy.verticalSpeed *= 0.95;
                }
            } else {
                // Killer behavior - keep some randomness for variety
                enemy.randomChangeTimer += deltaTime;
                if (enemy.randomChangeTimer >= enemy.randomChangeInterval) {
                    enemy.randomOffset = (Math.random() - 0.5) * 100; // Reduced random range
                    enemy.randomChangeTimer = 0;
                    enemy.randomChangeInterval = 1 + Math.random() * 2;
                }

                const targetY = this.game.player.y + enemy.randomOffset;
                const dy = targetY - enemy.y;
                
                if (Math.abs(dy) > 5) {
                    const direction = Math.sign(dy);
                    enemy.verticalSpeed += direction * enemy.verticalAcceleration * deltaTime;
                    enemy.verticalSpeed = Math.max(
                        Math.min(enemy.verticalSpeed, enemy.maxVerticalSpeed),
                        -enemy.maxVerticalSpeed
                    );
                    enemy.y += enemy.verticalSpeed * deltaTime;
                } else {
                    enemy.verticalSpeed *= 0.8;
                }
            }

            // Keep enemy within screen bounds
            const maxY = this.game.canvas.height - enemy.height - 50; // Allow full screen height minus buffer
            const minY = 50; // Buffer from top
            enemy.y = Math.max(minY, Math.min(maxY, enemy.y));

            // Check terrain collision with more clearance
            const terrainHeight = this.game.terrain.getHeightAt(enemy.x + enemy.width/2);
            if (enemy.y + enemy.height > this.game.canvas.height - terrainHeight - 50) { // Added 50px buffer
                this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                return false;
            }

            // Update shooting for Killer and Striker
            if (enemy.type === 'KILLER' || enemy.type === 'STRIKER') {
                enemy.lastShot += deltaTime;
                if (enemy.lastShot >= ENEMY_CONFIG.KILLER.FIRE_RATE) {
                    this.shoot(enemy);
                    enemy.lastShot = 0;
                }
            }

            // Fix off-screen check logic
            if (enemy.direction === 1) {
                // Moving right - remove if too far right
                if (enemy.x > this.game.canvas.width + enemy.width + 100) {
                    console.log(`Removing enemy ${enemy.type} - too far right`);
                    return false;
                }
            } else {
                // Moving left - remove if too far left
                if (enemy.x < -enemy.width - 100) {
                    console.log(`Removing enemy ${enemy.type} - too far left`);
                    return false;
                }
            }
            return true;
        });

        // Update all active shots
        this.activeShots = this.activeShots.filter(shot => {
            // Move shot horizontally based on direction
            shot.x += shot.speed * deltaTime;
            
            // Remove if off screen based on direction
            return shot.direction === 1 ? 
                shot.x + shot.width > 0 : // Going right
                shot.x < this.game.canvas.width; // Going left
        });

        // Update explosions
        this.updateExplosions(deltaTime);
    }

    spawnEnemy() {
        // Randomly choose enemy type (now including STRIKER)
        const types = ['DRONE', 'KILLER', 'SPIKE', 'STRIKER'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Get sprite dimensions and scale for gameplay
        const spriteName = type.toLowerCase();
        const sprite = this.game.spriteLoader.getSprite(spriteName);
        let width, height;
        
        if (sprite) {
            // Scale enemies relative to player size (player is 5% of canvas width)
            const baseScale = this.game.canvas.width * 0.05;
            // Original scaling for all enemies
            const scale = type === 'KILLER' ? baseScale * 0.9 :
                         type === 'STRIKER' ? baseScale * 1.25 : // 25% larger than base
                         baseScale * 1.0;
            width = scale;
            height = (sprite.height / sprite.width) * scale;
        } else {
            width = 40;
            height = 40;
        }
        
        // Determine spawn position and direction based on player's direction
        const playerDirection = this.game.player.direction;
        const spawnX = playerDirection === 1 ? 
            this.game.canvas.width + 50 : // Spawn on right if player is moving right
            -width - 50; // Spawn on left if player is moving left
        
        // Direction should be opposite of player's direction
        const direction = -playerDirection;
        
        // Spawn in the top half of the play area
        const playAreaHeight = this.game.canvas.height / 2;
        const spawnY = Math.random() * (playAreaHeight - height - 50);
        
        // Create enemy object with type-specific properties
        const enemy = {
            type: type,
            x: spawnX,
            y: spawnY,
            width: width,
            height: height,
            direction: direction,
            verticalSpeed: 0,
            verticalAcceleration: (type === 'KILLER' || type === 'STRIKER') ? 400 : 300,
            maxVerticalSpeed: (type === 'KILLER' || type === 'STRIKER') ? 300 : 200,
            speed: type === 'KILLER' ? 200 : 
                   type === 'STRIKER' ? 300 : // 50% faster than Killer's 200
                   type === 'SPIKE' ? 225 :
                   150,
            points: type === 'KILLER' ? 200 :
                   type === 'STRIKER' ? 300 :
                   type === 'SPIKE' ? 250 :
                   100,
            rotation: type === 'DRONE' || type === 'SPIKE' ? 0 : null,
            rotationSpeed: type === 'SPIKE' ? 16 : 2,
            randomOffset: 0,
            randomChangeTimer: 0,
            randomChangeInterval: 1 + Math.random() * 2,
            lastShot: 0,
            shotType: type === 'STRIKER' ? 'GREEN_PLASMA' : 'NORMAL'
        };

        // Add to enemies array
        this.enemies.push(enemy);
        
        console.log(`Spawned ${type} at x=${spawnX}, y=${spawnY}, direction=${direction}`);
    }

    shoot(enemy) {
        const shot = {
            x: enemy.x + (enemy.direction === 1 ? enemy.width : 0),
            y: enemy.y + enemy.height / 2,
            width: 8,
            height: 6,
            speed: enemy.type === 'STRIKER' ? 500 * enemy.direction : 300 * enemy.direction,
            direction: enemy.direction,
            type: enemy.shotType || 'NORMAL',
            trail: [], // Add trail for plasma shots
            maxTrailLength: 10,
            time: 0
        };
        this.activeShots.push(shot);
        this.game.audioManager.playEnemyShot();
    }

    updateExplosions(deltaTime) {
        this.explosions = this.explosions.filter(explosion => {
            explosion.time += deltaTime;
            explosion.radius += explosion.growthRate * deltaTime;
            explosion.opacity -= deltaTime;
            return explosion.opacity > 0;
        });
    }

    checkCollisions(player) {
        const playerBounds = player.getBounds();
        let playerHit = false;

        // Check enemy collisions
        this.enemies = this.enemies.filter(enemy => {
            if (this.checkCollision(playerBounds, enemy)) {
                playerHit = true;
                this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                this.game.score += enemy.points;
                return false;
            }
            return true;
        });

        // Check shot collisions with player
        this.activeShots = this.activeShots.filter(shot => {
            if (this.checkCollision(playerBounds, shot)) {
                playerHit = true;
                return false;
            }
            return true;
        });

        // Check player shot collisions with enemies
        if (this.game.shots) {
            this.game.shots = this.game.shots.filter(shot => {
                let shotHit = false;
                this.enemies = this.enemies.filter(enemy => {
                    if (this.checkCollision(shot, enemy)) {
                        shotHit = true;
                        this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        this.game.score += enemy.points;
                        return false;
                    }
                    return true;
                });
                return !shotHit;
            });
        }

        return playerHit;
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    createExplosion(x, y) {
        this.explosions.push({
            x: x,  // Already centered from call sites
            y: y,  // Already centered from call sites
            radius: 5,
            maxRadius: 30,
            growthRate: 100,
            opacity: 1,
            time: 0
        });
        this.game.audioManager.playExplosion();
    }

    getSpawnInterval() {
        // Decrease spawn interval as level increases, but ensure it doesn't get too small
        const baseInterval = 2;
        const interval = baseInterval / (1 + (this.game.level - 1) * 0.1);
        console.log('Spawn interval:', interval, 'Level:', this.game.level);
        return Math.max(interval, 0.5); // Ensure minimum spawn interval of 0.5 seconds
    }

    render(ctx) {
        // Draw enemies
        this.enemies.forEach(enemy => {
            const spriteName = enemy.type.toLowerCase();
            const sprite = this.game.spriteLoader.getSprite(spriteName);
            
            if (sprite) {
                ctx.save();
                // Enable high-quality image rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Set up rotation for drones and spikes
                if (enemy.type === 'DRONE' || enemy.type === 'SPIKE') {
                    // Use rotationSpeed property for different spin rates
                    enemy.rotation = (enemy.rotation - enemy.rotationSpeed) % 360;
                    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    ctx.rotate(enemy.rotation * Math.PI / 180);
                    ctx.drawImage(sprite.image, -enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
                } else {
                    // For Killers and Strikers, flip the sprite based on direction (inverted to face the Viper)
                    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    ctx.scale(-enemy.direction, 1); // Invert direction to face towards Viper
                    ctx.drawImage(sprite.image, -enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
                }
                ctx.restore();
            } else {
                // Fallback to rectangles if sprites not loaded
                ctx.fillStyle = enemy.type === 'DRONE' ? '#ff0000' : 
                              enemy.type === 'SPIKE' ? '#00ff00' :
                              enemy.type === 'STRIKER' ? '#0000ff' : '#ff00ff';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        });

        // Draw all active shots
        this.activeShots.forEach(shot => {
            if (shot.type === 'GREEN_PLASMA') {
                // Update trail
                shot.trail.push({ x: shot.x, y: shot.y });
                if (shot.trail.length > shot.maxTrailLength) {
                    shot.trail.shift();
                }
                shot.time += 0.1;

                // Draw trail
                shot.trail.forEach((pos, index) => {
                    const alpha = (index / shot.trail.length) * 0.5;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    
                    // Draw trail segment
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                    ctx.lineTo(pos.x + shot.width, pos.y);
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    
                    // Add glow effect
                    const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + shot.width, pos.y);
                    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
                    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(pos.x, pos.y - 2, shot.width, 4);
                    
                    ctx.restore();
                });

                // Draw main plasma bolt
                ctx.save();
                
                // Create plasma bolt gradient
                const boltGradient = ctx.createLinearGradient(shot.x, shot.y, shot.x + shot.width, shot.y);
                boltGradient.addColorStop(0, '#00ff00');
                boltGradient.addColorStop(0.5, '#00cc00');
                boltGradient.addColorStop(1, '#008800');
                
                // Draw main bolt
                ctx.fillStyle = boltGradient;
                ctx.fillRect(shot.x, shot.y - shot.height/2, shot.width, shot.height);
                
                // Add glow effect
                ctx.globalCompositeOperation = 'screen';
                ctx.restore();
            } else {
                // Regular yellow enemy shots
                ctx.fillStyle = '#ff0';
                const x = Math.round(shot.x);
                const y = Math.round(shot.y - shot.height/2);
                ctx.fillRect(x, y, shot.width, shot.height);
            }
        });

        // Draw explosions
        this.explosions.forEach(explosion => {
            // Draw outer explosion
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 0, ${explosion.opacity})`;
            ctx.fill();
            
            // Draw inner explosion
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${explosion.opacity})`;
            ctx.fill();
        });
    }

    clearEnemies() {
        this.enemies = [];
        this.explosions = [];
        this.activeShots = [];
        this.spawnTimer = 0;
    }
} 