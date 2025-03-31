export default class Starfield {
    constructor(game) {
        this.game = game;
        this.stars = [];
        this.numStars = 200; // Number of stars to create
        this.initializeStars();
    }

    initializeStars() {
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * this.game.canvas.width,
                y: Math.random() * this.game.canvas.height,
                size: Math.random() * 2 + 1, // Random size between 1-3 pixels
                twinkleSpeed: Math.random() * 2 + 0.5, // Random twinkle speed
                twinkleOffset: Math.random() * Math.PI * 2, // Random starting phase
                time: 0
            });
        }
    }

    update(deltaTime) {
        this.stars.forEach(star => {
            star.time += deltaTime * star.twinkleSpeed;
        });
    }

    render(ctx) {
        ctx.save();
        
        this.stars.forEach(star => {
            // Calculate twinkle effect using sine wave
            const brightness = Math.sin(star.time + star.twinkleOffset) * 0.5 + 0.5;
            
            // Draw star with glow effect
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            
            // Create radial gradient for glow
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${brightness * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        });
        
        ctx.restore();
    }
} 