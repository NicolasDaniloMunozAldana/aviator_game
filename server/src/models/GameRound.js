export class GameRound {
    constructor(data) {
        this.id = data.id;
        this.roundNumber = parseInt(data.round_number);
        this.crashMultiplier = parseFloat(data.crash_multiplier);
        this.startedAt = data.started_at;
        this.endedAt = data.ended_at;
        this.totalBets = parseInt(data.total_bets) || 0;
        this.totalAmount = parseFloat(data.total_amount) || 0.00;
        this.playerCount = parseInt(data.player_count) || 0;
        this.totalBetAmount = parseFloat(data.total_bet_amount) || 0.00;
        this.totalWinnings = parseFloat(data.total_winnings) || 0.00;
    }

    toJSON() {
        return {
            id: this.id,
            roundNumber: this.roundNumber,
            crashMultiplier: this.crashMultiplier,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            totalBets: this.totalBets,
            totalAmount: this.totalAmount,
            playerCount: this.playerCount,
            totalBetAmount: this.totalBetAmount,
            totalWinnings: this.totalWinnings,
            duration: this.getDuration()
        };
    }

    getDuration() {
        if (this.startedAt && this.endedAt) {
            return Math.round((new Date(this.endedAt) - new Date(this.startedAt)) / 1000);
        }
        return 0;
    }
}
