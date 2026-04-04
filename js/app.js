/* ============================================================
   METTLESTATE × EA FC MOBILE LEAGUE — App.js
   ============================================================ */

// ---- STATE ----
let players  = JSON.parse(localStorage.getItem('eafc_players'))  || [];
let fixtures = JSON.parse(localStorage.getItem('eafc_fixtures')) || [];
let results  = JSON.parse(localStorage.getItem('eafc_results'))  || [];

// Pending match image (set when user picks a file before submitting score)
let pendingMatchImage = null; // { base64: '...', filename: '...', previewUrl: '...' }

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
    GH.load();
    initNavigation();

    // If GitHub is configured, try to load remote data on first load
    if (GH.isConnected()) {
        const remote = await GH.loadRemoteData();
        if (remote) {
            if (remote.players)  players  = remote.players;
            if (remote.fixtures) fixtures = remote.fixtures;
            if (remote.results)  results  = remote.results;
            saveLocalOnly(); // mirror to localStorage
        }
    }

    renderAll();

    // File input listeners
    document.getElementById('playerImport').addEventListener('change', e => {
        document.getElementById('file-chosen').textContent = e.target.files[0]?.name || 'No file chosen';
    });

    document.getElementById('matchImageInput').addEventListener('change', handleMatchImagePick);

    document.getElementById('whatsappImageInput').addEventListener('change', e => {
        document.getElementById('whatsapp-file-chosen').textContent = e.target.files[0]?.name || 'No file chosen';
    });

    document.getElementById('importBackup').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.players)  players  = data.players;
                if (data.fixtures) fixtures = data.fixtures;
                if (data.results)  results  = data.results;
                saveData();
                renderAll();
                toast('Backup restored successfully!', 'success');
            } catch { toast('Invalid backup file.', 'error'); }
        };
        reader.readAsText(file);
    });
    
    // Load Gemini API key if saved
    const savedGeminiKey = getGeminiApiKey();
    if (savedGeminiKey) {
        const statusEl = document.getElementById('gemini-key-status');
        if (statusEl) {
            statusEl.innerHTML = '<span style="color:#4cd964;"><i class="fas fa-check"></i> API key loaded! Ready to process screenshots.</span>';
        }
    }
    
    // Send page load webhook
    sendDiscordWebhook({ type: 'pageload' });
});

// ---- NAVIGATION ----
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'admin') { renderEvidenceGrid(); loadPublicRepoConfigUI(); }
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === tabId));
}

// ---- RENDER ALL ----
function renderAll() {
    renderLeaderboard();
    renderFixtures();
    renderResults();
    renderPlayerManagement();
    updatePlayerDatalist();
    updateScoreSelect();
    updatePlayerCount();
}

// ---- LEADERBOARD ----
function renderLeaderboard() {
    const sorted = sortedPlayers();
    const tbody  = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';

    // Podium
    const podium = document.getElementById('podium-area');
    if (sorted.length >= 3) {
        podium.style.display = 'grid';
        const [first, second, third] = sorted;
        podium.innerHTML = `
            <div class="podium-card rank-2"><div class="podium-medal">🥈</div><div class="podium-name">${second.username}</div><div class="podium-pts">2nd · <strong>${second.points}</strong> pts</div></div>
            <div class="podium-card rank-1"><div class="podium-medal">🥇</div><div class="podium-name">${first.username}</div><div class="podium-pts">1st · <strong>${first.points}</strong> pts</div></div>
            <div class="podium-card rank-3"><div class="podium-medal">🥉</div><div class="podium-name">${third.username}</div><div class="podium-pts">3rd · <strong>${third.points}</strong> pts</div></div>
        `;
    } else {
        podium.style.display = 'none';
    }

    sorted.forEach((p, i) => {
        const rank  = i + 1;
        const gd    = (p.gf || 0) - (p.ga || 0);
        const gdStr = gd > 0 ? `<span class="gd-pos">+${gd}</span>` : gd < 0 ? `<span class="gd-neg">${gd}</span>` : `<span>${gd}</span>`;
        const pos   = rank <= 3 ? `pos-${rank}` : 'pos-n';
        const zone  = rank <= 3 ? 'zone-champ' : (sorted.length >= 5 && rank >= sorted.length - 1 ? 'zone-danger' : '');
        const form  = buildFormBadges(p.form || []);
        const tr = document.createElement('tr');
        tr.className = zone;
        tr.innerHTML = `
            <td><span class="pos-badge ${pos}">${rank}</span></td>
            <td><div class="player-cell-name">${p.name}</div><div class="player-cell-username">${p.username}</div></td>
            <td>${p.played||0}</td><td>${p.wins||0}</td><td>${p.draws||0}</td><td>${p.losses||0}</td>
            <td>${p.gf||0}</td><td>${p.ga||0}</td><td>${gdStr}</td>
            <td class="pts-cell">${p.points||0}</td>
            <td><div class="form-badges">${form}</div></td>
        `;
        tbody.appendChild(tr);
    });
}

function sortedPlayers() {
    return [...players].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = (a.gf||0)-(a.ga||0), gdB = (b.gf||0)-(b.ga||0);
        if (gdB !== gdA) return gdB - gdA;
        return (b.gf||0) - (a.gf||0);
    });
}

function buildFormBadges(form) {
    return (form||[]).slice(-5).map(r =>
        r === 'W' ? `<span class="form-w">W</span>` :
        r === 'D' ? `<span class="form-d">D</span>` :
                    `<span class="form-l">L</span>`
    ).join('');
}

// ---- FIXTURES ----
function renderFixtures() {
    const grid = document.getElementById('fixtures-grid');
    grid.innerHTML = '';
    if (!fixtures.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-futbol"></i>No fixtures scheduled yet.<br>Use Admin to generate or add matches.</div>`;
        return;
    }
    fixtures.forEach(match => {
        // Ensure default
        if (!match.postponedBy) match.postponedBy = null;
        
        const postponedBadge = match.postponedBy 
            ? `<div style="background:rgba(255,149,0,0.15);border:1px solid rgba(255,149,0,0.3);color:var(--orange);padding:4px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;margin-top:6px;text-align:center;">⏸ POSTPONED by ${match.postponedBy}</div>` 
            : '';
        
        const div = document.createElement('div');
        div.className = 'fixture-card';
        div.style.opacity = match.postponedBy ? '0.7' : '1';
        div.innerHTML = `
            <div class="fixture-player">${match.home}</div>
            <div class="vs-badge">VS</div>
            <div class="fixture-player">${match.away}</div>
            ${postponedBadge}
            <div class="match-actions">
                <button class="btn-win-home"  onclick="resolveMatch('${match.id}','home')" title="${match.home} wins">🏆 ${truncate(match.home,8)}</button>
                <button class="btn-match-draw" onclick="resolveMatch('${match.id}','draw')">DRAW</button>
                <button class="btn-win-away"  onclick="resolveMatch('${match.id}','away')" title="${match.away} wins">🏆 ${truncate(match.away,8)}</button>
            </div>
            <div style="display:flex;gap:4px;margin-top:6px;">
                <button onclick="postponeMatch('${match.id}','${match.home}')" style="flex:1;background:rgba(255,149,0,0.1);color:var(--orange);border:1px solid rgba(255,149,0,0.2);padding:6px;font-size:0.7rem;border-radius:6px;cursor:pointer;">⏸ ${truncate(match.home,6)}</button>
                <button onclick="postponeMatch('${match.id}','${match.away}')" style="flex:1;background:rgba(255,149,0,0.1);color:var(--orange);border:1px solid rgba(255,149,0,0.2);padding:6px;font-size:0.7rem;border-radius:6px;cursor:pointer;">⏸ ${truncate(match.away,6)}</button>
                ${match.postponedBy ? `<button onclick="unpostponeMatch('${match.id}')" style="flex:1;background:rgba(76,217,100,0.1);color:#4cd964;border:1px solid rgba(76,217,100,0.2);padding:6px;font-size:0.7rem;border-radius:6px;cursor:pointer;">▶ Resume</button>` : ''}
            </div>
        `;
        grid.appendChild(div);
    });
}

