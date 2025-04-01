import Player from './entities/Player';
import Terrain from './entities/Terrain';
import EnemyManager from './managers/EnemyManager';
import PowerUpManager from './managers/PowerUpManager';
import AudioManager from './managers/AudioManager';
import SpriteLoader from './utils/SpriteLoader';
import Starfield from './entities/Starfield';
import GameStateManager from './managers/GameStateManager';
import { GAME_STATES, PLAYER_CONFIG, POWER_UP_CONFIG } from './constants';
import InputHandler from './utils/InputHandler';

export default class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Initialize sprite loader
        this.spriteLoader = new SpriteLoader();
        
        // Game state
        this.stateManager = new GameStateManager(this);
        this.score = 0;
        this.level = 1;
        this.lives = PLAYER_CONFIG.LIVES;
        this.shieldTime = 0;
        this.shots = [];  // Initialize shots array
        
        // Bind the key press handlers to this instance
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Death sequence
        this.deathTimer = 0;
        this.deathDelay = 2; // Seconds to wait after death before showing Ready Player One
        this.readyTimer = 0;
        this.readyDelay = 2; // Seconds to show Ready Player One
        
        // Initialize splash screen properties
        this.splashAlpha = 1.0;
        this.splashFadeDirection = -1;
        this.splashFadeSpeed = 2.0;
        this.titlePulse = 0.0;
        this.stargateRotation = 0.0; // Initialize stargate rotation
        
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
        
        // Game loop
        this.lastTime = 0;
        this.accumulator = 0;
        this.isLevelUp = false;
        this.levelUpStartTime = 0;
        this.levelUpDuration = 2;
        this.levelUpPhase = 0;
        this.levelUpTimer = 0;
        this.isDeathSequence = false;
        this.deathSequenceTimer = 0;
        
        // Initialize game objects and start the game
        this.initializeGameObjects();
    }

    async initializeGameObjects() {
        try {
            console.log('Starting game initialization...'); // Debug log
            // Load sprites first
            await this.spriteLoader.loadAll();
            console.log('Sprites loaded successfully'); // Debug log
            
            // Initialize game objects
            this.starfield = new Starfield(this);
            this.terrain = new Terrain(this);
            this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);
            this.enemyManager = new EnemyManager(this);
            this.powerUpManager = new PowerUpManager(this);
            this.audioManager = new AudioManager();
            this.inputHandler = new InputHandler();
            console.log('Game objects initialized'); // Debug log
            
            // Setup input handlers
            this.setupInputHandlers();
            console.log('Input handlers setup complete'); // Debug log
            
            // Start the game
            this.start();
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }

    setupInputHandlers() {
        console.log('Setting up input handlers...'); // Debug log
        // Remove any existing event listeners
        window.removeEventListener('keydown', this.handleKeyPress);
        window.removeEventListener('keyup', this.handleKeyUp);
        console.log('Removed existing event listeners'); // Debug log
        
        // Add key press handler
        window.addEventListener('keydown', this.handleKeyPress);
        window.addEventListener('keyup', this.handleKeyUp);
        console.log('Added new event listeners'); // Debug log
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

        // Reset splash screen properties
        this.splashAlpha = 1.0;
        this.splashFadeDirection = -1;
        this.splashFadeSpeed = 2.0;
        this.titlePulse = 0.0;
        this.stargateRotation = 0.0;

        // Reset game objects
        this.starfield = new Starfield(this);
        this.terrain = new Terrain(this);
        this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);
        this.enemyManager = new EnemyManager(this);
        this.powerUpManager = new PowerUpManager(this);
        
        // Stop all current sounds before creating new AudioManager
        this.audioManager.stopAll();
        this.audioManager = new AudioManager();

        // Reset to start screen
        this.stateManager.setState(GAME_STATES.START);
        this.audioManager.playBackgroundMusic('START');
    }

    start() {
        console.log('Game starting, initial state:', this.stateManager.state);
        console.log('Audio manager:', this.audioManager); // Debug log
        console.log('Input handler:', this.inputHandler); // Debug log
        console.log('State manager:', this.stateManager); // Debug log
        this.gameLoop();
    }

    gameLoop(currentTime) {
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update game state
        this.stateManager.update(deltaTime);

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render current state
        this.stateManager.render(this.ctx);

        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Delegate state updates to GameStateManager
        this.stateManager.update(deltaTime);
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
        
        // Handle final death
        if (this.lives <= 0) {
            this.player.die(); // This will trigger the big explosion
            // Wait for the big explosion animation to complete before showing game over
            setTimeout(() => {
                this.stateManager.setState(GAME_STATES.GAME_OVER);
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

        // Delegate rendering to GameStateManager
        this.stateManager.render(this.ctx);

        // Render dashboard
        this.renderDashboard();
    }

    renderDashboard() {
        // Draw score and level on one line with sci-fi styling
        this.ctx.font = 'bold 24px "Orbitron", Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        
        // Add pulsing blue effect
        const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        const blueColor = `rgba(0, ${196 + Math.sin(Date.now() * 0.005) * 59}, 255, 1)`;
        
        // Draw score and level
        this.ctx.fillStyle = blueColor;
        this.ctx.fillText(`S: ${this.score.toString().padStart(3, '0')}    L: ${this.level}`, 20, 30);

        // Draw lives
        const viper = this.spriteLoader.getSprite('viper');
        if (viper) {
            const viperWidth = 30;
            const spacing = viperWidth + 8;
            for (let i = 0; i < this.lives; i++) {
                this.ctx.drawImage(
                    viper.image,
                    this.canvas.width - 20 - (i + 1) * spacing,
                    20,
                    viperWidth,
                    viperWidth * (viper.height / viper.width)
                );
            }
        }

        // Draw shield indicator if active
        if (this.shieldTime > 0) {
            const shieldWidth = 200;
            const shieldHeight = 25;  // Slightly reduced height to better match screenshot
            const shieldX = this.canvas.width / 2 - shieldWidth / 2;
            const shieldY = 10;  // Moved up to properly frame the text at y=30

            // Draw shield background with transparency FIRST
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);

            // Draw shield meter with pulsing blue
            const shieldPercent = this.shieldTime / 10;
            this.ctx.fillStyle = blueColor;
            this.ctx.fillRect(shieldX, shieldY, shieldWidth * shieldPercent, shieldHeight);

            // Draw "SHIELD" text ON TOP
            this.ctx.font = 'bold 24px "Orbitron", Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SHIELD', this.canvas.width / 2, 30);
        }
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
        console.log('Game handleKeyPress:', event.code); // Debug log
        console.log('Current game state:', this.stateManager.state); // Debug log
        console.log('Input handler state:', this.inputHandler.keys); // Debug log
        this.inputHandler.handleKeyDown(event);
        this.stateManager.handleInput(event);
    }

    handleKeyUp(event) {
        console.log('Game handleKeyUp:', event.code); // Debug log
        console.log('Input handler state:', this.inputHandler.keys); // Debug log
        this.inputHandler.handleKeyUp(event);
    }
} 