export default class SpriteLoader {
    constructor() {
        this.sprites = {};
        this.loaded = false;
    }

    loadSprite(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites[name] = {
                    image: img,
                    width: img.width,
                    height: img.height
                };
                resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load sprite: ${path}`));
            img.src = path;
        });
    }

    async loadAll() {
        try {
            await Promise.all([
                this.loadSprite('viper', 'public/sprites/Viper.png'),
                this.loadSprite('drone', 'public/sprites/Drone.png'),
                this.loadSprite('killer', 'public/sprites/Killer.png'),
                this.loadSprite('spike', 'public/sprites/Spike.png'),
                this.loadSprite('striker', 'public/sprites/Striker.png'),
                this.loadSprite('shield', 'public/sprites/ShieldPowerup.png'),
                this.loadSprite('life', 'public/sprites/ExtraLife.png'),
                this.loadSprite('stargate', 'public/sprites/Stargate.png'),
                this.loadSprite('vortex', 'public/sprites/StargateVortex.png'),
                this.loadSprite('viperTitle', 'public/banners/ViperTitle.png'),
                this.loadSprite('getReady', 'public/banners/GetReady.png'),
                this.loadSprite('levelUp', 'public/banners/LevelUp.png'),
                this.loadSprite('gameOver', 'public/banners/GameOver.png'),
                this.loadSprite('lavaTexture', 'public/textures/LavaTexture.png')
            ]);
            this.loaded = true;
        } catch (error) {
            console.error('Failed to load sprites:', error);
            throw error;
        }
    }

    getSprite(name) {
        return this.sprites[name];
    }
} 