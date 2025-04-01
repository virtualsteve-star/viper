import { PLAYER_CONFIG, GAME_STATES } from '../constants';
import Shot from './Shot';

export default class Player {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        
        // Get sprite dimensions and scale for gameplay
        const sprite = this.game.spriteLoader.getSprite('viper');
        if (sprite) {
            // Scale the sprite to a reasonable gameplay size (about 5% of canvas width)
            const targetWidth = this.game.canvas.width * 0.05;
            const scale = targetWidth / sprite.width;
            this.width = sprite.width * scale;
            this.height = sprite.height * scale;
        } else {
            this.width = PLAYER_CONFIG.WIDTH;
            this.height = PLAYER_CONFIG.HEIGHT;
        }
        
        this.speed = PLAYER_CONFIG.SPEED;
        this.lastShot = 0;
        this.shots = [];
        this.isDead = false;
        this.explosion = null;
        this.isRespawned = false;
        this.fadeOpacity = 1;
        this.isFading = false;
        this.direction = 1; // 1 for right, -1 for left
        
        // Thrust effect properties
        this.thrustLength = 0;
        this.thrustOpacity = 0;
        this.thrustFadeSpeed = 2; // How quickly thrust fades in/out

        // Key state tracking
        this.wasReversePressed = false;
    }

    startFadeOut() {
        this.isFading = true;
        this.fadeOpacity = 1;
    }

    update(deltaTime, inputHandler) {
        // Handle death state updates regardless of game state
        if (this.isDead) {
            if (this.explosion) {
                // Update explosion animation
                this.explosion.time += deltaTime;
                this.explosion.radius += this.explosion.growthRate * deltaTime;
                this.explosion.opacity -= deltaTime * 0.5; // Slower fade out
                
                // Update secondary explosions if they exist
                if (this.explosion.secondaryExplosions) {
                    this.explosion.secondaryExplosions.forEach(exp => {
                        exp.time += deltaTime;
                        if (exp.time > 0) { // Only update after delay
                            exp.radius += exp.growthRate * deltaTime;
                            exp.opacity -= deltaTime * 0.5;
                        }
                    });
                }
            }
            return;
        }

        // Update existing shots regardless of game state
        if (this.game.shots) {
            this.game.shots = this.game.shots.filter(shot => {
                shot.update(deltaTime);
                return !shot.isOffscreen(this.game.canvas.width);
            });
        }

        // Only process movement and new shots in PLAYING state
        if (this.game.stateManager.state !== GAME_STATES.PLAYING) return;

        // Handle movement
        if (inputHandler.isKeyPressed('arrowup') || inputHandler.isKeyPressed('w')) {
            this.y = Math.max(0, this.y - PLAYER_CONFIG.SPEED * deltaTime);
        }
        if (inputHandler.isKeyPressed('arrowdown') || inputHandler.isKeyPressed('s')) {
            this.y = Math.min(this.game.canvas.height - PLAYER_CONFIG.HEIGHT, this.y + PLAYER_CONFIG.SPEED * deltaTime);
        }
        if (inputHandler.isKeyPressed('arrowright') || inputHandler.isKeyPressed('d')) {
            this.x = Math.min(this.game.canvas.width - this.width, this.x + PLAYER_CONFIG.SPEED * deltaTime);
        }
        if (inputHandler.isKeyPressed('arrowleft') || inputHandler.isKeyPressed('a')) {
            this.x = Math.max(0, this.x - PLAYER_CONFIG.SPEED * deltaTime);
        }

        // Handle reverse key with state tracking
        const isReversePressed = inputHandler.isKeyPressed('r');
        if (isReversePressed && !this.wasReversePressed) {
            this.reverse();
        }
        this.wasReversePressed = isReversePressed;

        // Handle shooting
        if (inputHandler.isKeyPressed(' ') || inputHandler.isKeyPressed('x')) {
            this.shoot();
        }

        // Keep player within bounds
        this.x = Math.max(0, Math.min(this.x, this.game.canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, this.game.canvas.height - this.height));

        // Check for collisions with terrain
        if (this.game.terrain.checkCollision(this)) {
            this.game.handlePlayerDeath(); // Let the Game class handle the death sequence
            return;
        }

        // Update fade effect regardless of game state
        if (this.isFading) {
            this.fadeOpacity = Math.max(0, this.fadeOpacity - deltaTime);
            return;
        }

        // Update thrust effect based on movement
        const isMovingForward = (this.direction === 1 && (inputHandler.isKeyPressed('d') || inputHandler.isKeyPressed('arrowright'))) ||
                               (this.direction === -1 && (inputHandler.isKeyPressed('a') || inputHandler.isKeyPressed('arrowleft')));
        const isMovingBackward = (this.direction === 1 && (inputHandler.isKeyPressed('a') || inputHandler.isKeyPressed('arrowleft'))) ||
                                (this.direction === -1 && (inputHandler.isKeyPressed('d') || inputHandler.isKeyPressed('arrowright')));

        // Update thrust length
        if (isMovingForward) {
            this.thrustLength = Math.min(1, this.thrustLength + deltaTime * this.thrustFadeSpeed);
        } else if (isMovingBackward) {
            this.thrustLength = 0; // No thrust when moving backward
        } else {
            this.thrustLength = 0.4; // Increased from 0.2 to 0.4 for more visible idle thrust
        }

        // Update thrust opacity
        this.thrustOpacity = this.thrustLength;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot >= PLAYER_CONFIG.FIRE_RATE * 1000) {
            const shot = new Shot(
                this.x + (this.direction === 1 ? this.width : 0),
                this.y + this.height / 2,
                this.direction  // Use the current direction when creating the shot
            );
            this.game.shots.push(shot);
            this.lastShot = now;
            this.game.audioManager.playViperShot();
        }
    }

    updateShots(deltaTime) {
        this.shots = this.shots.filter(shot => {
            shot.x += shot.speed * deltaTime;
            return shot.x < 1280; // Remove shots that go off screen
        });
    }

    render(ctx) {
        if (this.isDead) {
            if (this.explosion) {
                // Draw main explosion
                const gradient = ctx.createRadialGradient(
                    this.explosion.x, this.explosion.y, 0,
                    this.explosion.x, this.explosion.y, this.explosion.radius
                );
                
                if (this.explosion.isFinal) {
                    // More dramatic colors for final explosion
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.explosion.opacity})`);
                    gradient.addColorStop(0.4, `rgba(255, 200, 0, ${this.explosion.opacity})`);
                    gradient.addColorStop(0.7, `rgba(255, 100, 0, ${this.explosion.opacity})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, ${this.explosion.opacity * 0.5})`);
                } else {
                    gradient.addColorStop(0, `rgba(255, 200, 0, ${this.explosion.opacity})`);
                    gradient.addColorStop(1, `rgba(255, 100, 0, ${this.explosion.opacity})`);
                }

                ctx.beginPath();
                ctx.arc(this.explosion.x, this.explosion.y, this.explosion.radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw secondary explosions for final death
                if (this.explosion.secondaryExplosions) {
                    this.explosion.secondaryExplosions.forEach(exp => {
                        if (exp.time > 0) { // Only draw after delay
                            const secondaryGradient = ctx.createRadialGradient(
                                exp.x, exp.y, 0,
                                exp.x, exp.y, exp.radius
                            );
                            secondaryGradient.addColorStop(0, `rgba(255, 255, 200, ${exp.opacity})`);
                            secondaryGradient.addColorStop(0.5, `rgba(255, 150, 0, ${exp.opacity})`);
                            secondaryGradient.addColorStop(1, `rgba(255, 50, 0, ${exp.opacity * 0.5})`);

                            ctx.beginPath();
                            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
                            ctx.fillStyle = secondaryGradient;
                            ctx.fill();
                        }
                    });
                }
            }
            return;
        }

        // Draw player sprite with fade effect if active
        const sprite = this.game.spriteLoader.getSprite('viper');
        if (sprite) {
            ctx.save();
            ctx.globalAlpha = this.fadeOpacity;
            // Enable high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw thrust first (behind the ship)
            if (this.thrustOpacity > 0) {
                const isFullThrust = this.thrustLength === 1;
                
                // Engine position relative to sprite (about 15% from the edge)
                const engineOffset = this.width * 0.15;
                const thrustWidth = isFullThrust ? this.width * 0.7 : this.width * 0.4; // Longer thrust when moving
                const thrustBaseWidth = this.height * 0.3; // Slightly wider base
                const thrustEndWidth = thrustBaseWidth * (isFullThrust ? 0.25 : 0.5); // Narrower for full thrust
                
                // Create thrust gradient
                const thrustGradient = ctx.createLinearGradient(
                    engineOffset, this.height/2,
                    engineOffset - thrustWidth, this.height/2
                );
                
                if (isFullThrust) {
                    // More intense full thrust
                    thrustGradient.addColorStop(0, 'rgba(255, 255, 200, 1.0)'); // Brighter core
                    thrustGradient.addColorStop(0.2, 'rgba(255, 165, 0, 0.95)');
                    thrustGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.8)');
                    thrustGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
                } else {
                    // More visible idle thrust
                    thrustGradient.addColorStop(0, 'rgba(255, 200, 0, 0.9)');
                    thrustGradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.7)');
                    thrustGradient.addColorStop(0.7, 'rgba(255, 80, 0, 0.4)');
                    thrustGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
                }

                // Apply direction-based transform
                if (this.direction === -1) {
                    ctx.scale(-1, 1);
                    ctx.translate(-this.x - this.width, this.y);
                } else {
                    ctx.translate(this.x, this.y);
                }
                
                // Draw thrust with proper opacity
                ctx.globalAlpha = this.thrustOpacity * this.fadeOpacity;
                
                // Draw thrust shape
                ctx.beginPath();
                ctx.moveTo(engineOffset, this.height/2 - thrustBaseWidth/2);
                ctx.lineTo(engineOffset - thrustWidth, this.height/2 - thrustEndWidth/2);
                ctx.lineTo(engineOffset - thrustWidth, this.height/2 + thrustEndWidth/2);
                ctx.lineTo(engineOffset, this.height/2 + thrustBaseWidth/2);
                ctx.closePath();
                
                ctx.fillStyle = thrustGradient;
                ctx.fill();
                
                // Reset transform for sprite
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = this.fadeOpacity;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            }

            // Draw the Viper sprite
            if (this.direction === -1) {
                ctx.scale(-1, 1);
                ctx.translate(-this.x - this.width, this.y);
            } else {
                ctx.translate(this.x, this.y);
            }
            ctx.drawImage(sprite.image, 0, 0, this.width, this.height);
            ctx.restore();
        }

        // Draw shield effect if active
        if (this.game.shieldTime > 0) {
            ctx.save();
            ctx.globalAlpha = this.fadeOpacity * 0.8;
            
            // Create shield glow gradient
            const shieldGradient = ctx.createRadialGradient(
                this.x + this.width/2, this.y + this.height/2, 0,
                this.x + this.width/2, this.y + this.height/2, this.width * 0.8
            );
            shieldGradient.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
            shieldGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.3)');
            shieldGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            // Draw shield glow
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = shieldGradient;
            ctx.fill();
            
            ctx.restore();
        }

        // Draw plasma shots with trail effect
        this.shots.forEach(shot => {
            // Update trail
            shot.trail.push({ x: shot.x, y: shot.y });
            if (shot.trail.length > shot.maxTrailLength) {
                shot.trail.shift();
            }
            shot.time += 0.1; // Increment time for trail fade

            // Draw trail
            shot.trail.forEach((pos, index) => {
                const alpha = (index / shot.trail.length) * 0.5; // Fade trail from back to front
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Draw trail segment
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x + shot.width, pos.y);
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.stroke();
                
                // Add glow effect
                const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + shot.width, pos.y);
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(pos.x, pos.y - 2, shot.width, 4);
                
                ctx.restore();
            });

            // Draw main plasma bolt
            ctx.save();
            
            // Create plasma bolt gradient
            const boltGradient = ctx.createLinearGradient(shot.x, shot.y, shot.x + shot.width, shot.y);
            boltGradient.addColorStop(0, '#00ffff');
            boltGradient.addColorStop(0.5, '#0088ff');
            boltGradient.addColorStop(1, '#0044ff');
            
            // Draw main bolt
            ctx.fillStyle = boltGradient;
            ctx.fillRect(shot.x, shot.y - shot.height/2, shot.width, shot.height);
            
            // Add glow effect
            ctx.globalCompositeOperation = 'screen';
            const glowGradient = ctx.createRadialGradient(
                shot.x + shot.width/2, shot.y, 0,
                shot.x + shot.width/2, shot.y, shot.width
            );
            glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(shot.x + shot.width/2, shot.y, shot.width, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }

    reset() {
        this.x = PLAYER_CONFIG.START_X;
        this.y = PLAYER_CONFIG.START_Y;
        this.shots = [];
        this.isDead = false;
        this.explosion = null;
        this.isRespawned = false;
        this.fadeOpacity = 1;
        this.isFading = false;
    }

    die() {
        this.isDead = true;
        const isFinalLife = this.game.lives <= 0;
        
        this.explosion = {
            x: this.x + this.width / 2,  // Center on sprite
            y: this.y + this.height / 2,  // Center on sprite
            radius: isFinalLife ? 10 : 5,
            maxRadius: isFinalLife ? 100 : 40,
            growthRate: isFinalLife ? 300 : 150,
            opacity: 1,
            time: 0,
            isFinal: isFinalLife,
            secondaryExplosions: isFinalLife ? [] : null
        };

        // For final explosion, add secondary explosions
        if (isFinalLife) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = 30;
                this.explosion.secondaryExplosions.push({
                    x: this.explosion.x + Math.cos(angle) * distance,
                    y: this.explosion.y + Math.sin(angle) * distance,
                    radius: 5,
                    maxRadius: 60,
                    growthRate: 200,
                    opacity: 1,
                    delay: i * 0.1, // Stagger the explosions
                    time: -i * 0.1  // Negative time for delay
                });
            }
        }
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    toggleDirection() {
        this.direction *= -1;
    }

    reverse() {
        this.direction *= -1;
        // Don't affect existing shots - they should maintain their original direction
        // Only new shots will use the new direction
    }
} 