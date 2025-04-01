import { GAME_STATES } from '../constants';

export default class GameStateManager {
    constructor(game) {
        console.log('GameStateManager constructor called'); // Debug log
        this.game = game;
        this.state = GAME_STATES.START;
        this.previousState = null;
        console.log('Initial state set to:', this.state); // Debug log
        
        // State-specific timers and flags
        this.stateTimers = {
            [GAME_STATES.GET_READY]: {
                timer: 0,
                phase: 0,
                flashCount: 0,
                alpha: 0
            },
            [GAME_STATES.GAME_OVER]: {
                restartAlpha: 1,
                fadeDirection: -1
            },
            [GAME_STATES.LEVEL_UP]: {
                timer: 0,
                phase: 0,
                alpha: 0
            }
        };

        // Track state transitions
        this.transitioning = false;
        this.transitionTimer = 0;
        this.transitionDuration = 0.5; // Half second transition
        console.log('GameStateManager initialized'); // Debug log
    }

    setState(newState) {
        console.log('setState called with:', newState); // Debug log
        console.log('Current state:', this.state); // Debug log
        console.log('Is transitioning:', this.transitioning); // Debug log
        
        if (this.state !== newState && !this.transitioning) {
            console.log('Starting state transition...'); // Debug log
            this.transitioning = true;
            this.transitionTimer = 0;
            this.onExitState(this.state);
            this.previousState = this.state;
            this.state = newState;
            this.onEnterState(newState);
            console.log('State transition complete. New state:', this.state); // Debug log
        } else {
            console.log('State transition skipped - same state or already transitioning'); // Debug log
        }
    }

    onEnterState(state) {
        console.log('Entering state:', state); // Debug log
        switch (state) {
            case GAME_STATES.START:
                this.game.audioManager.playBackgroundMusic('START');
                // Initialize game objects if not already done
                if (!this.game.player) {
                    this.game.initializeGameObjects();
                }
                break;
            case GAME_STATES.GET_READY:
                this.resetGetReadyState();
                // Reset player position first
                this.game.player.reset();
                // Clear any existing enemies or power-ups
                this.game.enemyManager.clearEnemies();
                this.game.powerUpManager.clearPowerUps();
                // Only play background music if coming from START state
                if (this.previousState === GAME_STATES.START) {
                    this.game.audioManager.playBackgroundMusic('PLAYING');
                }
                // Ensure stargate effect is cleared
                if (this.game.powerUpManager) {
                    this.game.powerUpManager.stargateEffect = null;
                }
                break;
            case GAME_STATES.PLAYING:
                console.log('Entering PLAYING state'); // Debug log
                // Only play background music if coming from START state
                if (this.previousState === GAME_STATES.START) {
                    this.game.audioManager.playBackgroundMusic('PLAYING');
                }
                // Reset all state flags
                this.game.isLevelUp = false;
                this.game.levelUpPhase = 0;
                this.game.levelUpTimer = 0;
                this.game.isDeathSequence = false;
                this.game.deathSequenceTimer = 0;
                this.game.player.isDead = false;
                this.game.player.isRespawned = false;
                // Ensure stargate effect is cleared
                if (this.game.powerUpManager) {
                    this.game.powerUpManager.stargateEffect = null;
                }
                break;
            case GAME_STATES.LEVEL_UP:
                this.resetLevelUpState();
                break;
            case GAME_STATES.GAME_OVER:
                this.resetGameOverState();
                break;
        }
    }

    onExitState(state) {
        switch (state) {
            case GAME_STATES.PLAYING:
                this.game.enemyManager.clearEnemies();
                this.game.powerUpManager.clearPowerUps();
                break;
            case GAME_STATES.GAME_OVER:
                this.game.audioManager.stopAll();
                break;
        }
    }

    resetGetReadyState() {
        const state = this.stateTimers[GAME_STATES.GET_READY];
        state.timer = 0;
        state.phase = 0;
        state.flashCount = 0;
        state.alpha = 0;
    }

    resetGameOverState() {
        const state = this.stateTimers[GAME_STATES.GAME_OVER];
        state.restartAlpha = 1;
        state.fadeDirection = -1;
    }

    resetLevelUpState() {
        const state = this.stateTimers[GAME_STATES.LEVEL_UP];
        state.timer = 0;
        state.phase = 0;
        state.alpha = 0;
    }

