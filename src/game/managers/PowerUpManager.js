import { POWER_UP_CONFIG } from '../constants';
import { GAME_STATES } from '../constants';

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

        // Log game state every 5 seconds
        if (Math.floor(this.gameTime / 5) > Math.floor((this.gameTime - deltaTime) / 5)) {
            console.log('Game state:', {
                level: this.game.level,
                gameTime: this.gameTime.toFixed(1),
                isLevelUp: this.game.isLevelUp,
                hasStargateEffect: !!this.stargateEffect,
                existingStargate: this.powerUps.some(p => p.type === 'STARGATE')
            });
        }

        // Update existing power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            // Update position
            powerUp.x += powerUp.speed * powerUp.direction * deltaTime;
            
            // Update rotations for stargate
            if (powerUp.type === 'STARGATE') {
                powerUp.rotation = (powerUp.rotation || 0) + Math.PI * deltaTime;
                powerUp.vortexRotation = (powerUp.vortexRotation || 0) + Math.PI * 2 * deltaTime;
            }
            
            // Check if power-up is off screen
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

        // Only update stargate effect if we're in LEVEL_UP state
        if (this.stargateEffect && this.game.stateManager.state === GAME_STATES.LEVEL_UP) {
            this.stargateEffect.time += deltaTime;
            this.stargateEffect.vortexRotation = (this.stargateEffect.vortexRotation || 0) + Math.PI * 2 * deltaTime;
            this.stargateEffect.rotation = (this.stargateEffect.rotation || 0) + Math.PI * deltaTime;
            
            // Always expand the radius during the effect
            const maxRadius = Math.max(this.game.canvas.width, this.game.canvas.height) * 1.5;
            this.stargateEffect.radius = Math.min(
                this.stargateEffect.radius + 500 * deltaTime,
                maxRadius
            );
        }

        // Only spawn power-ups if we're in PLAYING state
        if (this.game.stateManager.state === GAME_STATES.PLAYING) {
            // Spawn power-ups
            if (this.spawnTimer >= this.getSpawnInterval()) {
                this.spawnPowerUp();
                this.spawnTimer = 0;
            }
        }

        // Only check for stargate spawn if we're not in a level-up sequence
        // and there's no active stargate effect
        if (!this.game.isLevelUp && !this.stargateEffect && 
            this.gameTime >= 30 && !this.powerUps.some(p => p.type === 'STARGATE')) {
            console.log('Stargate spawn conditions met:', {
                level: this.game.level,
                isLevelUp: this.game.isLevelUp,
                hasStargateEffect: !!this.stargateEffect,
                gameTime: this.gameTime.toFixed(1),
                existingStargate: this.powerUps.some(p => p.type === 'STARGATE')
            });
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
                    // Keep the same position and size as the original stargate
                    this.stargateEffect = {
                        x: stargate.x + stargate.width/2,
                        y: stargate.y + stargate.height/2,
                        width: stargate.width,
                        height: stargate.height,
                        radius: Math.max(stargate.width, stargate.height) / 2, // Start with stargate size
                        opacity: 1,
                        time: 0,
                        rotation: stargate.rotation || 0,
                        vortexRotation: stargate.vortexRotation || 0,
                        levelUpStarted: false,
                        showLevelUp: true
                    };

                    // Make the player start fading
                    this.game.player.startFadeOut();
                    
                    // Clear all power-ups except the stargate
                    this.powerUps = [stargate];
                    
                    // Transition to LEVEL_UP state
                    this.game.stateManager.setState(GAME_STATES.LEVEL_UP);
                }
                break;
        }
    }

    checkCollision(rect1, powerUp) {
        // For stargate, only check if the center of the viper intersects with the vortex (inner 50% of stargate)
        if (powerUp.type === 'STARGATE') {
            // Calculate center point of the viper
            const viperCenterX = rect1.x + rect1.width / 2;
            const viperCenterY = rect1.y + rect1.height / 2;
            
            // Calculate stargate center and vortex radius (50% of stargate size)
            const stargateCenterX = powerUp.x + powerUp.width / 2;
            const stargateCenterY = powerUp.y + powerUp.height / 2;
            const vortexRadius = powerUp.width * 0.25; // Vortex is inner 50% of stargate
            
            // Calculate distance between centers
            const dx = viperCenterX - stargateCenterX;
            const dy = viperCenterY - stargateCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Return true if viper center is within vortex radius
            return distance <= vortexRadius;
        }
        
        // For other power-ups, use regular bounding box collision
        return rect1.x < powerUp.x + powerUp.width &&
               rect1.x + rect1.width > powerUp.x &&
               rect1.y < powerUp.y + powerUp.height &&
               rect1.y + rect1.height > powerUp.y;
    }

    getSpawnInterval() {
        // Decrease spawn interval as level increases
        const baseInterval = 15; // 15 seconds between power-ups
        return baseInterval / (1 + (this.game.level - 1) * 0.1);
    }

    render(ctx) {
        // Render all power-ups
        this.powerUps.forEach(powerUp => {
            ctx.save();
            ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
            
            if (powerUp.type === 'STARGATE') {
                // Draw vortex first (behind stargate)
                const vortexSprite = this.game.spriteLoader.getSprite('vortex');
                const stargateSprite = this.game.spriteLoader.getSprite('stargate');
                
                if (vortexSprite && stargateSprite) {
                    // Draw vortex
                    ctx.save();
                    ctx.rotate(powerUp.vortexRotation);
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
                    ctx.drawImage(
                        stargateSprite.image,
                        -powerUp.width/2,
                        -powerUp.height/2,
                        powerUp.width,
                        powerUp.height
                    );
                }
            } else {
                // Draw regular power-ups
                const spriteName = powerUp.type === 'SHIELD' ? 'shield' : 'life';
                const sprite = this.game.spriteLoader.getSprite(spriteName);
                if (sprite) {
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
        });

        // Render stargate effect if active
        if (this.stargateEffect) {
            ctx.save();
            ctx.translate(this.stargateEffect.x, this.stargateEffect.y);
            
            // Draw the blue halo effect first
            ctx.globalCompositeOperation = 'screen';
            const radius = this.stargateEffect.radius;
            if (radius > 0 && isFinite(radius)) {
                const gradient = ctx.createRadialGradient(
                    0, 0, radius * 0.1,
                    0, 0, radius
                );
                gradient.addColorStop(0, `rgba(0, 196, 255, ${0.8 * this.stargateEffect.opacity})`);
                gradient.addColorStop(0.3, `rgba(0, 128, 255, ${0.5 * this.stargateEffect.opacity})`);
                gradient.addColorStop(1, 'rgba(0, 64, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw stargate with rotation
            const stargate = this.game.spriteLoader.getSprite('stargate');
            const vortex = this.game.spriteLoader.getSprite('vortex');
            
            if (stargate && vortex) {
                // Draw stargate with opacity
                ctx.globalAlpha = this.stargateEffect.opacity;
                ctx.globalCompositeOperation = 'source-over';
                
                // Draw stargate
                ctx.rotate(this.stargateEffect.rotation * Math.PI / 180);
                ctx.drawImage(
                    stargate.image,
                    -this.stargateEffect.width/2,
                    -this.stargateEffect.height/2,
                    this.stargateEffect.width,
                    this.stargateEffect.height
                );
                
                // Draw vortex with additional rotation
                ctx.rotate(this.stargateEffect.vortexRotation * Math.PI / 180);
                ctx.drawImage(
                    vortex.image,
                    -this.stargateEffect.width/2,
                    -this.stargateEffect.height/2,
                    this.stargateEffect.width,
                    this.stargateEffect.height
                );
            }
            ctx.restore();

            // Draw Level Up banner if we should show it
            if (this.stargateEffect.showLevelUp) {
                const levelUp = this.game.spriteLoader.getSprite('levelUp');
                if (levelUp) {
                    ctx.save();
                    ctx.globalAlpha = this.stargateEffect.opacity;
                    
                    // Scale banner to be about 30% of canvas width
                    const bannerScale = this.game.canvas.width * 0.3 / levelUp.width;
                    const bannerWidth = levelUp.width * bannerScale;
                    const bannerHeight = levelUp.height * bannerScale;
                    
                    // Center the banner and make it pulse
                    const pulseScale = 1 + Math.sin(this.stargateEffect.time * 5) * 0.1;
                    const finalWidth = bannerWidth * pulseScale;
                    const finalHeight = bannerHeight * pulseScale;
                    
                    // Draw the banner centered on screen
                    ctx.drawImage(
                        levelUp.image,
                        this.game.canvas.width/2 - finalWidth/2,
                        this.game.canvas.height/2 - finalHeight/2,
                        finalWidth,
                        finalHeight
                    );
                    
                    ctx.restore();
                }
            }
        }
    }

    clearPowerUps() {
        this.powerUps = [];
        this.spawnTimer = 0;
    }
} 