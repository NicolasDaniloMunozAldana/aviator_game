export class Player {
    constructor(data) {
        this.userToken = data.user_token || data.userToken;
        this.username = data.username;
        this.balance = parseFloat(data.balance) || 1000.00;
        this.createdAt = data.created_at || data.createdAt;
        this.lastSeen = data.last_seen || data.lastSeen;
    }

    toJSON() {
        return {
            userToken: this.userToken,
            username: this.username,
            balance: this.balance,
            createdAt: this.createdAt,
            lastSeen: this.lastSeen
        };
    }
}