    update(deltaTime) {
        // Update transition if active
        if (this.transitioning) {
            this.transitionTimer += deltaTime;
            if (this.transitionTimer >= this.transitionDuration) {
                this.transitioning = false;
            }
        }

        switch (this.state) {
            case GAME_STATES.START:
                this.updateStartScreen(deltaTime);
                break;
            case GAME_STATES.GET_READY:
                this.updateGetReady(deltaTime);
                break;
            case GAME_STATES.PLAYING:
                this.updatePlaying(deltaTime);
                break;
            case GAME_STATES.LEVEL_UP:
                this.updateLevelUp(deltaTime);
                break;
            case GAME_STATES.GAME_OVER:
                this.updateGameOver(deltaTime);
                break;
        }
    }

    updateStartScreen(deltaTime) {
        // Ensure splashAlpha is a valid number
        if (isNaN(this.game.splashAlpha)) {
            this.game.splashAlpha = 1.0;
        }

        // Ensure stargateRotation is a valid number
        if (isNaN(this.game.stargateRotation)) {
            this.game.stargateRotation = 0;
        }

        // Update splash screen fade effect
        this.game.splashAlpha += this.game.splashFadeDirection * deltaTime * 0.5; // Slower fade speed
        
        // Clamp the alpha value between 0.3 and 1.0
        if (this.game.splashAlpha <= 0.3) {
            this.game.splashAlpha = 0.3;
            this.game.splashFadeDirection = 1;
        } else if (this.game.splashAlpha >= 1.0) {
            this.game.splashAlpha = 1.0;
            this.game.splashFadeDirection = -1;
        }

        // Update title pulse and stargate rotation
        this.game.titlePulse = (this.game.titlePulse + deltaTime) % (Math.PI * 2);
        this.game.stargateRotation = (this.game.stargateRotation + deltaTime * 45) % 360; // Faster rotation (45 degrees per second)
    }

    updateGetReady(deltaTime) {
        const state = this.stateTimers[GAME_STATES.GET_READY];
        state.timer += deltaTime;
        
        console.log('Get Ready update:', {
            phase: state.phase,
            timer: state.timer,
            alpha: state.alpha,
            flashCount: state.flashCount
        });
        
        switch (state.phase) {
            case 0: // Fade in
                state.alpha += deltaTime * this.game.getReadyFadeSpeed;
                if (state.alpha >= 1) {
                    state.alpha = 1;
                    state.phase = 1;
                    state.timer = 0;
                    console.log('Get Ready: Fade in complete, starting hold phase');
                }
                break;
            case 1: // Hold
                if (state.timer >= this.game.getReadyHoldTime) {
                    state.phase = 2;
                    state.timer = 0;
                    console.log('Get Ready: Hold complete, starting fade out phase');
                }
                break;
            case 2: // Fade out
                state.alpha -= deltaTime * this.game.getReadyFadeSpeed;
                if (state.alpha <= 0) {
                    state.alpha = 0;
                    state.phase = 0;
                    state.timer = 0;
                    state.flashCount++;
                    console.log('Get Ready: Fade out complete, flash count:', state.flashCount);
                    
                    if (state.flashCount >= this.game.getReadyMaxFlashes) {
                        console.log('Get Ready: Max flashes reached, transitioning to PLAYING');
                        this.setState(GAME_STATES.PLAYING);
                    }
                }
                break;
        }
    }

    updatePlaying(deltaTime) {
        // Update starfield
        this.game.starfield.update(deltaTime);

        // Update player
        this.game.player.update(deltaTime, this.game.inputHandler);

        // Only update terrain and managers if player is alive
        if (!this.game.player.isDead) {
            this.game.terrain.update(deltaTime);
            this.game.enemyManager.update(deltaTime);
            this.game.powerUpManager.update(deltaTime);
            this.game.checkCollisions();
        }

        // Update shield time
        if (this.game.shieldTime > 0) {
            this.game.shieldTime -= deltaTime;
        }

        // Update death sequence
        if (this.game.player.isDead) {
            this.updateDeathSequence(deltaTime);
        }
    }

