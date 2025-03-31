import { Howl } from 'howler';
import { GAME_STATES } from '../constants';

export default class AudioManager {
    constructor() {
        this.sounds = {
            splashScreen: new Howl({
                src: ['public/sounds/SplashScreenMusic.mp3'],
                volume: 0.3,
                loop: true
            }),
            gameplay: new Howl({
                src: ['public/sounds/GamePlayMusic.mp3'],
                volume: 0.3,
                loop: true
            }),
            gameOver: new Howl({
                src: ['public/sounds/GameOverMusic.mp3'],
                volume: 0.3,
                loop: true
            }),
            gameOverVoice: new Howl({
                src: ['public/sounds/GameOverVoice.mp3'],
                volume: 0.5
            }),
            viperShot: new Howl({
                src: ['public/sounds/ViperShot.mp3'],
                volume: 0.3
            }),
            enemyShot: new Howl({
                src: ['public/sounds/EnemyShot.mp3'],
                volume: 0.3
            }),
            explosion: new Howl({
                src: ['public/sounds/Explosion.mp3'],
                volume: 0.5
            }),
            powerup: new Howl({
                src: ['public/sounds/PowerUp.mp3'],
                volume: 0.4
            })
        };

        this.currentMusic = null;
        this.isMuted = false;
    }

    playBackgroundMusic(gameState) {
        if (this.isMuted) return;
        
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.stop();
        }

        // Play appropriate music based on game state
        switch (gameState) {
            case GAME_STATES.START:
                this.currentMusic = this.sounds.splashScreen;
                break;
            case GAME_STATES.PLAYING:
                this.currentMusic = this.sounds.gameplay;
                break;
            case GAME_STATES.GAME_OVER:
                this.currentMusic = this.sounds.gameOver;
                this.sounds.gameOverVoice.play();
                break;
            default:
                return;
        }

        this.currentMusic.play();
    }

    playViperShot() {
        if (!this.isMuted) {
            this.sounds.viperShot.play();
        }
    }

    playEnemyShot() {
        if (!this.isMuted) {
            this.sounds.enemyShot.play();
        }
    }

    playExplosion() {
        if (!this.isMuted) {
            this.sounds.explosion.play();
        }
    }

    playPowerUp() {
        if (!this.isMuted) {
            this.sounds.powerup.play();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            if (this.currentMusic) {
                this.currentMusic.pause();
            }
        } else {
            if (this.currentMusic) {
                this.currentMusic.play();
            }
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.stop();
        });
        this.currentMusic = null;
    }
}