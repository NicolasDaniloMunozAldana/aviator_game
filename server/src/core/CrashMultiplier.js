import { GAME_CONFIG} from "../utils/constants.js";    

export class CrashMultiplier {
    constructor() {
        this.currentMultiplier = 1.00;
        this.crashPoint = this.generateCrashPoint();
        this.startTime = Date.now();
    }

    generateCrashPoint() {
        const random = Math.random();
        
        if (random < 0.33) {
            // 33% chance de crash entre 1.00x - 2.00x
            return 1.00 + (Math.random() * 1.00);
        } else if (random < 0.60) {
            // 27% chance de crash entre 2.00x - 5.00x
            return 2.00 + (Math.random() * 3.00);
        } else if (random < 0.85) {
            // 25% chance de crash entre 5.00x - 20.00x
            return 5.00 + (Math.random() * 15.00);
        } else if (random < 0.95) {
            // 10% chance de crash entre 20.00x - 50.00x
            return 20.00 + (Math.random() * 30.00);
        } else {
            // 5% chance de crash entre 50.00x - 100.00x (muy raro)
            return 50.00 + (Math.random() * 50.00);
        }
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
        // Crecimiento más lineal y realista
        const elapsedTime = Date.now() - this.startTime;
        const baseIncrement = 0.01; // Incremento base más suave
        
        // Velocidad constante pero ligeramente acelerada con el tiempo
        const timeMultiplier = 1 + (elapsedTime / 10000); // Aceleración muy gradual
        
        return baseIncrement * timeMultiplier;
    }

    reset() {
        this.currentMultiplier = 1.00;
        this.crashPoint = this.generateCrashPoint();
        this.startTime = Date.now();
    }

    getCurrentMultiplier() {
        return parseFloat(this.currentMultiplier.toFixed(2));
    }

    getCrashPoint() {
        return parseFloat(this.crashPoint.toFixed(2));
    }
}