// ---- RESULTS ----
function renderResults() {
    const list = document.getElementById('results-list');
    list.innerHTML = '';
    if (!results.length) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-check-double"></i>No results recorded yet.</div>`;
        return;
    }
    [...results].reverse().forEach(r => {
        const homeWon = r.result === 'home', awayWon = r.result === 'away', isDraw = r.result === 'draw';
        const scoreDisplay = r.homeGoals !== undefined ? `${r.homeGoals} — ${r.awayGoals}` : (isDraw ? 'DRAW' : homeWon ? 'WIN' : 'WIN');
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div class="result-home">
                <div class="result-player-name ${homeWon?'winner':''}">${r.home}</div>
                ${homeWon ? '<span class="result-badge badge-win">WIN</span>' : isDraw ? '<span class="result-badge badge-draw">DRAW</span>' : '<span class="result-badge badge-loss">LOSS</span>'}
            </div>
            <div class="score-box">${scoreDisplay}</div>
            <div class="result-away">
                <div class="result-player-name ${awayWon?'winner':''}">${r.away}</div>
                ${awayWon ? '<span class="result-badge badge-win">WIN</span>' : isDraw ? '<span class="result-badge badge-draw">DRAW</span>' : '<span class="result-badge badge-loss">LOSS</span>'}
            </div>
        `;
        list.appendChild(div);
    });
}

// ---- PLAYER MANAGEMENT ----
function renderPlayerManagement() {
    const tbody = document.getElementById('playerMgmtBody');
    tbody.innerHTML = '';
    players.forEach((p, i) => {
        // Ensure defaults exist
        if (p.postponements === undefined) p.postponements = 20;
        if (p.suspended === undefined) p.suspended = false;
        
        const suspendedClass = p.suspended ? 'style="opacity:0.5;background:rgba(255,59,59,0.05);"' : '';
        const suspendedBadge = p.suspended ? '<span style="color:var(--red);font-size:0.7rem;font-weight:600;margin-left:6px;">SUSPENDED</span>' : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="pos-badge pos-n">${i+1}</span></td>
            <td ${suspendedClass}><div class="player-cell-name">${p.name}${suspendedBadge}</div></td>
            <td ${suspendedClass}><div class="player-cell-username" style="color:var(--text)">${p.username}</div></td>
            <td ${suspendedClass} style="color:var(--muted);font-size:0.85rem">${p.phone||'N/A'}</td>
            <td ${suspendedClass} style="font-size:0.82rem;color:var(--muted)">
                P:${p.played||0} W:${p.wins||0} D:${p.draws||0} L:${p.losses||0}<br>
                <span style="color:var(--purple);">Postponements: ${p.postponements||0}/20</span>
            </td>
            <td>
                <button onclick="toggleSuspension(${i})" style="background:${p.suspended?'rgba(76,217,100,0.1)':'rgba(255,149,0,0.1)'};color:${p.suspended?'#4cd964':'var(--orange)'};border:1px solid ${p.suspended?'rgba(76,217,100,0.2)':'rgba(255,149,0,0.2)'};padding:6px 12px;font-size:0.75rem;margin:0 4px 0 0;width:auto;">
                    <i class="fas fa-${p.suspended?'play':'ban'}"></i>
                </button>
                <button onclick="deletePlayer(${i})" style="background:rgba(255,59,59,0.1);color:var(--red);border:1px solid rgba(255,59,59,0.2);padding:6px 12px;font-size:0.75rem;margin:0;width:auto;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---- EVIDENCE GRID (admin only) ----
function renderEvidenceGrid() {
    const grid = document.getElementById('evidence-grid');
    if (!grid) return;
    const withImages = results.filter(r => r.imageUrl || r.imageDataUrl);
    if (!withImages.length) {
        grid.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;">No evidence images yet.</p>`;
        return;
    }
    grid.innerHTML = '';
    
    // Organize by game
    [...withImages].reverse().forEach(r => {
        const card = document.createElement('div');
        card.className = 'evidence-game-card';
        
        const score = r.homeGoals !== undefined ? `${r.homeGoals}–${r.awayGoals}` : r.result.toUpperCase();
        const resultBadge = r.result === 'home' ? 'WIN' : r.result === 'away' ? 'WIN' : 'DRAW';
        const resultColor = r.result === 'draw' ? 'var(--orange)' : '#4cd964';
        const autoWinBadge = r.autoWin ? '<span style="background:rgba(255,149,0,0.15);color:var(--orange);padding:2px 6px;border-radius:4px;font-size:0.65rem;margin-left:4px;">AUTO-WIN</span>' : '';
        
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div>
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${r.home} vs ${r.away}</div>
                    <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">Match Evidence</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:1.1rem;font-weight:700;color:${resultColor};">${score}</div>
                    <div style="font-size:0.7rem;color:${resultColor};">${resultBadge}${autoWinBadge}</div>
                </div>
            </div>
            <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
                <img src="${r.imageUrl || r.imageDataUrl}" alt="Match screenshot" style="width:100%;height:120px;object-fit:cover;">
                <button onclick="openLightbox('${r.imageUrl || r.imageDataUrl}','${r.home} ${score} ${r.away}')" 
                    style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.8);color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:0.75rem;cursor:pointer;backdrop-filter:blur(10px);">
                    <i class="fas fa-expand"></i> View Full
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ---- LIGHTBOX ----
function openLightbox(src, caption) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-caption').textContent = caption;
    document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}

// ---- MATCH IMAGE PICK ----
function handleMatchImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        const dataUrl = ev.target.result;
        const base64  = dataUrl.split(',')[1];
        const ext     = file.name.split('.').pop() || 'png';
        const ts      = Date.now();
        const sel     = document.getElementById('scoreFixtureSelect');
        const matchLabel = sel.options[sel.selectedIndex]?.text?.replace(/\s+/g,'_') || 'match';
        const filename = `${matchLabel}_${ts}.${ext}`;

        pendingMatchImage = { base64, filename, previewUrl: dataUrl };

        // Show preview
        document.getElementById('match-image-preview').src = dataUrl;
        document.getElementById('match-image-preview-wrap').style.display = 'block';
        document.getElementById('matchImageLabel').innerHTML = `<i class="fas fa-check-circle" style="color:var(--green)"></i> Image attached`;
    };
    reader.readAsDataURL(file);
}

function clearMatchImage() {
    pendingMatchImage = null;
    document.getElementById('matchImageInput').value = '';
    document.getElementById('match-image-preview-wrap').style.display = 'none';
    document.getElementById('matchImageLabel').innerHTML = `<i class="fas fa-image"></i> Attach Screenshot (optional)`;
}

// ---- RESOLVE MATCH (quick, no score) ----
function resolveMatch(id, result) {
    const idx = fixtures.findIndex(f => String(f.id) === String(id));
    if (idx === -1) return;
    const match = fixtures[idx];
    
    // Check if postponed
    if (match.postponedBy) {
        toast('Cannot resolve postponed match. Resume it first.', 'error');
        return;
    }
    
    const homeP = players.find(p => p.username === match.home);
    const awayP = players.find(p => p.username === match.away);
    if (!homeP || !awayP) return;

    homeP.played = (homeP.played||0)+1;
    awayP.played = (awayP.played||0)+1;

    if (result === 'draw') {
        homeP.draws=(homeP.draws||0)+1; homeP.points=(homeP.points||0)+1;
        awayP.draws=(awayP.draws||0)+1; awayP.points=(awayP.points||0)+1;
        addForm(homeP,'D'); addForm(awayP,'D');
    } else if (result === 'home') {
        homeP.wins=(homeP.wins||0)+1; homeP.points=(homeP.points||0)+3;
        awayP.losses=(awayP.losses||0)+1;
        addForm(homeP,'W'); addForm(awayP,'L');
    } else {
        awayP.wins=(awayP.wins||0)+1; awayP.points=(awayP.points||0)+3;
        homeP.losses=(homeP.losses||0)+1;
        addForm(homeP,'L'); addForm(awayP,'W');
    }

    results.push({ home: match.home, away: match.away, result, id: Date.now() });
    fixtures.splice(idx, 1);
    saveData();
    renderAll();
    toast(`Result logged: ${match.home} vs ${match.away}`, 'success');
}

