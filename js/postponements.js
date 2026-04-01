// postponements.js

class PostponementsManager {
    constructor() {
        this.postponements = {};
        this.auditLog = [];
    }

    // Track postponements per player and league
    trackPostponement(playerId, leagueId) {
        if (!this.postponements[leagueId]) {
            this.postponements[leagueId] = {};
        }
        if (!this.postponements[leagueId][playerId]) {
            this.postponements[leagueId][playerId] = 0;
        }
        this.postponements[leagueId][playerId]++;
        this.auditLog.push(`Tracked postponement for player ${playerId} in league ${leagueId}`);
    }

    // Decrement a player's postponement count
    decrementPostponement(playerId, leagueId) {
        if (this.postponements[leagueId] && this.postponements[leagueId][playerId]) {
            this.postponements[leagueId][playerId]--;
            this.auditLog.push(`Decremented postponement for player ${playerId} in league ${leagueId}`);
            
            // Remove entry if count is zero
            if (this.postponements[leagueId][playerId] <= 0) {
                delete this.postponements[leagueId][playerId];
            }
        }
    }

    // Reset counts at the start of a new season
    resetPostponements(leagueId) {
        if (this.postponements[leagueId]) {
            delete this.postponements[leagueId];
            this.auditLog.push(`Postponements reset for league ${leagueId}`);
        }
    }

    // Log the current state of postponements
    audit() {
        return this.auditLog;
    }
}

// Exporting the class for external usage
module.exports = PostponementsManager;