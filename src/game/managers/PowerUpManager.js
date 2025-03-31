import { POWER_UP_CONFIG } from '../constants';

export default class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.spawnTimer = 0;
        this.gameTime = 0;
        this.stargateEffect = null;
    }

    update(deltaTime) {
        this.gameTime += deltaTime;
        this.spawnTimer += deltaTime;

        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            // Move power-up horizontally based on direction
            powerUp.x += powerUp.speed * deltaTime * powerUp.direction;

            // Update rotations for regular power-ups
            if (powerUp.type === 'STARGATE') {
                powerUp.rotation = (powerUp.rotation || 0) + Math.PI * deltaTime;
                powerUp.vortexRotation = (powerUp.vortexRotation || 0) + Math.PI * 2 * deltaTime;
            }

            // Only check terrain collision for non-Stargate power-ups
            if (powerUp.type !== 'STARGATE') {
                const terrainHeight = this.game.terrain.getHeightAt(powerUp.x + powerUp.width/2);
                if (powerUp.y + powerUp.height > this.game.canvas.height - terrainHeight) {
                    return false;
                }
            }

            // Fix off-screen check logic
            if (powerUp.direction === 1) {
                if (powerUp.x > this.game.canvas.width + powerUp.width + 100) {
                    return false;
                }
            } else {
                if (powerUp.x < -powerUp.width - 100) {
                    return false;
                }
            }
            return true;
        });

        // Update stargate effect
        if (this.stargateEffect) {
            this.stargateEffect.time += deltaTime;
            
            // Update rotations (in radians)
            this.stargateEffect.rotation = (this.stargateEffect.rotation || 0) + Math.PI * deltaTime;
            this.stargateEffect.vortexRotation = (this.stargateEffect.vortexRotation || 0) + Math.PI * 2 * deltaTime;
            
            // Update radius with clamped values
            const maxRadius = this.game.canvas.width / 2;
            this.stargateEffect.radius = Math.min(
                this.stargateEffect.radius + 600 * deltaTime,
                maxRadius
            );
            
            // Only start fading after level-up message has been shown
            if (this.stargateEffect.levelUpStarted && !this.game.isLevelUp) {
                this.stargateEffect.opacity = Math.max(0, this.stargateEffect.opacity - deltaTime * 2);
                if (this.stargateEffect.opacity <= 0) {
                    this.stargateEffect = null;
                }
            }
        }

        // Spawn power-ups
        if (this.spawnTimer >= this.getSpawnInterval()) {
            this.spawnPowerUp();
            this.spawnTimer = 0;
        }

        // Only check for stargate spawn if we're not in a level-up sequence
        // and there's no active stargate effect
        if (!this.game.isLevelUp && !this.stargateEffect && 
            this.gameTime >= 30 && !this.powerUps.some(p => p.type === 'STARGATE')) {
            this.spawnStargate();
        }
    }

    spawnPowerUp() {
        const type = Math.random() < 0.7 ? 'SHIELD' : 'FREE_LIFE'; // 70% chance of shield, 30% chance of free life
        const config = POWER_UP_CONFIG[type];
        
        // Get sprite dimensions and scale for gameplay
        const spriteName = type === 'SHIELD' ? 'shield' : 'life';
        const sprite = this.game.spriteLoader.getSprite(spriteName);
        let width, height;
        
        if (sprite) {
            // Scale power-ups to be about 8% of canvas width
            const scale = this.game.canvas.width * 0.08;
            width = scale;
            height = (sprite.height / sprite.width) * scale; // Maintain aspect ratio
        } else {
            width = config.WIDTH;
            height = config.HEIGHT;
        }
        
        // Determine spawn position and direction based on player's direction
        const playerDirection = this.game.player.direction;
        const spawnX = playerDirection === 1 ? 
            this.game.canvas.width + 50 : // Spawn on right if player is moving right
            -width - 50; // Spawn on left if player is moving left
        
        // Direction should be opposite of player's direction
        const direction = -playerDirection; // Opposite of player's direction
        
        // Spawn in the top half of the play area
        const playAreaHeight = this.game.canvas.height / 2;
        const spawnY = Math.random() * (playAreaHeight - height - 50);
        
        console.log(`Spawning ${type} at x=${spawnX}, y=${spawnY}, direction=${direction}, playerDirection=${playerDirection}`);
        
        const powerUp = {
            type,
            x: spawnX,
            y: spawnY,
            width: width,
            height: height,
            speed: 150, // Base speed for power-ups
            rotation: type === 'FREE_LIFE' ? 0 : null, // Add rotation for extra life
            direction: direction
        };

        this.powerUps.push(powerUp);
    }

    spawnStargate() {
        const config = POWER_UP_CONFIG.STARGATE;
        
        // Get sprite dimensions and scale for gameplay
        const sprite = this.game.spriteLoader.getSprite('stargate');
        let width, height;
        
        if (sprite) {
            // Scale stargate to be about 15% of canvas width
            const scale = this.game.canvas.width * 0.15;
            width = scale;
            height = scale; // Stargate is square
        } else {
            width = config.WIDTH;
            height = config.HEIGHT;
        }
        
        // Determine spawn position and direction based on player's direction
        const playerDirection = this.game.player.direction;
        const spawnX = playerDirection === 1 ? 
            this.game.canvas.width + 50 : // Spawn on right if player is moving right
            -width - 50; // Spawn on left if player is moving left
        
        // Direction should be opposite of player's direction
        const direction = -playerDirection; // Opposite of player's direction
        
        // Spawn in the upper half of the screen
        const minY = 50; // Minimum distance from top
        const maxY = this.game.canvas.height / 2 - height; // Stay in upper half
        const spawnY = minY + Math.random() * (maxY - minY);
        
        console.log(`Spawning STARGATE at x=${spawnX}, y=${spawnY}, direction=${direction}, playerDirection=${playerDirection}`);
        
        const stargate = {
            type: 'STARGATE',
            x: spawnX,
            y: spawnY,
            width: width,
            height: height,
            speed: 100, // Slower speed for stargate
            rotation: 0,
            vortexRotation: 0,
            direction: direction
        };

        this.powerUps.push(stargate);
    }

    checkCollisions(player) {
        const playerBounds = player.getBounds();

        this.powerUps = this.powerUps.filter(powerUp => {
            if (this.checkCollision(playerBounds, powerUp)) {
                this.applyPowerUp(powerUp.type);
                return false;
            }
            return true;
        });
    }

    applyPowerUp(type) {
        switch (type) {
            case 'SHIELD':
                this.game.shieldTime = POWER_UP_CONFIG.SHIELD.DURATION;
                break;
            case 'FREE_LIFE':
                this.game.lives = Math.min(this.game.lives + 1, 5);
                break;
            case 'STARGATE':
                // Create stargate effect
                const stargate = this.powerUps.find(p => p.type === 'STARGATE');
                if (stargate) {
                    // Keep the same size as the original stargate
                    this.stargateEffect = {
                        x: stargate.x + stargate.width/2,
                        y: stargate.y + stargate.height/2,
                        width: stargate.width,
                        height: stargate.height,
                        radius: Math.max(stargate.width, stargate.height) / 2,
                        opacity: 1,
                        time: 0,
                        rotation: stargate.rotation || 0,
                        vortexRotation: stargate.vortexRotation || 0,
                        levelUpStarted: false // Track if level-up has started
                    };
                    // Make the player start fading
                    this.game.player.startFadeOut();
                }
                // Start level-up sequence after effect completes
                setTimeout(() => {
                    this.game.isLevelUp = true;
                    this.game.levelUpStartTime = this.game.currentTime;
                    this.game.level++;
                    this.gameTime = 0;
                    this.game.player.reset();
                    if (this.stargateEffect) {
                        this.stargateEffect.levelUpStarted = true;
                    }
                }, 2000);
                break;
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    getSpawnInterval() {
        // Decrease spawn interval as level increases
        const baseInterval = 15; // 15 seconds between power-ups
        return baseInterval / (1 + (this.game.level - 1) * 0.1);
    }

    render(ctx) {
        // First render any active stargate effect
        if (this.stargateEffect) {
            ctx.save();
            
            // Draw the stargate sprite
            const stargate = this.game.spriteLoader.getSprite('stargate');
            const vortex = this.game.spriteLoader.getSprite('vortex');
            
            if (stargate && vortex) {
                ctx.translate(this.stargateEffect.x, this.stargateEffect.y);
                
                // Draw vortex first (behind stargate)
                ctx.save();
                ctx.rotate(this.stargateEffect.vortexRotation);
                ctx.globalAlpha = this.stargateEffect.opacity;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(
                    vortex.image,
                    -this.stargateEffect.width/2,
                    -this.stargateEffect.height/2,
                    this.stargateEffect.width,
                    this.stargateEffect.height
                );
                ctx.restore();
                
                // Draw stargate on top
                ctx.save();
                ctx.rotate(this.stargateEffect.rotation);
                ctx.globalAlpha = this.stargateEffect.opacity;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(
                    stargate.image,
                    -this.stargateEffect.width/2,
                    -this.stargateEffect.height/2,
                    this.stargateEffect.width,
                    this.stargateEffect.height
                );
                ctx.restore();
                
                // Draw the blue halo effect
                const radius = this.stargateEffect.radius;
                if (radius > 0 && isFinite(radius)) {
                    ctx.beginPath();
                    const gradient = ctx.createRadialGradient(
                        0, 0, radius * 0.1,
                        0, 0, radius
                    );
                    gradient.addColorStop(0, `rgba(0, 196, 255, ${0.8 * this.stargateEffect.opacity})`);
                    gradient.addColorStop(0.3, `rgba(0, 128, 255, ${0.5 * this.stargateEffect.opacity})`);
                    gradient.addColorStop(1, 'rgba(0, 64, 255, 0)');
                    ctx.fillStyle = gradient;
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            ctx.restore();
        }

        // Then render regular power-ups if stargate effect is not active
        if (!this.stargateEffect) {
            this.powerUps.forEach(powerUp => {
                if (!powerUp.collected) {
                    ctx.save();
                    ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
                    
                    if (powerUp.type === 'STARGATE') {
                        // Draw vortex first (behind stargate)
                        const vortexSprite = this.game.spriteLoader.getSprite('vortex');
                        const stargateSprite = this.game.spriteLoader.getSprite('stargate');
                        
                        if (vortexSprite && stargateSprite) {
                            ctx.save();
                            ctx.rotate(powerUp.vortexRotation);
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(
                                vortexSprite.image,
                                -powerUp.width/2,
                                -powerUp.height/2,
                                powerUp.width,
                                powerUp.height
                            );
                            ctx.restore();
                            
                            // Draw stargate
                            ctx.rotate(powerUp.rotation);
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(
                                stargateSprite.image,
                                -powerUp.width/2,
                                -powerUp.height/2,
                                powerUp.width,
                                powerUp.height
                            );
                        }
                    } else {
                        const sprite = this.game.spriteLoader.getSprite(powerUp.type.toLowerCase());
                        if (sprite) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(
                                sprite.image,
                                -powerUp.width/2,
                                -powerUp.height/2,
                                powerUp.width,
                                powerUp.height
                            );
                        }
                    }
                    ctx.restore();
                }
            });
        }
    }

    clearPowerUps() {
        this.powerUps = [];
        this.spawnTimer = 0;
    }
} 