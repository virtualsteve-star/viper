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

        // Update stargate effect
        if (this.stargateEffect) {
            this.stargateEffect.time += deltaTime;
            this.stargateEffect.radius += 500 * deltaTime; // Grow by 500 pixels per second
            this.stargateEffect.opacity = Math.max(0, 1 - this.stargateEffect.time / 2); // Fade over 2 seconds
            this.stargateEffect.rotation += 180 * deltaTime; // Rotate 180 degrees per second
            
            if (this.stargateEffect.opacity <= 0) {
                this.stargateEffect = null;
            }
        }

        // Spawn power-ups
        if (this.spawnTimer >= this.getSpawnInterval()) {
            this.spawnPowerUp();
            this.spawnTimer = 0;
        }

        // Check for stargate spawn after 30 seconds
        if (this.gameTime >= 30 && !this.powerUps.some(p => p.type === 'STARGATE')) {
            this.spawnStargate();
        }

        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            // Move power-up horizontally based on direction
            powerUp.x += powerUp.speed * deltaTime * powerUp.direction;

            // Debug log for power-up position
            console.log(`Power-up ${powerUp.type} position: x=${powerUp.x.toFixed(2)}, y=${powerUp.y.toFixed(2)}, direction=${powerUp.direction}`);

            // Update rotations
            if (powerUp.type === 'STARGATE') {
                powerUp.rotation = (powerUp.rotation + 180 * deltaTime) % 360; // Base rotation speed (same as splash screen)
                powerUp.vortexRotation = (powerUp.vortexRotation + 360 * deltaTime) % 360; // Double speed for vortex
            } else if (powerUp.type === 'FREE_LIFE') {
                powerUp.rotation = (powerUp.rotation + 90 * deltaTime) % 360;
            }

            // Only check terrain collision for non-Stargate power-ups
            if (powerUp.type !== 'STARGATE') {
                const terrainHeight = this.game.terrain.getHeightAt(powerUp.x + powerUp.width/2);
                if (powerUp.y + powerUp.height > this.game.canvas.height - terrainHeight) {
                    return false; // Remove power-up if it hits terrain
                }
            }

            // Fix off-screen check logic
            if (powerUp.direction === 1) {
                // Moving right - remove if too far right
                if (powerUp.x > this.game.canvas.width + powerUp.width + 100) {
                    console.log(`Removing power-up ${powerUp.type} - too far right`);
                    return false;
                }
            } else {
                // Moving left - remove if too far left
                if (powerUp.x < -powerUp.width - 100) {
                    console.log(`Removing power-up ${powerUp.type} - too far left`);
                    return false;
                }
            }
            return true;
        });
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
            case 'LIFE':
                this.game.lives = Math.min(this.game.lives + 1, 5);
                break;
            case 'STARGATE':
                // Create stargate effect
                const stargate = this.powerUps.find(p => p.type === 'STARGATE');
                if (stargate) {
                    this.stargateEffect = {
                        x: stargate.x + stargate.width/2,
                        y: stargate.y + stargate.height/2,
                        radius: Math.max(stargate.width, stargate.height),
                        maxRadius: Math.max(this.game.canvas.width, this.game.canvas.height),
                        opacity: 1,
                        time: 0,
                        rotation: stargate.rotation || 0
                    };
                    // Make the player start fading
                    this.game.player.startFadeOut();
                }
                // Start level-up sequence after effect completes
                setTimeout(() => {
                    this.game.isLevelUp = true;
                    this.game.levelUpStartTime = this.game.currentTime;
                    this.game.level++;
                    this.gameTime = 0; // Reset game time for next level
                    this.game.player.reset(); // Reset player state including fade
                }, 2000); // Wait for animation to complete
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
        // Render stargate effect if active
        if (this.stargateEffect) {
            ctx.save();
            ctx.translate(this.stargateEffect.x, this.stargateEffect.y);
            ctx.rotate(this.stargateEffect.rotation * Math.PI / 180);
            
            // Draw expanding rings
            for (let i = 0; i < 3; i++) {
                const ringRadius = this.stargateEffect.radius * (1 - i * 0.2);
                ctx.beginPath();
                ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 255, 255, ${this.stargateEffect.opacity * (1 - i * 0.3)})`;
                ctx.lineWidth = 10;
                ctx.stroke();
            }
            
            // Draw energy field
            ctx.beginPath();
            ctx.arc(0, 0, this.stargateEffect.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.stargateEffect.radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${this.stargateEffect.opacity})`);
            gradient.addColorStop(0.5, `rgba(0, 255, 255, ${this.stargateEffect.opacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.restore();
        }

        // Render power-ups
        this.powerUps.forEach(powerUp => {
            if (powerUp.type === 'STARGATE' && !this.stargateEffect) {
                const stargate = this.game.spriteLoader.getSprite('stargate');
                const vortex = this.game.spriteLoader.getSprite('vortex');
                
                if (stargate) {
                    ctx.save();
                    // Enable high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw stargate with base rotation
                    ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
                    ctx.rotate(powerUp.rotation * Math.PI / 180);
                    ctx.drawImage(stargate.image, -powerUp.width/2, -powerUp.height/2, powerUp.width, powerUp.height);
                    
                    // Draw vortex with its own rotation
                    if (vortex) {
                        ctx.save();
                        ctx.rotate(powerUp.vortexRotation * Math.PI / 180);
                        ctx.drawImage(vortex.image, -powerUp.width/2, -powerUp.height/2, powerUp.width, powerUp.height);
                        ctx.restore();
                    }
                    
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                }
            } else if (powerUp.type === 'SHIELD') {
                const sprite = this.game.spriteLoader.getSprite('shield');
                if (sprite) {
                    ctx.save();
                    // Enable high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.drawImage(sprite.image, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                }
            } else if (powerUp.type === 'FREE_LIFE' && !this.stargateEffect) {
                const sprite = this.game.spriteLoader.getSprite('life');
                if (sprite) {
                    ctx.save();
                    // Enable high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
                    ctx.rotate(powerUp.rotation * Math.PI / 180);
                    ctx.drawImage(sprite.image, -powerUp.width/2, -powerUp.height/2, powerUp.width, powerUp.height);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#ff00ff';
                    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
                }
            }
        });
    }

    clearPowerUps() {
        this.powerUps = [];
        this.spawnTimer = 0;
    }
} 