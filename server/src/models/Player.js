export class Player {
    constructor(data) {
        this.id = data.id;
        this.userToken = data.user_token;
        this.username = data.username;
        this.balance = parseFloat(data.balance) || 1000.00;
        this.totalWinnings = parseFloat(data.total_winnings) || 0.00;
        this.totalLosses = parseFloat(data.total_losses) || 0.00;
        this.gamesPlayed = parseInt(data.games_played) || 0;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.lastSeen = data.last_seen;
    }

    toJSON() {
        return {
            id: this.id,
            userToken: this.userToken,
            username: this.username,
            balance: this.balance,
            totalWinnings: this.totalWinnings,
            totalLosses: this.totalLosses,
            gamesPlayed: this.gamesPlayed,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastSeen: this.lastSeen
        };
    }

    // Método para obtener estadísticas del jugador
    getStats() {
        const netProfit = this.totalWinnings - this.totalLosses;
        const winRate = this.gamesPlayed > 0 ? (this.totalWinnings / (this.totalWinnings + this.totalLosses)) * 100 : 0;
        
        return {
            gamesPlayed: this.gamesPlayed,
            totalWinnings: this.totalWinnings,
            totalLosses: this.totalLosses,
            netProfit: netProfit,
            winRate: winRate,
            averageWinnings: this.gamesPlayed > 0 ? this.totalWinnings / this.gamesPlayed : 0
        };
    }
}
