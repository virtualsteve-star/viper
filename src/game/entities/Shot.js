export default class Shot {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 6;
        this.speed = 500;
        this.direction = direction;  // Store the direction
        this.trail = [];
        this.maxTrailLength = 40;  // Increased from 20 to 40 for longer trail
        this.time = 0;
    }

    update(deltaTime) {
        // Move in the direction it was fired
        this.x += this.speed * deltaTime * this.direction;
        
        // Update trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        this.time += deltaTime;
    }

    isOffscreen(canvasWidth) {
        return this.x < 0 || this.x > canvasWidth;
    }

    render(ctx) {
        // Update trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        this.time += 0.1; // Increment time for trail fade

        // Draw trail
        this.trail.forEach((pos, index) => {
            const alpha = (index / this.trail.length) * 0.7; // Increased from 0.5 to 0.7 for more visible trail
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Draw trail segment
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + this.width, pos.y);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Add glow effect
            const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + this.width, pos.y);
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)'); // Increased from 0.2 to 0.3
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(pos.x, pos.y - 2, this.width, 4);
            
            ctx.restore();
        });

        // Draw main plasma bolt
        ctx.save();
        
        // Create plasma bolt gradient
        const boltGradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        boltGradient.addColorStop(0, '#00ffff');
        boltGradient.addColorStop(0.5, '#0088ff');
        boltGradient.addColorStop(1, '#0044ff');
        
        // Draw main bolt
        ctx.fillStyle = boltGradient;
        ctx.fillRect(this.x, this.y - this.height/2, this.width, this.height);
        
        // Add glow effect
        ctx.globalCompositeOperation = 'screen';
        const glowGradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y, 0,
            this.x + this.width/2, this.y, this.width
        );
        glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.5)');
        glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
} 