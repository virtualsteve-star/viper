import { TERRAIN_CONFIG } from '../constants';

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
        const numSegments = Math.ceil(this.width / TERRAIN_CONFIG.SEGMENT_WIDTH) + 4; // Added extra segments for buffer
        
        // Ensure first few segments are flat for safe starting area
        for (let i = 0; i < 3; i++) {
            this.segments.push({
                x: i * TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: TERRAIN_CONFIG.MIN_HEIGHT // Use minimum height for starting area
            });
        }
        
        // Generate remaining segments with random heights
        for (let i = 3; i < numSegments; i++) {
            this.segments.push({
                x: i * TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: this.generateHeight()
            });
        }
    }

    generateHeight() {
        return Math.random() * (TERRAIN_CONFIG.MAX_HEIGHT - TERRAIN_CONFIG.MIN_HEIGHT) + TERRAIN_CONFIG.MIN_HEIGHT;
    }

    update(deltaTime) {
        // Scroll terrain based on player direction
        this.scrollOffset -= TERRAIN_CONFIG.SCROLL_SPEED * deltaTime * this.game.player.direction;

        // Remove off-screen segments and add new ones
        const firstSegment = this.segments[0];
        if (firstSegment && firstSegment.x + this.scrollOffset < -TERRAIN_CONFIG.SEGMENT_WIDTH) {
            this.segments.shift();
        }

        // Add new segments at both edges if needed
        const lastSegment = this.segments[this.segments.length - 1];
        
        // Add segments on the right if needed
        if (lastSegment && lastSegment.x + this.scrollOffset < this.width) {
            this.segments.push({
                x: lastSegment.x + TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: this.generateHeight()
            });
        }

        // Add segments on the left if needed
        if (firstSegment && firstSegment.x + this.scrollOffset > -TERRAIN_CONFIG.SEGMENT_WIDTH) {
            this.segments.unshift({
                x: firstSegment.x - TERRAIN_CONFIG.SEGMENT_WIDTH,
                height: this.generateHeight()
            });
        }

        // Keep the number of segments reasonable
        while (this.segments.length > 20) {
            // Remove from the end if we have too many segments
            this.segments.pop();
        }
    }

    render(ctx) {
        // Draw terrain segments
        this.segments.forEach((segment, index) => {
            const x = segment.x + this.scrollOffset;
            
            // Skip segments that are completely off screen
            if (x + TERRAIN_CONFIG.SEGMENT_WIDTH < 0 || x > this.width) {
                return;
            }
            
            // Get next segment for smooth connection
            const nextSegment = this.segments[index + 1];
            const nextX = nextSegment ? nextSegment.x + this.scrollOffset : x + TERRAIN_CONFIG.SEGMENT_WIDTH;
            const nextHeight = nextSegment ? nextSegment.height : segment.height;

            // Create terrain gradient for base color
            const terrainGradient = ctx.createLinearGradient(x, 0, x, this.height);
            terrainGradient.addColorStop(0, '#2a2a2a'); // Darker top
            terrainGradient.addColorStop(1, '#1a1a1a'); // Even darker bottom
            
            // Draw base terrain shape
            ctx.beginPath();
            ctx.moveTo(x, this.height);
            ctx.lineTo(x, this.height - segment.height);
            ctx.lineTo(nextX, this.height - nextHeight);
            ctx.lineTo(nextX, this.height);
            ctx.closePath();
            
            // Fill with base gradient
            ctx.fillStyle = terrainGradient;
            ctx.fill();
            
            // Add rocky texture effect
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.clip(); // Only apply texture within terrain shape
            
            // Create noise pattern for texture
            for (let y = this.height - Math.max(segment.height, nextHeight); y < this.height; y += 4) {
                for (let xOffset = 0; xOffset < TERRAIN_CONFIG.SEGMENT_WIDTH; xOffset += 4) {
                    if (Math.random() > 0.5) { // Random dots for texture
                        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                        ctx.fillRect(x + xOffset, y, 3, 3);
                    }
                }
            }
            ctx.restore();
            
            // Add highlight on edges
            ctx.beginPath();
            ctx.moveTo(x, this.height - segment.height);
            ctx.lineTo(nextX, this.height - nextHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add shadow effect
            const shadowGradient = ctx.createLinearGradient(
                x, this.height - segment.height,
                x, this.height
            );
            shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = shadowGradient;
            ctx.beginPath();
            ctx.moveTo(x, this.height - segment.height);
            ctx.lineTo(nextX, this.height - nextHeight);
            ctx.lineTo(nextX, this.height - nextHeight + 20);
            ctx.lineTo(x, this.height - segment.height + 20);
            ctx.closePath();
            ctx.fill();
        });
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