export const GAME_STATES = {
    START: 'START',
    GET_READY: 'GET_READY',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

export const PLAYER_CONFIG = {
    WIDTH: 40,
    HEIGHT: 20,
    SPEED: 300,
    FIRE_RATE: 0.2,
    START_X: 320, // 1/4 of canvas width
    START_Y: 240,  // 1/3 of canvas height
    LIVES: 3  // Starting number of lives
};

export const ENEMY_CONFIG = {
    DRONE: {
        WIDTH: 30,
        HEIGHT: 15,
        SPEED: 250,
        POINTS: 10,
        FIRE_RATE: 0
    },
    KILLER: {
        WIDTH: 35,
        HEIGHT: 20,
        SPEED: 200,
        POINTS: 20,
        FIRE_RATE: 0.5
    }
};

export const POWER_UP_CONFIG = {
    SHIELD: {
        WIDTH: 30,
        HEIGHT: 30,
        DURATION: 10,
        POINTS: 0
    },
    FREE_LIFE: {
        WIDTH: 30,
        HEIGHT: 30,
        POINTS: 0
    },
    STARGATE: {
        WIDTH: 60,
        HEIGHT: 60
    }
};

export const TERRAIN_CONFIG = {
    SEGMENT_WIDTH: 100,
    MIN_HEIGHT: 100,
    MAX_HEIGHT: 300,
    SCROLL_SPEED: 200
};

export const LEVEL_CONFIG = {
    SPEED_INCREASE: 0.15, // 15% increase per level
    FIRE_RATE_INCREASE: 0.1 // 10% increase per level
}; 