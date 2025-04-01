export default class InputHandler {
    constructor() {
        this.keys = {};
    }

    handleKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
    }

    handleKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
    }

    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] || false;
    }

    clearKeys() {
        this.keys = {};
    }
} 