    updateLevelUp(deltaTime) {
        const state = this.stateTimers[GAME_STATES.LEVEL_UP];
        state.timer += deltaTime;
        
        // Update stargate effect if it exists
        if (this.game.powerUpManager.stargateEffect) {
            const effect = this.game.powerUpManager.stargateEffect;
            effect.time += deltaTime;
            effect.vortexRotation = (effect.vortexRotation || 0) + Math.PI * 2 * deltaTime;
            effect.rotation = (effect.rotation || 0) + Math.PI * deltaTime;
            
            // Always expand the radius during the effect
            const maxRadius = Math.max(this.game.canvas.width, this.game.canvas.height) * 1.5;
            effect.radius = Math.min(
                effect.radius + 500 * deltaTime,
                maxRadius
            );
            
            // Start fading out after 3 seconds
            if (effect.time >= 3.0) {
                effect.opacity = Math.max(0, effect.opacity - deltaTime * 0.7);
            }
        }
        
        switch (state.phase) {
            case 0: // Level up effect
                if (state.timer >= 3.5) { // After level up effect completes
                    // Clear stargate effect
                    this.game.powerUpManager.stargateEffect = null;
                    
                    // Increment level and reset game time
                    this.game.level++;
                    this.game.powerUpManager.gameTime = 0;
                    
                    // Transition to GET_READY
                    this.setState(GAME_STATES.GET_READY);
                }
                break;
        }
    }

    updateDeathSequence(deltaTime) {
        this.game.deathTimer += deltaTime;
        if (this.game.deathTimer >= this.game.deathDelay) {
            if (this.game.lives > 0 && !this.game.player.isRespawned) {
                // Clear enemies and power-ups first
                this.game.enemyManager.clearEnemies();
                this.game.powerUpManager.clearPowerUps();
                
                // Then reset player position and state
                this.game.player.reset();
                this.game.player.isRespawned = true;
                this.game.player.isDead = false;
            }

            this.game.readyTimer += deltaTime;
            if (this.game.readyTimer >= this.game.readyDelay) {
                if (this.game.lives > 0) {
                    this.game.deathTimer = 0;
                    this.game.readyTimer = 0;
                    this.game.player.isRespawned = false;
                }
            }
        }
    }

    updateGameOver(deltaTime) {
        const state = this.stateTimers[GAME_STATES.GAME_OVER];
        state.restartAlpha += state.fadeDirection * deltaTime * this.game.restartFadeSpeed;
        if (state.restartAlpha <= 0.3) {
            state.restartAlpha = 0.3;
            state.fadeDirection = 1;
        } else if (state.restartAlpha >= 1) {
            state.restartAlpha = 1;
            state.fadeDirection = -1;
        }
    }

