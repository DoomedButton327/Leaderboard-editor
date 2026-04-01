// Postponement Tracking System

class PostponementManager {
    constructor() {
        this.postponements = [];
        this.leagues = {};
    }

    // Set up leagues with player limit
    setupLeague(leagueName) {
        if (!(leagueName in this.leagues)) {
            this.leagues[leagueName] = { players: [], limit: 20, postponements: [] };
        }
    }

    // Add player to league
    addPlayer(leagueName, player) {
        if (this.leagues[leagueName] && this.leagues[leagueName].players.length < this.leagues[leagueName].limit) {
            this.leagues[leagueName].players.push(player);
        }
    }

    // Track a postponement
    trackPostponement(matchId, leagueName, status) {
        const postponement = { matchId, leagueName, status, timestamp: new Date().toISOString() };
        this.postponements.push(postponement);
        this.leagues[leagueName].postponements.push(postponement);
    }

    // Update postponement status
    updatePostponementStatus(matchId, leagueName, newStatus) {
        const postponement = this.leagues[leagueName].postponements.find(p => p.matchId === matchId);
        if (postponement) {
            postponement.status = newStatus;
        }
    }

    // Get all postponements
    getPostponements() {
        return this.postponements;
    }

    // Audit logging
    auditLog(action) {
        console.log(`[${new Date().toISOString()}] ${action}`);
    }
}

// Sample usage
const manager = new PostponementManager();
manager.setupLeague('League A');
manager.addPlayer('League A', 'Player 1');
manager.trackPostponement('Match123', 'League A', 'Pending');
manager.updatePostponementStatus('Match123', 'League A', 'Rescheduled');
manager.auditLog('Postponement for Match123 updated to Rescheduled.');