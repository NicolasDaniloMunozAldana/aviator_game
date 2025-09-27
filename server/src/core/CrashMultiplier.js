import { GAME_CONFIG} from "../utils/constants.js";    

export class CrashMultiplier {
    constructor() {
        this.currentMultiplier = 1.00;
        this.crashPoint = this.generateCrashPoint();
    }

    generateCrashPoint() {
        const random = Math.random();
        const crashPoint = (1 - random) * 0.99 + 0.01; // Ajuste para fairness
        return Math.max(1.00, (1 / crashPoint) * 0.95); // 5% house edge
    }

    update() {
        if (this.currentMultiplier >= this.crashPoint) {
            return { multiplier: this.crashPoint, crashed: true };
        }

        const increment = this.calculateIncrement();
        this.currentMultiplier += increment;

        return { 
            multiplier: parseFloat(this.currentMultiplier.toFixed(2)), 
            crashed: false 
        };
    }

    calculateIncrement() {
        if (this.currentMultiplier < 2) return 0.05;
        if (this.currentMultiplier < 5) return 0.03;
        if (this.currentMultiplier < 10) return 0.02;
        return 0.01;
    }

    reset() {
        this.currentMultiplier = 1.00;
        this.crashPoint = this.generateCrashPoint();
    }

    getCurrentMultiplier() {
        return parseFloat(this.currentMultiplier.toFixed(2));
    }

    getCrashPoint() {
        return parseFloat(this.crashPoint.toFixed(2));
    }
}