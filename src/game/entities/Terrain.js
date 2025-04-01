import { TERRAIN_CONFIG, GAME_STATES } from '../constants';

export default class Terrain {
    constructor(game) {
        this.game = game;
        this.width = game.canvas.width;
        this.height = game.canvas.height;
        this.segments = [];
        this.scrollOffset = 0;
        this.generateTerrain();
    }

    generateTerrain() {
        // Generate initial terrain segments
        const numSegments = Math.ceil(this.width / TERRAIN_CONFIG.SEGMENT_WIDTH) + 4;
        
        // Ensure first few segments are flat for safe starting area
        for (let i = 0; i < 3; i++) {
            this.segments.push({
                x: i * TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: TERRAIN_CONFIG.MIN_HEIGHT
            });
        }
        
        // Generate remaining segments with random heights
        for (let i = 3; i < numSegments; i++) {
            this.segments.push({
                x: i * TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: this.generateHeight(i * TERRAIN_CONFIG.SEGMENT_WIDTH)
            });
        }
    }

    generateHeight(x) {
        // Use the x position to generate a consistent height
        // This ensures the same x position always generates the same height
        const seed = Math.sin(x * 0.3) * 10000;
        return Math.abs(Math.sin(seed)) * (TERRAIN_CONFIG.MAX_HEIGHT - TERRAIN_CONFIG.MIN_HEIGHT) + TERRAIN_CONFIG.MIN_HEIGHT;
    }

    update(deltaTime) {
        // Only scroll terrain if we're in PLAYING state
        if (this.game.state === GAME_STATES.PLAYING) {
            this.scrollOffset -= TERRAIN_CONFIG.SCROLL_SPEED * deltaTime * this.game.player.direction;
        }

        // Remove off-screen segments that are definitely not coming back into view soon
        while (this.segments.length > 0 && 
               this.segments[0].x + this.scrollOffset < -TERRAIN_CONFIG.SEGMENT_WIDTH * 2) {
            this.segments.shift();
        }

        // Add segments on the right if needed (add more buffer)
        while (this.segments.length > 0 && 
               this.segments[this.segments.length - 1].x + this.scrollOffset < this.width + TERRAIN_CONFIG.SEGMENT_WIDTH * 2) {
            const newX = this.segments[this.segments.length - 1].x + TERRAIN_CONFIG.SEGMENT_WIDTH;
            this.segments.push({
                x: newX,
                height: this.generateHeight(newX)  // Pass x position for consistent height
            });
        }

        // Add segments on the left if needed
        while (this.segments.length > 0 && 
               this.segments[0].x + this.scrollOffset > -TERRAIN_CONFIG.SEGMENT_WIDTH * 2) {
            const newX = this.segments[0].x - TERRAIN_CONFIG.SEGMENT_WIDTH;
            this.segments.unshift({
                x: newX,
                height: this.generateHeight(newX)  // Pass x position for consistent height
            });
        }
    }

    render(ctx) {
        const lavaTexture = this.game.spriteLoader.getSprite('lavaTexture');
        if (!lavaTexture) return;

        // Create a canvas for the white mountain mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.width;
        maskCanvas.height = this.height;
        const maskCtx = maskCanvas.getContext('2d');

        // Draw the mountain shape in pure white
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.moveTo(0, this.height);
        
        this.segments.forEach((segment, index) => {
            const x = segment.x + this.scrollOffset;
            maskCtx.lineTo(x, this.height - segment.height);
        });

        const lastSegment = this.segments[this.segments.length - 1];
        if (lastSegment) {
            const lastX = lastSegment.x + this.scrollOffset;
            maskCtx.lineTo(lastX + TERRAIN_CONFIG.SEGMENT_WIDTH, this.height - lastSegment.height);
        }
        
        maskCtx.lineTo(this.width, this.height);
        maskCtx.closePath();
        maskCtx.fill();

        // Create a canvas for the texture
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = this.width;
        textureCanvas.height = this.height;
        const textureCtx = textureCanvas.getContext('2d');

        // Draw the lava texture
        const scale = 0.2;
        const pattern = textureCtx.createPattern(lavaTexture.image, 'repeat');
        const matrix = new DOMMatrix();
        matrix.scaleSelf(scale, scale);
        matrix.translateSelf(this.scrollOffset / scale, 0);
        pattern.setTransform(matrix);
        textureCtx.fillStyle = pattern;
        textureCtx.fillRect(0, 0, this.width, this.height);

        // AND the texture with the mask
        textureCtx.globalCompositeOperation = 'destination-in';
        textureCtx.drawImage(maskCanvas, 0, 0);

        // Draw the result to the screen (without clearing first)
        ctx.drawImage(textureCanvas, 0, 0);
    }

    checkCollision(player) {
        const playerBounds = player.getBounds();
        const buffer = 20; // Increased buffer zone to prevent premature collisions
        
        // Check collision with terrain segments
        return this.segments.some(segment => {
            const segmentX = segment.x + this.scrollOffset;
            
            // Skip segments that are too far from the player
            if (segmentX + TERRAIN_CONFIG.SEGMENT_WIDTH < playerBounds.x || 
                segmentX > playerBounds.x + playerBounds.width) {
                return false;
            }
            
            // Find the next segment for interpolation
            const nextSegment = this.segments[this.segments.indexOf(segment) + 1];
            if (!nextSegment) return false;
            
            // Calculate terrain height at player's position
            const progress = (playerBounds.x + playerBounds.width/2 - segmentX) / TERRAIN_CONFIG.SEGMENT_WIDTH;
            const terrainHeight = segment.height + (nextSegment.height - segment.height) * progress;
            
            // Check if player is below terrain (with increased buffer)
            return playerBounds.y + playerBounds.height > this.height - terrainHeight + buffer;
        });
    }

    getHeightAt(x) {
        // Find the segment that contains this x position
        const adjustedX = x - this.scrollOffset;
        const segmentIndex = this.segments.findIndex(segment => 
            adjustedX >= segment.x && adjustedX < segment.x + TERRAIN_CONFIG.SEGMENT_WIDTH
        );

        if (segmentIndex === -1 || segmentIndex >= this.segments.length - 1) {
            return TERRAIN_CONFIG.MIN_HEIGHT; // Return minimum height if no segment found
        }

        const segment = this.segments[segmentIndex];
        const nextSegment = this.segments[segmentIndex + 1];
        const progress = (adjustedX - segment.x) / TERRAIN_CONFIG.SEGMENT_WIDTH;
        
        // Interpolate height between segments
        return segment.height + (nextSegment.height - segment.height) * progress;
    }
} 