    handleInput(event) {
        console.log('GameStateManager handleInput called with:', event.code); // Debug log
        console.log('Current state:', this.state); // Debug log
        console.log('Is transitioning:', this.transitioning); // Debug log
        
        // Prevent handling input during transitions
        if (this.transitioning) {
            console.log('Ignoring input during transition'); // Debug log
            return false;
        }
        
        switch (event.code) {
            case 'Space':
                if (this.state === GAME_STATES.START) {
                    console.log('Space pressed in START state, transitioning to GET_READY'); // Debug log
                    this.setState(GAME_STATES.GET_READY);
                    return true;
                } else if (this.state === GAME_STATES.PLAYING) {
                    // Handle shooting in PLAYING state
                    this.game.player.shoot();
                    return true;
                } else {
                    console.log('Space pressed but not in START state'); // Debug log
                }
                break;
            case 'KeyR':
                if (this.state === GAME_STATES.GAME_OVER) {
                    console.log('R pressed in GAME_OVER state, restarting game'); // Debug log
                    this.game.restart();
                    return true;
                } else {
                    console.log('R pressed but not in GAME_OVER state'); // Debug log
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                // Let the input handler handle movement keys
                return false;
        }
        console.log('Input not handled'); // Debug log
        return false;
    }

    render(ctx) {
        // Always render starfield first
        this.game.starfield.render(ctx);

        // Calculate transition alpha if transitioning
        const transitionAlpha = this.transitioning 
            ? 1 - (this.transitionTimer / this.transitionDuration)
            : 1;

        // First render the previous state if transitioning and it's not START or GAME_OVER
        if (this.transitioning && this.previousState && 
            this.previousState !== GAME_STATES.START && 
            this.state !== GAME_STATES.START) {
            ctx.globalAlpha = 1 - transitionAlpha;
            switch (this.previousState) {
                case GAME_STATES.GET_READY:
                    this.renderGetReady(ctx, 1);
                    break;
                case GAME_STATES.PLAYING:
                    this.renderPlaying(ctx, 1);
                    break;
                case GAME_STATES.LEVEL_UP:
                    this.renderLevelUp(ctx, 1);
                    break;
                case GAME_STATES.GAME_OVER:
                    this.renderGameOver(ctx, 1);
                    break;
            }
            ctx.globalAlpha = 1;
        }

        // Then render the current state on top
        switch (this.state) {
            case GAME_STATES.START:
                this.renderStartScreen(ctx, transitionAlpha);
                break;
            case GAME_STATES.GET_READY:
                this.renderGetReady(ctx, transitionAlpha);
                break;
            case GAME_STATES.PLAYING:
                this.renderPlaying(ctx, transitionAlpha);
                break;
            case GAME_STATES.LEVEL_UP:
                this.renderLevelUp(ctx, transitionAlpha);
                break;
            case GAME_STATES.GAME_OVER:
                this.renderGameOver(ctx, transitionAlpha);
                break;
        }
    }

    renderStartScreen(ctx, alpha = 1) {
        const centerX = this.game.canvas.width / 2;
        const centerY = this.game.canvas.height / 2;

        // Draw rotating stargate in center
        const stargate = this.game.spriteLoader.getSprite('stargate');
        const vortex = this.game.spriteLoader.getSprite('vortex');
        let stargateSize = 0;
        
        console.log('Rendering stargate:', {
            stargateLoaded: !!stargate,
            vortexLoaded: !!vortex,
            currentRotation: this.game.stargateRotation,
            deltaTime: this.game.lastTime
        });
        
        if (stargate) {
            // Calculate stargate size (scale down only)
            const maxStargateSize = this.game.canvas.width / 3;
            const stargateScale = Math.min(1, maxStargateSize / stargate.width);
            stargateSize = stargate.width * stargateScale;
            
            // Draw vortex first (behind stargate)
            if (vortex) {
                ctx.save();
                ctx.translate(centerX, centerY);
                const vortexRotation = this.game.stargateRotation * 3 * Math.PI / 180;
                console.log('Drawing vortex with rotation:', vortexRotation);
                ctx.rotate(vortexRotation);
                ctx.drawImage(
                    vortex.image,
                    -stargateSize/2,
                    -stargateSize/2,
                    stargateSize,
                    stargateSize
                );
                ctx.restore();
            }
            
            // Draw stargate with rotation
            ctx.save();
            ctx.translate(centerX, centerY);
            const stargateRotation = this.game.stargateRotation * Math.PI / 180;
            console.log('Drawing stargate with rotation:', stargateRotation);
            ctx.rotate(stargateRotation);
            ctx.drawImage(
                stargate.image,
                -stargateSize/2,
                -stargateSize/2,
                stargateSize,
                stargateSize
            );

            // Add glow effect
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, stargateSize/2);
            glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
            glowGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.15)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, stargateSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }

        // Draw Viper in center
        const viper = this.game.spriteLoader.getSprite('viper');
        if (viper) {
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const targetViperWidth = stargateSize * 1.25;
            const viperScale = targetViperWidth / viper.width;
            const scaledViperWidth = viper.width * viperScale;
            const scaledViperHeight = viper.height * viperScale;
            
            ctx.translate(centerX, centerY);
            ctx.drawImage(
                viper.image,
                -scaledViperWidth/2,
                -scaledViperHeight/2,
                scaledViperWidth,
                scaledViperHeight
            );
            ctx.restore();
        }

        // Draw game title banner
        const viperTitle = this.game.spriteLoader.getSprite('viperTitle');
        if (viperTitle) {
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const titleScale = this.game.canvas.width * 0.4 / viperTitle.width;
            const titleWidth = viperTitle.width * titleScale;
            const titleHeight = viperTitle.height * titleScale;
            
            ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.drawImage(
                viperTitle.image,
                centerX - titleWidth/2,
                centerY - 200 - titleHeight/2,
                titleWidth,
                titleHeight
            );
            
            ctx.restore();
        }

