class PlayerManager {
    constructor() {
        this.players = new Map(); // Store player states
        this.disabledPlayers = new Set(); // Store disabled players
        this.auditLog = []; // Store audit logs
    }

    enablePlayer(playerId) {
        if (this.disabledPlayers.has(playerId)) {
            this.disabledPlayers.delete(playerId);
            this.logAudit(`Enabled player: ${playerId}`);
        }
    }

    disablePlayer(playerId) {
        this.disabledPlayers.add(playerId);
        this.logAudit(`Disabled player: ${playerId}`);
    }

    trackPostponement(playerId, reason) {
        if (this.players.has(playerId)) {
            this.logAudit(`Postponement for player ${playerId}: ${reason}`);
        }
    }

    logAudit(message) {
        const timestamp = new Date().toISOString(); // Generate timestamp
        this.auditLog.push(`${timestamp} - ${message}`);
    }

    getAuditLog() {
        return this.auditLog;
    }
}

// Example usage:
const manager = new PlayerManager();
manager.disablePlayer('player1');
manager.enablePlayer('player1');
manager.trackPostponement('player1', 'Injury');
console.log(manager.getAuditLog());
