import Game from './game/Game';
import './styles.css';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameUI = document.getElementById('gameUI');

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Create loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.color = '#fff';
    loadingMessage.style.fontSize = '24px';
    loadingMessage.textContent = 'Loading...';
    document.body.appendChild(loadingMessage);

    // Create and initialize the game
    const game = new Game(canvas, ctx, gameUI);

    // Remove loading message when sprites are loaded
    const checkLoading = setInterval(() => {
        if (game.spriteLoader.loaded) {
            document.body.removeChild(loadingMessage);
            clearInterval(checkLoading);
        }
    }, 100);
}); 