function postponeMatch(matchId, playerUsername) {
    const match = fixtures.find(f => String(f.id) === String(matchId));
    if (!match) return;
    
    const player = players.find(p => p.username === playerUsername);
    if (!player) return;
    
    // Ensure defaults
    if (player.postponements === undefined) player.postponements = 20;
    
    if (player.postponements <= 0) {
        toast(`${playerUsername} has no postponements left!`, 'error');
        return;
    }
    
    if (match.postponedBy) {
        toast('Match is already postponed', 'error');
        return;
    }
    
    player.postponements--;
    match.postponedBy = playerUsername;
    
    saveData();
    renderAll();
    toast(`Match postponed by ${playerUsername} (${player.postponements} remaining)`, 'success');
}

function unpostponeMatch(matchId) {
    const match = fixtures.find(f => String(f.id) === String(matchId));
    if (!match || !match.postponedBy) return;
    
    match.postponedBy = null;
    
    saveData();
    renderAll();
    toast('Match resumed', 'success');
}

// ---- LOG SCORE (with goals + optional image) ----
async function logScore() {
    const sel = document.getElementById('scoreFixtureSelect');
    const hg  = parseInt(document.getElementById('scoreHome').value);
    const ag  = parseInt(document.getElementById('scoreAway').value);
    const id  = sel.value;

    if (!id)               { toast('Select a fixture', 'error');       return; }
    if (isNaN(hg)||isNaN(ag)) { toast('Enter both scores', 'error'); return; }

    const idx = fixtures.findIndex(f => String(f.id) === String(id));
    if (idx === -1) return;
    const match = fixtures[idx];
    const homeP = players.find(p => p.username === match.home);
    const awayP = players.find(p => p.username === match.away);
    if (!homeP || !awayP) return;

    homeP.played=(homeP.played||0)+1; awayP.played=(awayP.played||0)+1;
    homeP.gf=(homeP.gf||0)+hg; homeP.ga=(homeP.ga||0)+ag;
    awayP.gf=(awayP.gf||0)+ag; awayP.ga=(awayP.ga||0)+hg;

    let result;
    if (hg > ag) {
        result='home'; homeP.wins=(homeP.wins||0)+1; homeP.points=(homeP.points||0)+3; awayP.losses=(awayP.losses||0)+1;
        addForm(homeP,'W'); addForm(awayP,'L');
    } else if (ag > hg) {
        result='away'; awayP.wins=(awayP.wins||0)+1; awayP.points=(awayP.points||0)+3; homeP.losses=(homeP.losses||0)+1;
        addForm(homeP,'L'); addForm(awayP,'W');
    } else {
        result='draw'; homeP.draws=(homeP.draws||0)+1; homeP.points=(homeP.points||0)+1;
        awayP.draws=(awayP.draws||0)+1; awayP.points=(awayP.points||0)+1;
        addForm(homeP,'D'); addForm(awayP,'D');
    }

    // Build result entry
    const entry = { home: match.home, away: match.away, result, homeGoals: hg, awayGoals: ag, id: Date.now() };

    // Upload image if attached
    if (pendingMatchImage) {
        toast('Uploading screenshot…', 'success');
        const imageUrl = await GH.uploadMatchImage(pendingMatchImage.base64, pendingMatchImage.filename);
        if (imageUrl) entry.imageUrl = imageUrl;
        // If not connected to GitHub, store the base64 locally as a fallback
        if (!imageUrl && pendingMatchImage) entry.imageDataUrl = pendingMatchImage.previewUrl;
    }

    results.push(entry);
    fixtures.splice(idx, 1);

    // Reset image state
    clearMatchImage();
    document.getElementById('scoreHome').value = '';
    document.getElementById('scoreAway').value = '';

    saveData();
    
    // Send Discord webhook
    await sendDiscordWebhook({
        type: 'result',
        home: match.home,
        away: match.away,
        score: `${hg}-${ag}`,
        result: result,
        imageDataUrl: entry.imageDataUrl || entry.imageUrl
    });
    
    // Auto-sync to public leaderboard
    await autoSyncPublicLeaderboard();
    
    renderAll();
    toast(`Score logged: ${match.home} ${hg}–${ag} ${match.away}`, 'success');
}

function addForm(player, r) {
    if (!player.form) player.form = [];
    player.form.push(r);
    if (player.form.length > 10) player.form = player.form.slice(-10);
}

