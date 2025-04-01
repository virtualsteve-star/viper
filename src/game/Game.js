import Player from './entities/Player';
import Terrain from './entities/Terrain';
import EnemyManager from './managers/EnemyManager';
import PowerUpManager from './managers/PowerUpManager';
import AudioManager from './managers/AudioManager';
import SpriteLoader from './utils/SpriteLoader';
import Starfield from './entities/Starfield';
import { GAME_STATES, PLAYER_CONFIG, POWER_UP_CONFIG } from './constants';
import InputHandler from './utils/InputHandler';

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
        this.lives = PLAYER_CONFIG.LIVES;
        this.shieldTime = 0;
        this.shots = [];  // Initialize shots array
        
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

        // Add restart text animation properties
        this.restartAlpha = 1;
        this.restartFadeDirection = -1;
        this.restartFadeSpeed = 0.5;

        // Banner animation properties
        this.getReadyAlpha = 0;
        this.getReadyFadeSpeed = 2; // How fast the Get Ready banner fades in/out
        this.getReadyFlashCount = 0;
        this.getReadyMaxFlashes = 3;
        this.getReadyPhase = 0; // 0: fade in, 1: hold, 2: fade out
        this.getReadyTimer = 0;
        this.getReadyHoldTime = 0.5; // How long to hold the banner visible
        
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
            this.inputHandler = new InputHandler();
            
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
        // Remove the old event listeners since InputHandler now handles them
        this.inputHandler = new InputHandler();
    }

    restart() {
        this.score = 0;
        this.lives = PLAYER_CONFIG.LIVES;
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
            this.stargateRotation = (this.stargateRotation + deltaTime * 15) % 360;

            // Check for space key to start game
            if (this.inputHandler.isKeyPressed(' ')) {
                this.state = GAME_STATES.GET_READY;
                this.getReadyFlashCount = 0;
                this.getReadyPhase = 0;
                this.getReadyTimer = 0;
                this.getReadyAlpha = 0;
                this.audioManager.playBackgroundMusic(GAME_STATES.PLAYING);
            }
            return;
        }
        
        if (this.state === GAME_STATES.GAME_OVER) {
            // Update restart text fade effect
            this.restartAlpha += this.restartFadeDirection * deltaTime * this.restartFadeSpeed;
            if (this.restartAlpha <= 0.3) {
                this.restartAlpha = 0.3;
                this.restartFadeDirection = 1;
            } else if (this.restartAlpha >= 1) {
                this.restartAlpha = 1;
                this.restartFadeDirection = -1;
            }

            // Check for R key to restart
            if (this.inputHandler.isKeyPressed('r')) {
                this.restart();
            }
            return;
        }

        // Update Get Ready banner animation
        if (this.state === GAME_STATES.GET_READY) {
            // Update starfield during Get Ready
            this.starfield.update(deltaTime);
            
            // Update terrain during Get Ready to ensure smooth transition
            this.terrain.update(deltaTime);
            
            this.getReadyTimer += deltaTime;
            
            switch (this.getReadyPhase) {
                case 0: // Fade in
                    this.getReadyAlpha += deltaTime * this.getReadyFadeSpeed;
                    if (this.getReadyAlpha >= 1) {
                        this.getReadyAlpha = 1;
                        this.getReadyPhase = 1;
                        this.getReadyTimer = 0;
                    }
                    break;
                case 1: // Hold
                    if (this.getReadyTimer >= this.getReadyHoldTime) {
                        this.getReadyPhase = 2;
                        this.getReadyTimer = 0;
                    }
                    break;
                case 2: // Fade out
                    this.getReadyAlpha -= deltaTime * this.getReadyFadeSpeed;
                    if (this.getReadyAlpha <= 0) {
                        this.getReadyAlpha = 0;
                        this.getReadyPhase = 0;
                        this.getReadyTimer = 0;
                        this.getReadyFlashCount++;
                        
                        if (this.getReadyFlashCount >= this.getReadyMaxFlashes) {
                            // Start the game after all flashes
                            this.state = GAME_STATES.PLAYING;
                            this.getReadyFlashCount = 0;
                            this.getReadyPhase = 0;
                            this.getReadyTimer = 0;
                            this.getReadyAlpha = 0;
                            
                            // If this was a level up sequence, clear the level up flag
                            if (this.isLevelUp) {
                                this.isLevelUp = false;
                                this.levelUpPhase = 0;
                                this.levelUpTimer = 0;
                            }
                        }
                    }
                    break;
            }
            return; // Don't process other game logic during Get Ready
        }

        // Only process game logic if we're in PLAYING state
        if (this.state === GAME_STATES.PLAYING) {
            console.log('Game state:', this.state, 'Level:', this.level, 'Player alive:', !this.player.isDead);
            // Update starfield
            this.starfield.update(deltaTime);

            // Handle level-up sequence
            if (this.state === GAME_STATES.PLAYING && this.isLevelUp) {
                // Only transition to GET_READY if there's no active stargate effect
                if (!this.powerUpManager.stargateEffect) {
                    // Reset player position and clear enemies/power-ups
                    this.player.reset();
                    this.enemyManager.clearEnemies();
                    this.powerUpManager.clearPowerUps();
                    
                    // Start the Get Ready sequence for the new level
                    this.state = GAME_STATES.GET_READY;
                    this.getReadyFlashCount = 0;
                    this.getReadyPhase = 0;
                    this.getReadyTimer = 0;
                    this.getReadyAlpha = 0;
                    return;
                }
            }

            // Update player with input handler
            this.player.update(deltaTime, this.inputHandler);

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

            // Update death sequence
            if (this.player.isDead) {
                this.deathTimer += deltaTime;
                if (this.deathTimer >= this.deathDelay) {
                    // Only reset player if we still have lives
                    if (this.lives > 0 && !this.player.isRespawned) {
                        this.player.reset();
                        this.player.isRespawned = true;
                        this.enemyManager.clearEnemies();
                        this.powerUpManager.clearPowerUps();
                    }

                    this.readyTimer += deltaTime;
                    if (this.readyTimer >= this.readyDelay) {
                        // Only reset death sequence if we still have lives
                        if (this.lives > 0) {
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
        
        // Handle final death
        if (this.lives <= 0) {
            this.player.die(); // This will trigger the big explosion
            // Wait for the big explosion animation to complete before showing game over
            setTimeout(() => {
                this.state = GAME_STATES.GAME_OVER;
                this.audioManager.playBackgroundMusic('GAME_OVER');
            }, 3000);
        } else {
            // Regular death with lives remaining
            this.player.die();
        }
    }

    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Always render starfield first
        this.starfield.render(this.ctx);

        // Render game elements based on state
        switch (this.state) {
            case GAME_STATES.START:
                this.renderStartScreen();
                break;
            case GAME_STATES.GET_READY:
                // Draw game elements
                this.terrain.render(this.ctx);
                this.player.render(this.ctx);
                this.renderDashboard();
                
                // Then draw the Get Ready banner on top
                const getReady = this.spriteLoader.getSprite('getReady');
                if (getReady) {
                    this.ctx.save();
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    // Scale banner to be about 30% of canvas width
                    const bannerScale = this.canvas.width * 0.3 / getReady.width;
                    const bannerWidth = getReady.width * bannerScale;
                    const bannerHeight = getReady.height * bannerScale;
                    
                    // Center the banner
                    this.ctx.globalAlpha = this.getReadyAlpha;
                    this.ctx.drawImage(
                        getReady.image,
                        this.canvas.width/2 - bannerWidth/2,
                        this.canvas.height/2 - bannerHeight/2,
                        bannerWidth,
                        bannerHeight
                    );
                    
                    this.ctx.restore();
                }
                break;
            case GAME_STATES.PLAYING:
                // Render terrain
                this.terrain.render(this.ctx);

                // Render player
                this.player.render(this.ctx);

                // Render enemies
                if (this.enemyManager) {
                    this.enemyManager.render(this.ctx);
                }

                // Render power-ups
                if (this.powerUpManager) {
                    this.powerUpManager.render(this.ctx);
                }

                // Render shots last so they appear on top
                if (this.shots) {
                    this.shots.forEach(shot => shot.render(this.ctx));
                }

                // Render dashboard with sci-fi style
                this.renderDashboard();
                break;
            case GAME_STATES.GAME_OVER:
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

        // Draw game title banner above stargate
        const viperTitle = this.spriteLoader.getSprite('viperTitle');
        if (viperTitle) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Scale title to be about 40% of canvas width
            const titleScale = this.canvas.width * 0.4 / viperTitle.width;
            const titleWidth = viperTitle.width * titleScale;
            const titleHeight = viperTitle.height * titleScale;
            
            // Draw title with shadow for depth
            this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            
            this.ctx.drawImage(
                viperTitle.image,
                centerX - titleWidth/2,
                centerY - 200 - titleHeight/2,
                titleWidth,
                titleHeight
            );
            
            this.ctx.restore();
        }

        // Draw fading "Press Space" text below stargate
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.splashAlpha})`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PRESS SPACE TO START', centerX, centerY + 250);
    }

    renderDashboard() {
        const padding = 20;
        const topMargin = 20;
        
        // Draw score with sci-fi style
        this.ctx.save();
        this.ctx.font = 'bold 36px "Orbitron", "Arial", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Create gradient for score text
        const scoreGradient = this.ctx.createLinearGradient(padding, topMargin, padding, topMargin + 40);
        scoreGradient.addColorStop(0, '#00ffff');
        scoreGradient.addColorStop(0.5, '#0088ff');
        scoreGradient.addColorStop(1, '#0044ff');
        
        // Draw score with glow effect
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = scoreGradient;
        this.ctx.fillText(`Score: ${this.score}`, padding, topMargin);
        this.ctx.restore();
        
        // Draw lives as tiny Vipers in top right
        const sprite = this.spriteLoader.getSprite('viper');
        if (sprite && this.lives > 0) {
            const viperWidth = 38; // Increased from 30 to 38 (about 25% larger)
            const viperHeight = (sprite.height / sprite.width) * viperWidth;
            const spacing = viperWidth + 8; // Increased spacing to account for larger icons
            
            for (let i = 0; i < this.lives; i++) {
                this.ctx.save();
                // Enable high-quality image rendering
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // Position from right edge
                const x = this.canvas.width - padding - ((i + 1) * spacing);
                
                // Add glow effect to viper icons
                this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
                this.ctx.shadowBlur = 5;
                
                this.ctx.drawImage(sprite.image, 
                    x, 
                    topMargin, 
                    viperWidth, 
                    viperHeight
                );
                this.ctx.restore();
            }
        }
        
        // Draw shield meter if active
        if (this.shieldTime > 0) {
            this.ctx.save();
            const meterWidth = 150;
            const meterHeight = 20;
            const x = this.canvas.width / 2 - meterWidth / 2;
            const y = topMargin;
            const fillPercent = Math.max(0, Math.min(1, this.shieldTime / POWER_UP_CONFIG.SHIELD.DURATION));
            
            // Draw meter background
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(x, y, meterWidth, meterHeight);
            
            // Draw meter fill with gradient
            const gradient = this.ctx.createLinearGradient(x, y, x + meterWidth * fillPercent, y);
            gradient.addColorStop(0, '#00ffff'); // Bright blue
            gradient.addColorStop(1, '#0066ff'); // Darker blue
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, meterWidth * fillPercent, meterHeight);
            
            // Draw meter border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, meterWidth, meterHeight);
            
            // Draw "SHIELD" text
            this.ctx.font = 'bold 14px "Orbitron", "Arial", sans-serif';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('SHIELD', x + meterWidth / 2, y + meterHeight / 2);
            this.ctx.restore();
        }
    }

    renderGameOver() {
        // Draw terrain
        this.terrain.render(this.ctx);
        
        // Draw game over banner
        const gameOver = this.spriteLoader.getSprite('gameOver');
        if (gameOver) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Scale banner to be about 40% of canvas width
            const bannerScale = this.canvas.width * 0.4 / gameOver.width;
            const bannerWidth = gameOver.width * bannerScale;
            const bannerHeight = gameOver.height * bannerScale;
            
            // Add pulse effect
            const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1; // Slower pulse than level up
            const finalWidth = bannerWidth * pulseScale;
            const finalHeight = bannerHeight * pulseScale;
            
            // Center the banner
            this.ctx.drawImage(
                gameOver.image,
                this.canvas.width/2 - finalWidth/2,
                this.canvas.height/2 - finalHeight/2,
                finalWidth,
                finalHeight
            );
            
            this.ctx.restore();
        }

        // Draw flashing restart instruction much lower
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.restartAlpha})`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height - 100);
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

    handleKeyPress(event) {
        if (event.code === 'Space') {
            if (this.state === GAME_STATES.START) {
                // Start the Get Ready sequence
                this.state = GAME_STATES.GET_READY;
                this.getReadyFlashCount = 0;
                this.getReadyPhase = 0;
                this.getReadyTimer = 0;
                this.getReadyAlpha = 0;
            }
        } else if (event.code === 'KeyR' && this.state === GAME_STATES.GAME_OVER) {
            this.reset();
        }
    }
} 