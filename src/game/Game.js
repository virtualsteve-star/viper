import Player from './entities/Player';
import Terrain from './entities/Terrain';
import EnemyManager from './managers/EnemyManager';
import PowerUpManager from './managers/PowerUpManager';
import AudioManager from './managers/AudioManager';
import SpriteLoader from './utils/SpriteLoader';
import Starfield from './entities/Starfield';
import { GAME_STATES, PLAYER_CONFIG, POWER_UP_CONFIG } from './constants';

export default class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Initialize sprite loader
        this.spriteLoader = new SpriteLoader();
        
        // Game state
        this.state = GAME_STATES.START;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.shieldTime = 0;
        
        // Death sequence
        this.deathTimer = 0;
        this.deathDelay = 2; // Seconds to wait after death before showing Ready Player One
        this.readyTimer = 0;
        this.readyDelay = 2; // Seconds to show Ready Player One
        
        // Add splash screen animation properties
        this.splashAlpha = 1;
        this.splashFadeDirection = -1; // -1 for fading out, 1 for fading in
        this.splashFadeSpeed = 0.5; // Fade cycle speed
        this.titlePulse = 0; // For title color pulsing
        this.stargateRotation = 0; // For background stargate rotation
        
        // Game entities and managers will be initialized after sprites are loaded
        this.initializeGameObjects();
    }

    async initializeGameObjects() {
        try {
            // Load sprites first
            await this.spriteLoader.loadAll();
            
            // Initialize game objects
            this.starfield = new Starfield(this);
            this.terrain = new Terrain(this);
            this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);
            this.enemyManager = new EnemyManager(this);
            this.powerUpManager = new PowerUpManager(this);
            this.audioManager = new AudioManager();
            
            // Setup input handlers
            this.keys = {};
            this.setupInputHandlers();
            
            // Game loop
            this.lastTime = 0;
            this.accumulator = 0;
            this.isLevelUp = false;
            this.levelUpStartTime = 0;
            this.levelUpDuration = 2; // Duration for each message in seconds
            this.levelUpPhase = 0; // 0: LEVEL UP!, 1: Get Ready, 2: Ready Player One
            this.levelUpTimer = 0;
            this.isDeathSequence = false;
            this.deathSequenceTimer = 0;
            
            // Start the game
            this.start();
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }

    setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && this.state === GAME_STATES.START) {
                console.log('Space pressed, transitioning from START to PLAYING state');
                this.state = GAME_STATES.PLAYING;
                console.log('New game state:', this.state);
                this.audioManager.playBackgroundMusic(GAME_STATES.PLAYING);
            } else if (e.key.toLowerCase() === 'r') {
                if (this.state === GAME_STATES.GAME_OVER) {
                    this.restart();
                } else if (this.state === GAME_STATES.PLAYING) {
                    // Toggle direction
                    this.player.toggleDirection();
                    // Clear power-ups
                    this.powerUpManager.clearPowerUps();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.shieldTime = 0;
        this.deathTimer = 0;
        this.readyTimer = 0;
        this.isRespawned = false;
        this.isLevelUp = false;
        this.levelUpPhase = 0;
        this.levelUpTimer = 0;
        this.isDeathSequence = false;
        this.deathSequenceTimer = 0;

        // Reset game objects
        this.starfield = new Starfield(this);
        this.terrain = new Terrain(this);
        this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);
        this.enemyManager = new EnemyManager(this);
        this.powerUpManager = new PowerUpManager(this);
        
        // Stop all current sounds before creating new AudioManager
        this.audioManager.stopAll();
        this.audioManager = new AudioManager();

        // Reset to start screen instead of playing
        this.state = GAME_STATES.START;
        this.audioManager.playBackgroundMusic('START');
    }

    start() {
        console.log('Game starting, initial state:', this.state);
        this.audioManager.playBackgroundMusic('START');
        this.gameLoop();
    }

    gameLoop(currentTime = 0) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update game state
        this.update(deltaTime);

        // Render game
        this.render();

        // Request next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        if (this.state === GAME_STATES.START) {
            // Update splash screen fade effect
            this.splashAlpha += this.splashFadeDirection * deltaTime * this.splashFadeSpeed;
            if (this.splashAlpha <= 0.3) {
                this.splashAlpha = 0.3;
                this.splashFadeDirection = 1;
            } else if (this.splashAlpha >= 1) {
                this.splashAlpha = 1;
                this.splashFadeDirection = -1;
            }

            // Update title pulse and stargate rotation
            this.titlePulse = (this.titlePulse + deltaTime) % (Math.PI * 2);
            this.stargateRotation = (this.stargateRotation + deltaTime * 15) % 360; // Slower rotation (15 degrees per second)
            return; // Don't process any game logic during splash screen
        }
        
        if (this.state === GAME_STATES.GAME_OVER) {
            return; // Don't process any game logic during game over
        }

        // Only process game logic if we're in PLAYING state
        if (this.state === GAME_STATES.PLAYING) {
            console.log('Game state:', this.state, 'Level:', this.level, 'Player alive:', !this.player.isDead);
            // Update starfield
            this.starfield.update(deltaTime);

            // Handle level-up sequence
            if (this.isLevelUp) {
                console.log('Level up sequence active, phase:', this.levelUpPhase);
                this.levelUpTimer += deltaTime;
                
                if (this.levelUpTimer >= this.levelUpDuration) {
                    this.levelUpTimer = 0;
                    this.levelUpPhase++;
                    
                    if (this.levelUpPhase === 1) {
                        // Reset player position and clear enemies/power-ups
                        this.player.reset();
                        this.enemyManager.clearEnemies();
                        this.powerUpManager.clearPowerUps();
                    } else if (this.levelUpPhase === 2) {
                        // Complete level up sequence
                        this.isLevelUp = false;
                        this.levelUpPhase = 0;
                        this.levelUpTimer = 0;
                        this.player.isDead = false;
                        this.state = GAME_STATES.PLAYING;
                    }
                }
                return; // Pause game during level-up sequence
            }

            // Update player
            this.player.update(deltaTime, this.keys);

            // Only update terrain and managers if player is alive
            if (!this.player.isDead) {
                // Update terrain
                this.terrain.update(deltaTime);

                // Update managers
                this.enemyManager.update(deltaTime);
                this.powerUpManager.update(deltaTime);

                // Check collisions
                this.checkCollisions();
            }

            // Update shield time
            if (this.shieldTime > 0) {
                this.shieldTime -= deltaTime;
            }

            // Update death sequence only if not on last life
            if (this.player.isDead && this.lives > 0) {
                this.deathTimer += deltaTime;
                if (this.deathTimer >= this.deathDelay) {
                    // Reset player position immediately after explosion
                    if (!this.player.isRespawned) {
                        this.player.reset();
                        this.player.isRespawned = true;
                        this.enemyManager.clearEnemies();
                        this.powerUpManager.clearPowerUps();
                    }

                    this.readyTimer += deltaTime;
                    if (this.readyTimer >= this.readyDelay) {
                        // Reset death sequence timers and flags
                        this.deathTimer = 0;
                        this.readyTimer = 0;
                        this.player.isRespawned = false;
                        this.player.isDead = false;
                        
                        // Resume gameplay
                        this.state = GAME_STATES.PLAYING;
                    }
                }
            }
        }
    }

    checkCollisions() {
        // Don't check collisions if player is already dead
        if (this.player.isDead) return;

        // Check terrain collision
        if (this.terrain.checkCollision(this.player)) {
            this.handlePlayerDeath();
            return;
        }

        // Check enemy collisions
        if (this.enemyManager.checkCollisions(this.player)) {
            this.handlePlayerDeath();
            return;
        }

        // Check power-up collisions
        this.powerUpManager.checkCollisions(this.player);
    }

    handlePlayerDeath() {
        // Don't die if shield is active or during stargate effect
        if (this.shieldTime > 0 || this.powerUpManager.stargateEffect) return;

        this.lives--;
        this.audioManager.playExplosion();
        
        // Clear enemies and power-ups immediately
        this.enemyManager.clearEnemies();
        this.powerUpManager.clearPowerUps();
        
        // Handle final death differently
        if (this.lives <= 0) {
            this.player.die(); // This will trigger the big explosion
            // Wait for the big explosion animation to complete before showing game over
            setTimeout(() => {
                this.state = GAME_STATES.GAME_OVER;
                this.audioManager.playBackgroundMusic('GAME_OVER');
            }, 3000);
        } else {
            // Regular death
            this.player.die();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render based on game state
        switch (this.state) {
            case GAME_STATES.START:
                // Draw starfield first
                this.starfield.render(this.ctx);
                this.renderStartScreen();
                break;
            case GAME_STATES.PLAYING:
                // Draw starfield first
                this.starfield.render(this.ctx);
                this.renderGame();
                // Render level-up messages if in level-up sequence
                if (this.isLevelUp) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = '48px Arial';
                    this.ctx.textAlign = 'center';
                    
                    switch (this.levelUpPhase) {
                        case 0:
                            this.ctx.fillText('LEVEL UP!', this.canvas.width / 2, this.canvas.height / 2);
                            break;
                        case 1:
                            this.ctx.fillText(`Get Ready for Level ${this.level}`, this.canvas.width / 2, this.canvas.height / 2);
                            this.ctx.font = '36px Arial';
                            this.ctx.fillText('READY PLAYER ONE', this.canvas.width / 2, this.canvas.height / 2 + 50);
                            break;
                    }
                }
                break;
            case GAME_STATES.GAME_OVER:
                // Draw starfield first
                this.starfield.render(this.ctx);
                this.renderGameOver();
                break;
        }
    }

    renderStartScreen() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw rotating stargate in center
        const stargate = this.spriteLoader.getSprite('stargate');
        const vortex = this.spriteLoader.getSprite('vortex');
        let stargateSize = 0;
        
        if (stargate) {
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            
            // Calculate stargate size (scale down only)
            const maxStargateSize = this.canvas.width / 3;
            const stargateScale = Math.min(1, maxStargateSize / stargate.width);
            stargateSize = stargate.width * stargateScale;
            
            // Draw stargate with slow rotation
            this.ctx.rotate(this.stargateRotation * Math.PI / 180);
            this.ctx.drawImage(
                stargate.image,
                -stargateSize/2,
                -stargateSize/2,
                stargateSize,
                stargateSize
            );

            // Draw vortex with faster rotation
            if (vortex) {
                this.ctx.rotate(this.stargateRotation * Math.PI / 180); // Additional rotation for 2x speed
                this.ctx.drawImage(
                    vortex.image,
                    -stargateSize/2,
                    -stargateSize/2,
                    stargateSize,
                    stargateSize
                );
            }

            // Add glow effect
            const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, stargateSize/2);
            glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
            glowGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.15)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, stargateSize/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }

        // Draw Viper in center
        const viper = this.spriteLoader.getSprite('viper');
        if (viper) {
            this.ctx.save();
            
            // Enable high-quality image rendering
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Scale Viper to be 25% wider than the stargate
            const targetViperWidth = stargateSize * 1.25;
            const viperScale = targetViperWidth / viper.width;
            const scaledViperWidth = viper.width * viperScale;
            const scaledViperHeight = viper.height * viperScale;
            
            // Draw scaled Viper, centered
            this.ctx.translate(centerX, centerY);
            this.ctx.drawImage(
                viper.image,
                -scaledViperWidth/2,
                -scaledViperHeight/2,
                scaledViperWidth,
                scaledViperHeight
            );
            this.ctx.restore();
        }

        // Draw game title above stargate
        this.ctx.fillStyle = '#ff0000';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw main title with shadow for depth
        this.ctx.font = '80px "Press Start 2P", "Orbitron", monospace';
        this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('VIPER', centerX, centerY - 200);

        // Reset shadow for other text
        this.ctx.shadowColor = 'transparent';
        
        // Draw fading "Press Space" text below stargate
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.splashAlpha})`;
        this.ctx.fillText('PRESS SPACE TO START', centerX, centerY + 200);
    }

    renderGame() {
        // Draw game elements
        this.terrain.render(this.ctx);
        this.player.render(this.ctx);
        this.enemyManager.render(this.ctx);
        this.powerUpManager.render(this.ctx);

        // Draw dashboard
        this.renderDashboard();
    }

    renderDashboard() {
        const padding = 20;
        const topMargin = 20;
        
        // Draw score
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, padding, topMargin + 10);
        
        // Draw lives as tiny Vipers
        const sprite = this.spriteLoader.getSprite('viper');
        if (sprite) {
            const viperWidth = 30; // Small fixed size for UI
            const viperHeight = (sprite.height / sprite.width) * viperWidth;
            const spacing = viperWidth + 10;
            
            for (let i = 0; i < this.lives; i++) {
                this.ctx.save();
                // Enable high-quality image rendering
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.ctx.drawImage(sprite.image, 
                    this.canvas.width - padding - (this.lives - i) * spacing, 
                    topMargin, 
                    viperWidth, 
                    viperHeight
                );
                this.ctx.restore();
            }
        }
        
        // Draw shield meter
        if (this.shieldTime > 0) {
            const meterWidth = 150;
            const meterHeight = 20;
            const x = this.canvas.width / 2 - meterWidth / 2;
            const y = topMargin;
            const fillPercent = Math.max(0, Math.min(1, this.shieldTime / POWER_UP_CONFIG.SHIELD.DURATION));
            
            // Draw meter background
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(x, y, meterWidth, meterHeight);
            
            // Draw meter fill
            const gradient = this.ctx.createLinearGradient(x, y, x + meterWidth * fillPercent, y);
            gradient.addColorStop(0, '#00ffff'); // Bright blue
            gradient.addColorStop(1, '#0066ff'); // Darker blue
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, meterWidth * fillPercent, meterHeight);
            
            // Draw meter border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, meterWidth, meterHeight);
            
            // Draw "SHIELD" text - centered both horizontally and vertically
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle'; // This ensures vertical centering
            this.ctx.fillText('SHIELD', x + meterWidth / 2, y + meterHeight / 2);
        }
        
        this.ctx.restore();
    }

    renderGameOver() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
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
} 