function updateScoreSelect() {
    const sel = document.getElementById('scoreFixtureSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Fixture —</option>';
    fixtures.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.home} vs ${f.away}`;
        sel.appendChild(opt);
    });
}

// ---- IMPORT PLAYERS ----
function processImport() {
    const file = document.getElementById('playerImport').files[0];
    if (!file) { toast('Select a file first', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        let added = 0;
        e.target.result.split('\n').filter(l=>l.trim()).forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const username = parts[1].trim();
                if (!players.some(p => p.username === username)) {
                    players.push(mkPlayer(parts[0].trim(), username, parts[2]?.trim()||'N/A'));
                    added++;
                }
            }
        });
        saveData();
        renderAll();
        toast(`Imported ${added} players. Total: ${players.length}`, 'success');
    };
    reader.readAsText(file);
}

function addSinglePlayer() {
    const name     = document.getElementById('addName').value.trim();
    const username = document.getElementById('addUsername').value.trim();
    const phone    = document.getElementById('addPhone').value.trim();
    if (!name||!username) { toast('Name and username required','error'); return; }
    if (players.some(p=>p.username===username)) { toast('Username already exists','error'); return; }
    players.push(mkPlayer(name, username, phone||'N/A'));
    saveData(); renderAll();
    ['addName','addUsername','addPhone'].forEach(id => document.getElementById(id).value = '');
    toast(`${username} added!`, 'success');
}

function mkPlayer(name, username, phone) {
    return { name, username, phone, played:0, wins:0, draws:0, losses:0, points:0, gf:0, ga:0, form:[], postponements:20, suspended:false };
}

function deletePlayer(index) {
    if (!confirm(`Remove ${players[index].username} from the league?`)) return;
    players.splice(index, 1);
    saveData(); renderAll();
    toast('Player removed', 'success');
}

function toggleSuspension(index) {
    const player = players[index];
    player.suspended = !player.suspended;
    saveData();
    renderAll();
    toast(`${player.username} ${player.suspended ? 'suspended' : 'reactivated'}`, player.suspended ? 'error' : 'success');
    
    sendDiscordWebhook({
        type: 'suspension',
        player: player.username,
        suspended: player.suspended
    });
}

// ---- GENERATE DRAW ----
function generateDraw() {
    const activePlayers = players.filter(p => !p.suspended);
    if (activePlayers.length < 2) { toast('Not enough active players!', 'error'); return; }
    const mode = document.getElementById('matchday-select').value;
    let newFixtures = [];

    if (mode === 'roundrobin') {
        // Build all unique pairs first
        for (let i = 0; i < activePlayers.length; i++) {
            for (let j = i+1; j < activePlayers.length; j++) {
                const exists = fixtures.some(f =>
                    (f.home===activePlayers[i].username&&f.away===activePlayers[j].username)||
                    (f.home===activePlayers[j].username&&f.away===activePlayers[i].username)
                );
                if (!exists) newFixtures.push({ home:activePlayers[i].username, away:activePlayers[j].username, id:Date.now()+Math.random() });
            }
        }
        // Fisher-Yates shuffle so fixtures come out in a random order,
        // but still no repeats until everyone has played everyone
        for (let i = newFixtures.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newFixtures[i], newFixtures[j]] = [newFixtures[j], newFixtures[i]];
        }
    } else {
        const shuffled = [...activePlayers].sort(()=>0.5-Math.random());
        for (let i=0; i<shuffled.length-1; i+=2)
            newFixtures.push({ home:shuffled[i].username, away:shuffled[i+1].username, id:Date.now()+i });
    }
    fixtures = [...fixtures, ...newFixtures];
    saveData(); renderAll(); switchTab('fixtures');
    toast(`Generated ${newFixtures.length} fixtures`, 'success');
}

function addManualMatch() {
    const p1 = document.getElementById('p1Input').value.trim();
    const p2 = document.getElementById('p2Input').value.trim();
    if (!p1||!p2)  { toast('Enter both usernames','error'); return; }
    if (p1===p2)   { toast('Players must be different','error'); return; }
    fixtures.push({ home:p1, away:p2, id:Date.now() });
    saveData(); renderAll();
    document.getElementById('p1Input').value = '';
    document.getElementById('p2Input').value = '';
    toast(`Fixture added: ${p1} vs ${p2}`, 'success');
}

function updatePlayerDatalist() {
    ['player-list-p1','player-list-p2'].forEach(id => {
        const dl = document.getElementById(id);
        if (!dl) return;
        dl.innerHTML = '';
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.username;
            dl.appendChild(opt);
        });
    });
}

function updatePlayerCount() {
    const el = document.getElementById('player-count');
    if (el) el.textContent = players.length;
}

// ---- PUBLIC LEADERBOARD SYNC ----
function savePublicRepoConfig() {
    const owner  = document.getElementById('pubOwner').value.trim();
    const repo   = document.getElementById('pubRepo').value.trim();
    const branch = document.getElementById('pubBranch').value.trim() || 'main';
    const token  = document.getElementById('pubToken').value.trim();
    if (!owner || !repo || !token) { toast('Owner, repo, and token are required', 'error'); return; }
    localStorage.setItem('eafc_public_gh', JSON.stringify({ owner, repo, branch, token }));
    toast('Public repo config saved!', 'success');
    const s = document.getElementById('pub-sync-status');
    s.textContent = '✓ Config saved — ' + owner + '/' + repo;
    s.className   = 'gh-status-msg gh-status-ok';
}

async function pushToPublicLeaderboard(silent = false) {
    const raw = localStorage.getItem('eafc_public_gh');
    if (!raw) { 
        if (!silent) toast('Configure public repo first', 'error'); 
        return; 
    }
    const cfg = JSON.parse(raw);
    
    if (!silent) {
        const statusEl = document.getElementById('pub-sync-status');
        if (statusEl) {
            statusEl.textContent = 'Pushing to public repo…';
            statusEl.className   = 'gh-status-msg';
        }
    }

    const payload = JSON.stringify(
        { players, fixtures, results, lastUpdated: new Date().toISOString() },
        null, 2
    );
    try {
        const ok = await GH.commitFileDirect(
            cfg.owner, cfg.repo, cfg.branch, cfg.token,
            'data/league-data.json',
            payload,
            'Update public leaderboard — ' + new Date().toLocaleString('en-ZA')
        );
        if (ok) {
            if (!silent) {
                const statusEl = document.getElementById('pub-sync-status');
                if (statusEl) {
                    statusEl.textContent = '✓ Public leaderboard updated!';
                    statusEl.className   = 'gh-status-msg gh-status-ok';
                }
                toast('Public leaderboard updated!', 'success');
            }
        } else {
            if (!silent) {
                const statusEl = document.getElementById('pub-sync-status');
                if (statusEl) {
                    statusEl.textContent = '✗ Push failed — check token/repo';
                    statusEl.className   = 'gh-status-msg gh-status-error';
                }
                toast('Push failed — check config', 'error');
            }
        }
    } catch(err) {
        if (!silent) {
            const statusEl = document.getElementById('pub-sync-status');
            if (statusEl) {
                statusEl.textContent = '✗ Network error';
                statusEl.className   = 'gh-status-msg gh-status-error';
            }
            toast('Network error', 'error');
        }
    }
}

// Load saved public repo config into fields when admin tab opens
function loadPublicRepoConfigUI() {
    const raw = localStorage.getItem('eafc_public_gh');
    if (!raw) return;
    const cfg = JSON.parse(raw);
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('pubOwner',  cfg.owner);
    setVal('pubRepo',   cfg.repo);
    setVal('pubBranch', cfg.branch);
    setVal('pubToken',  cfg.token);
    const s = document.getElementById('pub-sync-status');
    if (s) { s.textContent = '✓ Config loaded — ' + cfg.owner + '/' + cfg.repo; s.className = 'gh-status-msg gh-status-ok'; }
}

// ---- GITHUB CONFIG (called from Admin buttons) ----
async function saveGitHubConfig() {
    const owner  = document.getElementById('ghOwner').value.trim();
    const repo   = document.getElementById('ghRepo').value.trim();
    const branch = document.getElementById('ghBranch').value.trim() || 'main';
    const token  = document.getElementById('ghToken').value.trim();

    if (!owner||!repo||!token) { toast('Owner, repo, and token are required','error'); return; }

    const statusEl = document.getElementById('gh-connect-status');
    statusEl.textContent = 'Testing connection…';
    statusEl.className = 'gh-status-msg';

    GH.save(owner, repo, branch, token);
    const test = await GH.testConnection();

    if (!test.ok) {
        statusEl.textContent = '✗ ' + test.msg;
        statusEl.className = 'gh-status-msg gh-status-error';
        toast('Connection failed: ' + test.msg, 'error');
        return;
    }

    statusEl.textContent = '✓ Connected — checking for remote data…';
    statusEl.className = 'gh-status-msg gh-status-ok';

    // ALWAYS pull remote data first before doing anything.
    // This prevents a fresh device/browser (with empty memory) from
    // overwriting the real GitHub data with an empty commit.
    const remote = await GH.loadRemoteData();

    if (remote && (remote.players?.length || remote.fixtures?.length || remote.results?.length)) {
        // Remote has real data — load it, never overwrite
        if (remote.players)  players  = remote.players;
        if (remote.fixtures) fixtures = remote.fixtures;
        if (remote.results)  results  = remote.results;
        saveLocalOnly();
        renderAll();
        statusEl.textContent = '✓ Loaded ' + players.length + ' players from GitHub';
        toast('Connected & data loaded from GitHub!', 'success');
    } else {
        // Remote is empty or file doesn't exist yet — safe to push local data up
        await GH.syncData(players, fixtures, results);
        statusEl.textContent = '✓ Connected — local data pushed to GitHub';
        toast('Connected! Local data pushed to GitHub.', 'success');
    }

    GH.updateStatusUI();
}

function disconnectGitHub() {
    if (!confirm('Disconnect from GitHub? Data will still be saved locally.')) return;
    GH.disconnect();
    document.getElementById('gh-connect-status').textContent = '';
    document.getElementById('ghToken').value = '';
    toast('GitHub disconnected. Data stays local.', 'success');
}

async function forceSyncToGitHub() {
    if (!GH.isConnected()) { toast('Not connected to GitHub','error'); return; }
    await GH.syncData(players, fixtures, results);
}

// ---- DATA SAVE ----
// saveData: saves locally AND syncs to GitHub
async function saveData() {
    saveLocalOnly();
    if (GH.isConnected()) {
        await GH.syncData(players, fixtures, results);
    }
}

function saveLocalOnly() {
    localStorage.setItem('eafc_players',  JSON.stringify(players));
    localStorage.setItem('eafc_fixtures', JSON.stringify(fixtures));
    localStorage.setItem('eafc_results',  JSON.stringify(results));
}

function exportData() {
    const blob = new Blob([JSON.stringify({players,fixtures,results},null,2)], {type:'application/json'});
    const link = document.createElement('a');
    link.download = `Mettlestate_Backup_${dateStamp()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast('Backup exported!', 'success');
}

function clearData() {
    if (!confirm('⚠️ This will DELETE all players, fixtures, and results. Are you absolutely sure?')) return;
    localStorage.clear();
    players=[]; fixtures=[]; results=[];
    renderAll();
    toast('League reset.', 'success');
}

// ---- IMAGE EXPORT ----
function downloadFixtureImage() {
    if (!fixtures.length) { toast('No fixtures to export','error'); return; }
    
    const list = document.getElementById('poster-fixture-list');
    list.innerHTML = '';
    
    // Separate active and postponed fixtures
    const activeFixtures = fixtures.filter(f => !f.postponedBy);
    const postponedFixtures = fixtures.filter(f => f.postponedBy);
    
    // Add active fixtures
    if (activeFixtures.length > 0) {
        const activeHeader = document.createElement('div');
        activeHeader.style.cssText = 'background:rgba(76,217,100,0.1);border:2px solid rgba(76,217,100,0.3);color:#4cd964;padding:10px;margin:12px 0;border-radius:8px;text-align:center;font-weight:700;font-size:0.9rem;letter-spacing:1px;';
        activeHeader.textContent = '▶ ACTIVE FIXTURES';
        list.appendChild(activeHeader);
        
        activeFixtures.forEach(f => {
            const homePlayer = players.find(p => p.username === f.home);
            const awayPlayer = players.find(p => p.username === f.away);
            
            const homeDisplay  = homePlayer  ? homePlayer.name  : f.home;
            const awayDisplay  = awayPlayer  ? awayPlayer.name  : f.away;
            
            const homePhone = homePlayer ? (homePlayer.phone || 'N/A') : 'N/A';
            const awayPhone = awayPlayer ? (awayPlayer.phone || 'N/A') : 'N/A';
            const homeUsername = homePlayer ? homePlayer.username : f.home;
            const awayUsername = awayPlayer ? awayPlayer.username : f.away;
            
            const row = document.createElement('div');
            row.className = 'poster-match-row';
            row.innerHTML = `
                <div class="poster-match-home">
                    <div class="poster-player-name">${homeDisplay}</div>
                    <div class="poster-player-details">${homePhone} • ${homeUsername}</div>
                </div>
                <div class="poster-match-vs">VS</div>
                <div class="poster-match-away">
                    <div class="poster-player-name">${awayDisplay}</div>
                    <div class="poster-player-details">${awayPhone} • ${awayUsername}</div>
                </div>
            `;
            list.appendChild(row);
        });
    }
    
    // Add postponed fixtures
    if (postponedFixtures.length > 0) {
        const postponedHeader = document.createElement('div');
        postponedHeader.style.cssText = 'background:rgba(255,149,0,0.1);border:2px solid rgba(255,149,0,0.3);color:var(--orange);padding:10px;margin:12px 0;border-radius:8px;text-align:center;font-weight:700;font-size:0.9rem;letter-spacing:1px;';
        postponedHeader.textContent = '⏸ POSTPONED FIXTURES';
        list.appendChild(postponedHeader);
        
        postponedFixtures.forEach(f => {
            const homePlayer = players.find(p => p.username === f.home);
            const awayPlayer = players.find(p => p.username === f.away);
            
            const homeDisplay  = homePlayer  ? homePlayer.name  : f.home;
            const awayDisplay  = awayPlayer  ? awayPlayer.name  : f.away;
            
            const homePhone = homePlayer ? (homePlayer.phone || 'N/A') : 'N/A';
            const awayPhone = awayPlayer ? (awayPlayer.phone || 'N/A') : 'N/A';
            const homeUsername = homePlayer ? homePlayer.username : f.home;
            const awayUsername = awayPlayer ? awayPlayer.username : f.away;
            
            const row = document.createElement('div');
            row.className = 'poster-match-row';
            row.style.opacity = '0.6';
            row.innerHTML = `
                <div class="poster-match-home">
                    <div class="poster-player-name">${homeDisplay}</div>
                    <div class="poster-player-details">${homePhone} • ${homeUsername}</div>
                </div>
                <div class="poster-match-vs" style="background:rgba(255,149,0,0.15);color:var(--orange);">⏸</div>
                <div class="poster-match-away">
                    <div class="poster-player-name">${awayDisplay}</div>
                    <div class="poster-player-details">${awayPhone} • ${awayUsername}</div>
                </div>
                <div style="text-align:center;font-size:0.7rem;color:var(--orange);margin-top:6px;font-weight:600;">Postponed by ${f.postponedBy}</div>
            `;
            list.appendChild(row);
        });
    }
    
    captureElement('fixture-capture-area', `Mettlestate_Fixtures_${dateStamp()}.png`, 'Fixtures image downloaded!');
}

function downloadLeaderboardImage() {
    if (!players.length) { toast('No players to export','error'); return; }
    const sorted = sortedPlayers();
    const container = document.getElementById('poster-lb-table');
    container.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'poster-lb-header';
    header.innerHTML = `<div>#</div><div>PLAYER</div><div>P</div><div>W</div><div>D</div><div>L</div><div>PTS</div>`;
    container.appendChild(header);
    
    sorted.forEach((p, i) => {
        const rank = i + 1;
        const posClass = rank === 1 ? 'poster-lb-pos-1' :
                        rank === 2 ? 'poster-lb-pos-2' :
                        rank === 3 ? 'poster-lb-pos-3' : '';
                        
        const row = document.createElement('div');
        row.className = 'poster-lb-row';
        row.innerHTML = `
            <div class="${posClass}">${rank}</div>
            <div>
                ${p.name}
                <div style="font-size:0.85em; color:#aaa; margin-top:2px;">${p.username}</div>
            </div>
            <div>${p.played||0}</div>
            <div>${p.wins||0}</div>
            <div>${p.draws||0}</div>
            <div>${p.losses||0}</div>
            <div class="poster-lb-pts">${p.points||0}</div>
        `;
        container.appendChild(row);
    });
    
    captureElement('lb-capture-area', `Mettlestate_Standings_${dateStamp()}.png`, 'Standings image downloaded!');
}

function downloadRulesImage() {
    const liveRules = document.getElementById('rules-content');
    document.getElementById('poster-rules-content').innerHTML = liveRules.innerHTML;
    captureElement('rules-capture-area', `Mettlestate_Rules_Season1.png`, 'Rules image downloaded!');
}

function captureElement(elementId, filename, successMsg) {
    const el = document.getElementById(elementId);
    el.style.position   = 'fixed';
    el.style.top        = '0';
    el.style.left       = '0';
    el.style.visibility = 'visible';
    el.style.zIndex     = '-1';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            html2canvas(el, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#0A0A0C', logging: false,
                onclone: doc => {
                    const c = doc.getElementById(elementId);
                    if (c) { c.style.visibility='visible'; c.style.position='static'; c.style.left='0'; c.style.top='0'; c.style.zIndex='1'; }
                }
            }).then(canvas => {
                el.style.position='absolute'; el.style.top='0'; el.style.left='-9999px'; el.style.visibility='hidden'; el.style.zIndex='-1';
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast(successMsg, 'success');
            }).catch(() => {
                el.style.position='absolute'; el.style.left='-9999px'; el.style.visibility='hidden';
                toast('Export failed. Try again.', 'error');
            });
        });
    });
}