        // Draw fading "Press Space" text
        ctx.font = '24px Arial';
        ctx.fillStyle = `rgba(255, 255, 255, ${this.game.splashAlpha * alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE TO START', centerX, centerY + 250);
    }

    renderGetReady(ctx, alpha = 1) {
        // Draw terrain
        this.game.terrain.render(ctx);
        
        // Draw player
        this.game.player.render(ctx);
        
        // Draw the Get Ready banner
        const getReady = this.game.spriteLoader.getSprite('getReady');
        if (getReady) {
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const bannerScale = this.game.canvas.width * 0.3 / getReady.width;
            const bannerWidth = getReady.width * bannerScale;
            const bannerHeight = getReady.height * bannerScale;
            
            ctx.globalAlpha = this.stateTimers[GAME_STATES.GET_READY].alpha * alpha;
            ctx.drawImage(
                getReady.image,
                this.game.canvas.width/2 - bannerWidth/2,
                this.game.canvas.height/2 - bannerHeight/2,
                bannerWidth,
                bannerHeight
            );
            
            ctx.restore();
        }
    }

    renderPlaying(ctx, alpha = 1) {
        // Render terrain
        this.game.terrain.render(ctx);

        // Render player
        this.game.player.render(ctx);

        // Render enemies
        if (this.game.enemyManager) {
            this.game.enemyManager.render(ctx);
        }

        // Render power-ups
        if (this.game.powerUpManager) {
            this.game.powerUpManager.render(ctx);
        }

        // Render shots
        if (this.game.shots) {
            this.game.shots.forEach(shot => shot.render(ctx));
        }

        // Render dashboard
        this.game.renderDashboard();
    }

    renderLevelUp(ctx, alpha = 1) {
        // Draw terrain
        this.game.terrain.render(ctx);
        
        // Draw player (which should be fading out)
        this.game.player.render(ctx);
        
        // Draw stargate effect if it exists
        if (this.game.powerUpManager.stargateEffect) {
            const effect = this.game.powerUpManager.stargateEffect;
            ctx.save();
            
            // Translate to stargate's position
            ctx.translate(effect.x, effect.y);
            
            // Draw the blue halo effect first
            ctx.globalCompositeOperation = 'screen';
            const radius = effect.radius;
            if (radius > 0 && isFinite(radius)) {
                const gradient = ctx.createRadialGradient(
                    0, 0, radius * 0.1,
                    0, 0, radius
                );
                gradient.addColorStop(0, `rgba(0, 196, 255, ${0.8 * effect.opacity})`);
                gradient.addColorStop(0.3, `rgba(0, 128, 255, ${0.5 * effect.opacity})`);
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
                ctx.globalAlpha = effect.opacity;
                ctx.globalCompositeOperation = 'source-over';
                
                // Draw stargate
                ctx.rotate(effect.rotation * Math.PI / 180);
                ctx.drawImage(
                    stargate.image,
                    -effect.width/2,
                    -effect.height/2,
                    effect.width,
                    effect.height
                );
                
                // Draw vortex with additional rotation
                ctx.rotate(effect.vortexRotation * Math.PI / 180);
                ctx.drawImage(
                    vortex.image,
                    -effect.width/2,
                    -effect.height/2,
                    effect.width,
                    effect.height
                );
            }
            ctx.restore();

            // Draw Level Up banner
            if (effect.showLevelUp) {
                const levelUp = this.game.spriteLoader.getSprite('levelUp');
                if (levelUp) {
                    ctx.save();
                    ctx.globalAlpha = effect.opacity;
                    
                    // Scale banner to be about 30% of canvas width
                    const bannerScale = this.game.canvas.width * 0.3 / levelUp.width;
                    const bannerWidth = levelUp.width * bannerScale;
                    const bannerHeight = levelUp.height * bannerScale;
                    
                    // Center the banner and make it pulse
                    const pulseScale = 1 + Math.sin(effect.time * 5) * 0.1;
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

    renderGameOver(ctx, alpha = 1) {
        // Draw terrain
        this.game.terrain.render(ctx);
        
        // Draw game over banner
        const gameOver = this.game.spriteLoader.getSprite('gameOver');
        if (gameOver) {
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const bannerScale = this.game.canvas.width * 0.4 / gameOver.width;
            const bannerWidth = gameOver.width * bannerScale;
            const bannerHeight = gameOver.height * bannerScale;
            
            // Add pulse effect
            const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
            const finalWidth = bannerWidth * pulseScale;
            const finalHeight = bannerHeight * pulseScale;
            
            // Ensure banner is drawn on top
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(
                gameOver.image,
                this.game.canvas.width/2 - finalWidth/2,
                this.game.canvas.height/2 - finalHeight/2,
                finalWidth,
                finalHeight
            );
            
            ctx.restore();
        }

        // Draw flashing restart instruction
        ctx.font = '24px Arial';
        ctx.fillStyle = `rgba(255, 255, 255, ${this.stateTimers[GAME_STATES.GAME_OVER].restartAlpha * alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('Press R to Restart', this.game.canvas.width / 2, this.game.canvas.height - 100);
    }
} 