// ---- MODAL ----
function openModal(html) { document.getElementById('modal-body').innerHTML=html; document.getElementById('modal-overlay').classList.add('open'); }
function closeModal()     { document.getElementById('modal-overlay').classList.remove('open'); }

// ---- TOAST ----
function toast(msg, type='success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

// ---- HELPERS ----
function truncate(str, n) { return str.length>n ? str.slice(0,n)+'…' : str; }
function dateStamp()      { return new Date().toLocaleDateString('en-ZA').replace(/\//g,'-'); }

// ---- WHATSAPP OCR PROCESSING ----

// Gemini API Key Management
function saveGeminiApiKey() {
    const key = document.getElementById('geminiApiKey').value.trim();
    const statusEl = document.getElementById('gemini-key-status');
    
    if (!key) {
        statusEl.innerHTML = '<span style="color:var(--red);">Please enter an API key</span>';
        return;
    }
    
    localStorage.setItem('gemini_api_key', key);
    statusEl.innerHTML = '<span style="color:#4cd964;"><i class="fas fa-check"></i> API key saved! Ready to process screenshots.</span>';
    document.getElementById('geminiApiKey').value = '';
    toast('Gemini API key saved', 'success');
}

function getGeminiApiKey() {
    return localStorage.getItem('gemini_api_key');
}

async function processWhatsAppOCR() {
    const fileInput = document.getElementById('whatsappImageInput');
    const file = fileInput.files[0];
    
    if (!file) {
        toast('Please select a WhatsApp screenshot first', 'error');
        return;
    }
    
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        toast('Please set up your Gemini API key first', 'error');
        document.getElementById('gemini-key-status').innerHTML = '<span style="color:var(--red);">⚠️ API key required! Get one from the link above.</span>';
        return;
    }
    
    const statusEl = document.getElementById('whatsapp-ocr-status');
    const resultsEl = document.getElementById('whatsapp-ocr-results');
    const btn = document.getElementById('btn-process-whatsapp');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    statusEl.innerHTML = '<div style="color:var(--purple);"><i class="fas fa-spinner fa-spin"></i> Analyzing WhatsApp chat with AI...</div>';
    resultsEl.innerHTML = '';
    
    try {
        // Convert image to base64
        const base64 = await fileToBase64(file);
        const base64Data = base64.split(',')[1]; // Remove data:image/... prefix
        
        // Build player context for AI
        const playerNames = players.map(p => `${p.name} (username: ${p.username})`).join(', ');
        const fixturesList = fixtures.map(f => `${f.home} vs ${f.away}`).join(', ');
        
        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: `You are analyzing a WhatsApp chat screenshot from a South African football league (EA FC Mobile). 

LEAGUE CONTEXT:
- Players: ${playerNames}
- Current fixtures: ${fixturesList}
- Language: English with South African slang

TASK: Scan this WhatsApp chat and identify:

1. POSTPONEMENT REQUESTS (STRICT RULES):
   - MUST have "@Tyron" or "@Astral" tag in the message
   - AND must contain words like "postpone", "postponement", "reschedule" 
   - IGNORE casual messages like "can't play now, later today", "play tonight instead" - these are NOT postponements
   - Only count as postponement if admin is tagged AND explicit postponement request

2. FORFEIT/GIVE-WIN:
   - If someone says "take the win", "take the W", "you can have the win", "I forfeit", "you win" - they're giving opponent a 3-0 win
   - The person who SENT the message loses (0-3), the opponent wins (3-0)

3. NO-SHOW REPORTS:
   - Must tag "@Tyron" or "@Astral" 
   - AND include "opponent didn't show", "no-show", "didn't arrive", "didn't pitch", "never showed up"
   - The person who submitted gets 3-0 win

4. MATCH RESULTS:
   - Game result screenshot showing score (numbers like "3-1", "2-0", "1-1")
   - Player names visible
   - Extract exact scores

SOUTH AFRICAN SLANG TO UNDERSTAND:
- "eish" = frustration
- "lekker" = good/great
- "yoh" = wow/surprise
- "ja/jy" = yes/you
- "neh" = right/isn't it
- "sharp/shap" = okay/cool
- "now now" = soon
- "just now" = later
- "bru/boet/china" = friend/bro

Return ONLY a JSON object (no markdown, no backticks):
{
  "postponements": [{"player": "username", "reason": "brief reason"}],
  "forfeits": [{"forfeitingPlayer": "username giving the win", "winningPlayer": "username receiving win"}],
  "noShows": [{"reporter": "username who submitted", "opponent": "username who didn't show"}],
  "results": [{"home": "username", "away": "username", "homeGoals": 0, "awayGoals": 0}]
}

If nothing found, return empty arrays. Match player names to usernames provided.`
                        },
                        {
                            inline_data: {
                                mime_type: file.type,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }
        
        // Extract text response from Gemini format
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            throw new Error('No response from AI');
        }
        
        // Parse JSON response
        let parsedData;
        try {
            // Remove any markdown code fences if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            parsedData = JSON.parse(cleanText);
        } catch (e) {
            throw new Error('Failed to parse AI response: ' + e.message);
        }
        
        // Show confirmation dialog with detected items
        showOCRConfirmation(parsedData, statusEl, resultsEl);
        
    } catch (error) {
        console.error('WhatsApp OCR Error:', error);
        statusEl.innerHTML = `<div style="color:var(--red);"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Process Screenshot';
    }
}

function showOCRConfirmation(parsedData, statusEl, resultsEl) {
    // Store the uploaded image for attaching to results
    const fileInput = document.getElementById('whatsappImageInput');
    const uploadedImage = fileInput.files[0];
    
    // Count detected items
    const postponementCount = parsedData.postponements?.length || 0;
    const forfeitCount = parsedData.forfeits?.length || 0;
    const noShowCount = parsedData.noShows?.length || 0;
    const resultCount = parsedData.results?.length || 0;
    const totalCount = postponementCount + forfeitCount + noShowCount + resultCount;
    
    if (totalCount === 0) {
        statusEl.innerHTML = '<div style="color:var(--orange);"><i class="fas fa-info-circle"></i> No postponements, forfeits, no-shows, or results detected in this screenshot.</div>';
        return;
    }
    
    // Build confirmation UI with checkboxes
    let confirmHTML = `
        <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);padding:14px;border-radius:8px;margin-top:12px;">
            <div style="font-size:0.9rem;color:var(--purple);font-weight:600;margin-bottom:12px;">
                <i class="fas fa-check-circle"></i> Detected ${totalCount} item(s) - Select which to apply:
            </div>
    `;
    
    // Show postponements
    if (postponementCount > 0) {
        confirmHTML += '<div style="margin-bottom:12px;"><div style="font-size:0.8rem;font-weight:600;color:var(--orange);margin-bottom:6px;">⏸ Postponements (${postponementCount}):</div>';
        parsedData.postponements.forEach((p, i) => {
            const player = players.find(pl => pl.username === p.player);
            const remaining = player ? (player.postponements || 0) : 0;
            confirmHTML += `
                <label style="display:flex;align-items:center;background:rgba(255,149,0,0.08);border:1px solid rgba(255,149,0,0.2);padding:8px;border-radius:6px;margin-bottom:4px;font-size:0.75rem;cursor:pointer;">
                    <input type="checkbox" class="ocr-checkbox" data-type="postponement" data-index="${i}" checked style="margin-right:8px;cursor:pointer;">
                    <div style="flex:1;">
                        <strong>${p.player}</strong> - ${p.reason} <span style="color:var(--muted);">(${remaining} → ${remaining-1} remaining)</span>
                    </div>
                </label>
            `;
        });
        confirmHTML += '</div>';
    }
    
    // Show forfeits
    if (forfeitCount > 0) {
        confirmHTML += '<div style="margin-bottom:12px;"><div style="font-size:0.8rem;font-weight:600;color:#FFD600;margin-bottom:6px;">🏳️ Forfeits / Give Wins (${forfeitCount}):</div>';
        parsedData.forfeits.forEach((f, i) => {
            confirmHTML += `
                <label style="display:flex;align-items:center;background:rgba(255,214,0,0.08);border:1px solid rgba(255,214,0,0.2);padding:8px;border-radius:6px;margin-bottom:4px;font-size:0.75rem;cursor:pointer;">
                    <input type="checkbox" class="ocr-checkbox" data-type="forfeit" data-index="${i}" checked style="margin-right:8px;cursor:pointer;">
                    <div style="flex:1;">
                        <strong>${f.forfeitingPlayer}</strong> forfeits → <strong>${f.winningPlayer}</strong> wins 3-0
                    </div>
                </label>
            `;
        });
        confirmHTML += '</div>';
    }
    
    // Show no-shows
    if (noShowCount > 0) {
        confirmHTML += '<div style="margin-bottom:12px;"><div style="font-size:0.8rem;font-weight:600;color:#4cd964;margin-bottom:6px;">⚡ No-Show Wins (${noShowCount}):</div>';
        parsedData.noShows.forEach((ns, i) => {
            confirmHTML += `
                <label style="display:flex;align-items:center;background:rgba(76,217,100,0.08);border:1px solid rgba(76,217,100,0.2);padding:8px;border-radius:6px;margin-bottom:4px;font-size:0.75rem;cursor:pointer;">
                    <input type="checkbox" class="ocr-checkbox" data-type="noshow" data-index="${i}" checked style="margin-right:8px;cursor:pointer;">
                    <div style="flex:1;">
                        <strong>${ns.reporter}</strong> wins 3-0 vs <strong>${ns.opponent}</strong> (no-show)
                    </div>
                </label>
            `;
        });
        confirmHTML += '</div>';
    }
    
    // Show results
    if (resultCount > 0) {
        confirmHTML += '<div style="margin-bottom:12px;"><div style="font-size:0.8rem;font-weight:600;color:#4285f4;margin-bottom:6px;">⚽ Match Results (${resultCount}):</div>';
        parsedData.results.forEach((r, i) => {
            confirmHTML += `
                <label style="display:flex;align-items:center;background:rgba(66,133,244,0.08);border:1px solid rgba(66,133,244,0.2);padding:8px;border-radius:6px;margin-bottom:4px;font-size:0.75rem;cursor:pointer;">
                    <input type="checkbox" class="ocr-checkbox" data-type="result" data-index="${i}" checked style="margin-right:8px;cursor:pointer;">
                    <div style="flex:1;">
                        <strong>${r.home}</strong> ${r.homeGoals} - ${r.awayGoals} <strong>${r.away}</strong>
                    </div>
                </label>
            `;
        });
        confirmHTML += '</div>';
    }
    
    confirmHTML += `
        <div style="display:flex;gap:8px;margin-top:12px;">
            <button onclick="applySelectedOCRChanges()" 
                style="flex:1;background:#4cd964;color:#000;border:none;padding:10px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">
                <i class="fas fa-check"></i> Apply Selected
            </button>
            <button onclick="cancelOCRChanges()" 
                style="flex:1;background:rgba(255,59,59,0.1);color:var(--red);border:1px solid rgba(255,59,59,0.25);padding:10px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">
                <i class="fas fa-times"></i> Cancel All
            </button>
        </div>
    </div>
    `;
    
    statusEl.innerHTML = '<div style="color:#4cd964;"><i class="fas fa-check-circle"></i> AI analysis complete!</div>';
    resultsEl.innerHTML = confirmHTML;
    
    // Store data for later use
    window._ocrPendingData = { parsedData, uploadedImage };
}

function cancelOCRChanges() {
    document.getElementById('whatsapp-ocr-results').innerHTML = '';
    document.getElementById('whatsapp-ocr-status').innerHTML = '<div style="color:var(--muted);"><i class="fas fa-times-circle"></i> Cancelled - no changes made.</div>';
    window._ocrPendingData = null;
}

async function applySelectedOCRChanges() {
    if (!window._ocrPendingData) return;
    
    const { parsedData, uploadedImage } = window._ocrPendingData;
    const resultsEl = document.getElementById('whatsapp-ocr-results');
    const statusEl = document.getElementById('whatsapp-ocr-status');
    
    statusEl.innerHTML = '<div style="color:var(--purple);"><i class="fas fa-spinner fa-spin"></i> Applying selected changes...</div>';
    
    // Get selected checkboxes
    const checkboxes = document.querySelectorAll('.ocr-checkbox:checked');
    const selected = { postponements: [], forfeits: [], noShows: [], results: [] };
    
    checkboxes.forEach(cb => {
        const type = cb.dataset.type;
        const index = parseInt(cb.dataset.index);
        
        if (type === 'postponement' && parsedData.postponements) {
            selected.postponements.push(parsedData.postponements[index]);
        } else if (type === 'forfeit' && parsedData.forfeits) {
            selected.forfeits.push(parsedData.forfeits[index]);
        } else if (type === 'noshow' && parsedData.noShows) {
            selected.noShows.push(parsedData.noShows[index]);
        } else if (type === 'result' && parsedData.results) {
            selected.results.push(parsedData.results[index]);
        }
    });
    
    // Convert uploaded image to base64 for storing with results
    let imageDataUrl = null;
    if (uploadedImage) {
        imageDataUrl = await fileToBase64(uploadedImage);
    }
    
    let actions = [];
    
    // Handle postponements
    for (const postponement of selected.postponements) {
        const match = fixtures.find(f => 
            f.home === postponement.player || f.away === postponement.player
        );
        
        if (match && !match.postponedBy) {
            const player = players.find(p => p.username === postponement.player);
            if (player && (player.postponements || 0) > 0) {
                player.postponements = (player.postponements || 20) - 1;
                match.postponedBy = postponement.player;
                actions.push(`✅ Postponed ${match.home} vs ${match.away} by ${postponement.player}`);
                
                await sendDiscordWebhook({
                    type: 'postponement',
                    player: postponement.player,
                    match: `${match.home} vs ${match.away}`,
                    remaining: player.postponements
                });
            } else {
                actions.push(`⚠️ ${postponement.player} has no postponements left`);
            }
        }
    }
    
    // Handle forfeits
    for (const forfeit of selected.forfeits) {
        const match = fixtures.find(f => 
            (f.home === forfeit.forfeitingPlayer && f.away === forfeit.winningPlayer) ||
            (f.away === forfeit.forfeitingPlayer && f.home === forfeit.winningPlayer)
        );
        
        if (match) {
            const winnerIsHome = match.home === forfeit.winningPlayer;
            const homeGoals = winnerIsHome ? 3 : 0;
            const awayGoals = winnerIsHome ? 0 : 3;
            
            const homeP = players.find(p => p.username === match.home);
            const awayP = players.find(p => p.username === match.away);
            
            if (homeP && awayP) {
                homeP.played = (homeP.played || 0) + 1;
                awayP.played = (awayP.played || 0) + 1;
                homeP.gf = (homeP.gf || 0) + homeGoals;
                homeP.ga = (homeP.ga || 0) + awayGoals;
                awayP.gf = (awayP.gf || 0) + awayGoals;
                awayP.ga = (awayP.ga || 0) + homeGoals;
                
                if (winnerIsHome) {
                    homeP.wins = (homeP.wins || 0) + 1;
                    homeP.points = (homeP.points || 0) + 3;
                    awayP.losses = (awayP.losses || 0) + 1;
                    addForm(homeP, 'W');
                    addForm(awayP, 'L');
                } else {
                    awayP.wins = (awayP.wins || 0) + 1;
                    awayP.points = (awayP.points || 0) + 3;
                    homeP.losses = (homeP.losses || 0) + 1;
                    addForm(awayP, 'W');
                    addForm(homeP, 'L');
                }
                
                results.push({
                    home: match.home,
                    away: match.away,
                    result: winnerIsHome ? 'home' : 'away',
                    homeGoals,
                    awayGoals,
                    id: Date.now() + Math.random(),
                    forfeit: true,
                    imageDataUrl
                });
                
                fixtures.splice(fixtures.indexOf(match), 1);
                actions.push(`✅ Forfeit: ${forfeit.winningPlayer} 3-0 ${forfeit.forfeitingPlayer}`);
                
                await sendDiscordWebhook({
                    type: 'forfeit',
                    winner: forfeit.winningPlayer,
                    forfeiter: forfeit.forfeitingPlayer,
                    score: `${homeGoals}-${awayGoals}`,
                    imageDataUrl
                });
            }
        }
    }
    
    // Handle no-shows
    for (const noShow of selected.noShows) {
        const match = fixtures.find(f => 
            (f.home === noShow.reporter && f.away === noShow.opponent) ||
            (f.away === noShow.reporter && f.home === noShow.opponent)
        );
        
        if (match) {
            const reporterIsHome = match.home === noShow.reporter;
            const homeGoals = reporterIsHome ? 3 : 0;
            const awayGoals = reporterIsHome ? 0 : 3;
            
            const homeP = players.find(p => p.username === match.home);
            const awayP = players.find(p => p.username === match.away);
            
            if (homeP && awayP) {
                homeP.played = (homeP.played || 0) + 1;
                awayP.played = (awayP.played || 0) + 1;
                homeP.gf = (homeP.gf || 0) + homeGoals;
                homeP.ga = (homeP.ga || 0) + awayGoals;
                awayP.gf = (awayP.gf || 0) + awayGoals;
                awayP.ga = (awayP.ga || 0) + homeGoals;
                
                if (reporterIsHome) {
                    homeP.wins = (homeP.wins || 0) + 1;
                    homeP.points = (homeP.points || 0) + 3;
                    awayP.losses = (awayP.losses || 0) + 1;
                    addForm(homeP, 'W');
                    addForm(awayP, 'L');
                } else {
                    awayP.wins = (awayP.wins || 0) + 1;
                    awayP.points = (awayP.points || 0) + 3;
                    homeP.losses = (homeP.losses || 0) + 1;
                    addForm(awayP, 'W');
                    addForm(homeP, 'L');
                }
                
                results.push({
                    home: match.home,
                    away: match.away,
                    result: reporterIsHome ? 'home' : 'away',
                    homeGoals,
                    awayGoals,
                    id: Date.now() + Math.random(),
                    autoWin: true,
                    imageDataUrl
                });
                
                fixtures.splice(fixtures.indexOf(match), 1);
                actions.push(`✅ No-show win: ${noShow.reporter} 3-0 ${noShow.opponent}`);
                
                await sendDiscordWebhook({
                    type: 'noshow',
                    winner: noShow.reporter,
                    noshow: noShow.opponent,
                    score: `${homeGoals}-${awayGoals}`,
                    imageDataUrl
                });
            }
        }
    }
    
    // Handle results
    for (const result of selected.results) {
        const match = fixtures.find(f => 
            (f.home === result.home && f.away === result.away) ||
            (f.away === result.home && f.home === result.away)
        );
        
        if (match) {
            const homeP = players.find(p => p.username === match.home);
            const awayP = players.find(p => p.username === match.away);
            
            if (homeP && awayP) {
                let homeGoals = result.homeGoals;
                let awayGoals = result.awayGoals;
                
                if (match.away === result.home) {
                    [homeGoals, awayGoals] = [awayGoals, homeGoals];
                }
                
                homeP.played = (homeP.played || 0) + 1;
                awayP.played = (awayP.played || 0) + 1;
                homeP.gf = (homeP.gf || 0) + homeGoals;
                homeP.ga = (homeP.ga || 0) + awayGoals;
                awayP.gf = (awayP.gf || 0) + awayGoals;
                awayP.ga = (awayP.ga || 0) + homeGoals;
                
                let matchResult;
                if (homeGoals > awayGoals) {
                    matchResult = 'home';
                    homeP.wins = (homeP.wins || 0) + 1;
                    homeP.points = (homeP.points || 0) + 3;
                    awayP.losses = (awayP.losses || 0) + 1;
                    addForm(homeP, 'W');
                    addForm(awayP, 'L');
                } else if (awayGoals > homeGoals) {
                    matchResult = 'away';
                    awayP.wins = (awayP.wins || 0) + 1;
                    awayP.points = (awayP.points || 0) + 3;
                    homeP.losses = (homeP.losses || 0) + 1;
                    addForm(awayP, 'W');
                    addForm(homeP, 'L');
                } else {
                    matchResult = 'draw';
                    homeP.draws = (homeP.draws || 0) + 1;
                    homeP.points = (homeP.points || 0) + 1;
                    awayP.draws = (awayP.draws || 0) + 1;
                    awayP.points = (awayP.points || 0) + 1;
                    addForm(homeP, 'D');
                    addForm(awayP, 'D');
                }
                
                results.push({
                    home: match.home,
                    away: match.away,
                    result: matchResult,
                    homeGoals,
                    awayGoals,
                    id: Date.now() + Math.random(),
                    imageDataUrl
                });
                
                fixtures.splice(fixtures.indexOf(match), 1);
                actions.push(`✅ Result logged: ${match.home} ${homeGoals}-${awayGoals} ${match.away}`);
                
                await sendDiscordWebhook({
                    type: 'result',
                    home: match.home,
                    away: match.away,
                    score: `${homeGoals}-${awayGoals}`,
                    result: matchResult,
                    imageDataUrl
                });
            }
        }
    }
    
    // Save changes and sync
    await saveData();
    
    // Auto-sync to public leaderboard
    await autoSyncPublicLeaderboard();
    
    renderAll();
    
    // Display final results
    statusEl.innerHTML = '<div style="color:#4cd964;"><i class="fas fa-check-circle"></i> Selected changes applied successfully!</div>';
    resultsEl.innerHTML = `
        <div style="background:rgba(76,217,100,0.08);border:1px solid rgba(76,217,100,0.25);padding:12px;border-radius:8px;margin-top:8px;">
            <div style="font-size:0.85rem;color:#4cd964;font-weight:600;margin-bottom:8px;">✅ Changes Applied:</div>
            ${actions.map(a => `<div style="font-size:0.8rem;color:var(--text);margin:4px 0;">${a}</div>`).join('')}
        </div>
    `;
    
    toast('WhatsApp OCR changes applied!', 'success');
    window._ocrPendingData = null;
}

// ---- DISCORD WEBHOOK ----
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1490038911446024373/hF9PEIg5K4Aafed80pXjXg7GbHqYAB05kn2q-l96_9DpYsJ7KrU5hL50PrZUWo-6l1sy';

async function sendDiscordWebhook(data) {
    try {
        let embed;
        
        if (data.type === 'postponement') {
            embed = {
                title: '⏸️ Match Postponed',
                description: `**${data.player}** postponed their match`,
                color: 0xFF9500, // Orange
                fields: [
                    { name: 'Match', value: data.match, inline: true },
                    { name: 'Postponements Remaining', value: `${data.remaining}/20`, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
        } else if (data.type === 'forfeit') {
            embed = {
                title: '🏳️ Match Forfeited',
                description: `**${data.forfeiter}** forfeited → **${data.winner}** wins 3-0`,
                color: 0xFFD600, // Yellow
                fields: [
                    { name: 'Winner', value: data.winner, inline: true },
                    { name: 'Forfeiter', value: data.forfeiter, inline: true },
                    { name: 'Final Score', value: data.score, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
            if (data.imageDataUrl) {
                embed.thumbnail = { url: 'attachment://evidence.png' };
            }
        } else if (data.type === 'noshow') {
            embed = {
                title: '⚡ No-Show Win Awarded',
                description: `**${data.winner}** awarded 3-0 win vs **${data.noshow}** (no-show)`,
                color: 0x4CD964, // Green
                fields: [
                    { name: 'Winner', value: data.winner, inline: true },
                    { name: 'No-Show', value: data.noshow, inline: true },
                    { name: 'Final Score', value: data.score, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
            if (data.imageDataUrl) {
                embed.thumbnail = { url: 'attachment://evidence.png' };
            }
        } else if (data.type === 'result') {
            const resultText = data.result === 'home' ? `${data.home} wins` : 
                              data.result === 'away' ? `${data.away} wins` : 'Draw';
            embed = {
                title: '⚽ Match Result Logged',
                description: `**${data.home}** ${data.score} **${data.away}**`,
                color: 0x4285F4, // Blue
                fields: [
                    { name: 'Home', value: data.home, inline: true },
                    { name: 'Away', value: data.away, inline: true },
                    { name: 'Result', value: resultText, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
            if (data.imageDataUrl) {
                embed.thumbnail = { url: 'attachment://evidence.png' };
            }
        } else if (data.type === 'suspension') {
            embed = {
                title: data.suspended ? '🚫 Player Suspended' : '▶️ Player Reactivated',
                description: `**${data.player}** has been ${data.suspended ? 'suspended' : 'reactivated'}`,
                color: data.suspended ? 0xFF3B3B : 0x4CD964,
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
        } else if (data.type === 'pageload') {
            embed = {
                title: '🌐 Website Accessed',
                description: `League website loaded`,
                color: 0x8B5CF6, // Purple
                timestamp: new Date().toISOString(),
                footer: { text: 'Mettlestate League Manager' }
            };
        }
        
        const formData = new FormData();
        
        // Add image if present
        if (data.imageDataUrl && embed.thumbnail) {
            const blob = await (await fetch(data.imageDataUrl)).blob();
            formData.append('file', blob, 'evidence.png');
        }
        
        formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
        
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.error('Discord webhook error:', error);
    }
}

// ---- AUTO-SYNC PUBLIC LEADERBOARD ----
async function autoSyncPublicLeaderboard() {
    const pubConfig = localStorage.getItem('eafc_public_gh');
    if (!pubConfig) return; // No public repo configured
    
    try {
        const config = JSON.parse(pubConfig);
        await pushToPublicLeaderboard(true); // silent = true
    } catch (error) {
        console.error('Auto-sync to public leaderboard failed:', error);
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
