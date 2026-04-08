/* =============================================
   2048 ULTIMATE — Complete Game Engine
   ============================================= */
(function () {
    'use strict';

    // ============================================================
    //  CONSTANTS & CONFIG
    // ============================================================
    const WINNING_VALUE = 2048;
    const MAX_UNDOS = 3;
    const MAX_HINTS = 3;
    const MODES = {
        classic: { icon: '🎮', name: 'Classic' },
        timed:   { icon: '⏱️', name: 'Timed' },
        zen:     { icon: '🧘', name: 'Zen' },
        daily:   { icon: '📅', name: 'Daily' },
        hard:    { icon: '💀', name: 'Hard' },
    };

    // ============================================================
    //  STATE
    // ============================================================
    let gridSize = parseInt(localStorage.getItem('2048-gridSize') || '4', 10);
    let grid = [];
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('2048-best') || '0', 10);
    let gameOver = false;
    let gameWon = false;
    let keepPlaying = false;
    let moving = false;
    let moveCount = 0;
    let timerSeconds = 0;
    let timerInterval = null;
    let undosLeft = MAX_UNDOS;
    let hintsLeft = MAX_HINTS;
    let history = [];
    let soundEnabled = localStorage.getItem('2048-sound') !== 'off';
    let musicEnabled = localStorage.getItem('2048-music') === 'on';
    let hapticEnabled = localStorage.getItem('2048-haptic') !== 'off';
    let auroraEnabled = localStorage.getItem('2048-aurora') !== 'off';
    let volume = parseInt(localStorage.getItem('2048-volume') || '50', 10);
    let currentTheme = localStorage.getItem('2048-theme') || 'dark';
    let currentMode = localStorage.getItem('2048-mode') || 'classic';
    let timedDuration = parseInt(localStorage.getItem('2048-timedDuration') || '120', 10);
    let playerName = localStorage.getItem('2048-name') || '';
    let activePanel = 'game';
    let replayMoves = [];
    let lastReplay = JSON.parse(localStorage.getItem('2048-lastReplay') || 'null');
    let replayPlaying = false;
    let replayIndex = 0;
    let replayTimer = null;
    let challengeSeed = null;
    let comboCount = 0;
    let tileId = 0;

    // Stats
    let stats = JSON.parse(localStorage.getItem('2048-stats') || JSON.stringify({
        gamesPlayed: 0, gamesWon: 0, highestTile: 0, totalScore: 0, totalMoves: 0,
    }));

    // Achievements
    const ACHIEVEMENTS = [
        { id: 'first_merge',  icon: '🔗', name: 'First Merge',    desc: 'Merge your first tiles',          check: () => stats.totalMoves >= 1 },
        { id: 'score_500',    icon: '⭐', name: 'Rising Star',    desc: 'Reach a score of 500',            check: () => bestScore >= 500 },
        { id: 'score_2000',   icon: '🌟', name: 'Score Master',   desc: 'Reach a score of 2,000',          check: () => bestScore >= 2000 },
        { id: 'score_10000',  icon: '💫', name: 'Score Legend',   desc: 'Reach a score of 10,000',         check: () => bestScore >= 10000 },
        { id: 'score_50000',  icon: '🔥', name: 'Unstoppable',   desc: 'Reach a score of 50,000',         check: () => bestScore >= 50000 },
        { id: 'tile_128',     icon: '🟨', name: 'Warming Up',    desc: 'Create a 128 tile',               check: () => stats.highestTile >= 128 },
        { id: 'tile_256',     icon: '🟧', name: 'Getting There', desc: 'Create a 256 tile',               check: () => stats.highestTile >= 256 },
        { id: 'tile_512',     icon: '🟥', name: 'Halfway There', desc: 'Create a 512 tile',               check: () => stats.highestTile >= 512 },
        { id: 'tile_1024',    icon: '🟪', name: 'So Close!',     desc: 'Create a 1024 tile',              check: () => stats.highestTile >= 1024 },
        { id: 'tile_2048',    icon: '🏆', name: 'Champion',      desc: 'Reach the legendary 2048!',       check: () => stats.highestTile >= 2048 },
        { id: 'tile_4096',    icon: '👑', name: 'Beyond Limits', desc: 'Create a 4096 tile',              check: () => stats.highestTile >= 4096 },
        { id: 'games_10',     icon: '🎮', name: 'Dedicated',     desc: 'Play 10 games',                   check: () => stats.gamesPlayed >= 10 },
        { id: 'games_50',     icon: '🎯', name: 'Addicted',      desc: 'Play 50 games',                   check: () => stats.gamesPlayed >= 50 },
        { id: 'wins_5',       icon: '🥇', name: 'Serial Winner', desc: 'Win 5 games',                     check: () => stats.gamesWon >= 5 },
    ];

    let unlockedAchievements = JSON.parse(localStorage.getItem('2048-achievements') || '[]');
    let leaderboard = JSON.parse(localStorage.getItem('2048-leaderboard') || '[]');

    // ============================================================
    //  DOM REFS
    // ============================================================
    const $ = id => document.getElementById(id);
    const tileContainer = $('tile-container');
    const gridBackground = $('grid-background');
    const scoreEl = $('score');
    const bestScoreEl = $('best-score');
    const scoreAddition = $('score-addition');
    const gameMessage = $('game-message');
    const messageText = $('message-text');
    const messageSub = $('message-sub');
    const newGameBtn = $('new-game-btn');
    const retryBtn = $('retry-btn');
    const keepPlayingBtn = $('keep-playing-btn');
    const shareBtn = $('share-btn');
    const undoBtn = $('undo-btn');
    const undoCountEl = $('undo-count');
    const hintBtn = $('hint-btn');
    const hintCountEl = $('hint-count');
    const hintOverlay = $('hint-overlay');
    const hintArrow = $('hint-arrow');
    const moveCountEl = $('move-count');
    const timerEl = $('timer');
    const modeBadge = $('mode-badge');
    const modeIcon = $('mode-icon');
    const modeName = $('mode-name');
    const settingsBtn = $('settings-btn');
    const settingsModal = $('settings-modal');
    const closeSettingsBtn = $('close-settings');
    const shareModal = $('share-modal');
    const closeShareBtn = $('close-share');
    const shareCanvas = $('share-canvas');
    const shareDownload = $('share-download');
    const shareCopy = $('share-copy');
    const themeOptions = $('theme-options');
    const sizeOptions = $('size-options');
    const modeOptions = $('mode-options');
    const timedOptions = $('timed-options');
    const soundToggle = $('sound-toggle');
    const soundLabel = $('sound-label');
    const musicToggle = $('music-toggle');
    const musicLabel = $('music-label');
    const hapticToggle = $('haptic-toggle');
    const hapticLabel = $('haptic-label');
    const auroraToggle = $('aurora-toggle');
    const auroraLabel = $('aurora-label');
    const volumeSlider = $('volume-slider');
    const playerNameInput = $('player-name');
    const challengeCode = $('challenge-code');
    const copyChallenge = $('copy-challenge');
    const genChallenge = $('gen-challenge');
    const comboDisplay = $('combo-display');
    const comboText = $('combo-text');
    const countdownOverlay = $('countdown-overlay');
    const countdownNumber = $('countdown-number');
    const offlineBadge = $('offline-badge');
    const installBanner = $('install-banner');
    const installBtn = $('install-btn');
    const dismissInstall = $('dismiss-install');
    const particleCanvas = $('particle-canvas');
    const confettiCanvas = $('confetti-canvas');
    const auroraCanvas = $('aurora-canvas');
    const toastEl = $('achievement-toast');
    const toastDesc = $('toast-desc');
    const tutorialOverlay = $('tutorial-overlay');
    const replayBar = $('replay-bar');
    const replaySlider = $('replay-slider');
    const replayStepEl = $('replay-step');
    const watchReplayBtn = $('watch-replay-btn');

    // ============================================================
    //  SEEDED RNG (for Daily & Challenge modes)
    // ============================================================
    class SeededRNG {
        constructor(seed) {
            this.seed = seed;
        }
        next() {
            this.seed = (this.seed * 16807 + 0) % 2147483647;
            return (this.seed - 1) / 2147483646;
        }
    }
    let rng = null;

    function getRandom() {
        return rng ? rng.next() : Math.random();
    }

    function getDailySeed() {
        const d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    // ============================================================
    //  AUDIO ENGINE (Web Audio API)
    // ============================================================
    let audioCtx = null;
    let musicNodes = null;

    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }

    function getVol() { return (volume / 100) * 0.15; }

    function playTone(freq, dur, type = 'sine', vol) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioCtx();
            const v = vol != null ? vol : getVol();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(v, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
        } catch (e) { /* ignore */ }
    }

    const SFX = {
        move()       { playTone(220, 0.08, 'sine'); },
        merge(val)   { const b = 300 + Math.log2(val) * 40; playTone(b, 0.15, 'triangle'); setTimeout(() => playTone(b * 1.25, 0.12, 'sine'), 60); },
        win()        { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine'), i * 120)); },
        lose()       { playTone(200, 0.3, 'sawtooth'); setTimeout(() => playTone(150, 0.4, 'sawtooth'), 150); },
        undo()       { playTone(500, 0.1); setTimeout(() => playTone(400, 0.1), 50); },
        achievement(){ [660, 880, 1100].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'triangle'), i * 100)); },
        hint()       { playTone(880, 0.15, 'sine'); },
        combo(n)     { playTone(400 + n * 100, 0.2, 'triangle'); },
        countdown()  { playTone(600, 0.15, 'square'); },
    };

    // Background music — ambient drone
    function startMusic() {
        if (!musicEnabled || musicNodes) return;
        try {
            const ctx = getAudioCtx();
            const gain = ctx.createGain();
            gain.gain.setValueAtTime((volume / 100) * 0.03, ctx.currentTime);
            gain.connect(ctx.destination);

            const notes = [130.81, 164.81, 196.00]; // C3, E3, G3
            const oscs = notes.map(freq => {
                const o = ctx.createOscillator();
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, ctx.currentTime);
                o.connect(gain);
                o.start();
                return o;
            });

            // LFO for slow wobble
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
            lfoGain.gain.setValueAtTime(3, ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(oscs[0].frequency);
            lfo.start();

            musicNodes = { oscs, gain, lfo, lfoGain };
        } catch (e) { /* ignore */ }
    }

    function stopMusic() {
        if (!musicNodes) return;
        try {
            musicNodes.oscs.forEach(o => o.stop());
            musicNodes.lfo.stop();
        } catch (e) { /* ignore */ }
        musicNodes = null;
    }

    function updateMusicVolume() {
        if (musicNodes) {
            try { musicNodes.gain.gain.setValueAtTime((volume / 100) * 0.03, getAudioCtx().currentTime); } catch (e) {}
        }
    }

    // ============================================================
    //  HAPTIC
    // ============================================================
    function vibrate(pattern) {
        if (!hapticEnabled || !navigator.vibrate) return;
        navigator.vibrate(pattern);
    }

    // ============================================================
    //  AURORA BACKGROUND
    // ============================================================
    const aCtx = auroraCanvas.getContext('2d');
    let auroraTime = 0;
    let auroraRunning = false;

    function resizeCanvases() {
        const w = window.innerWidth, h = window.innerHeight;
        particleCanvas.width = w; particleCanvas.height = h;
        confettiCanvas.width = w; confettiCanvas.height = h;
        auroraCanvas.width = w; auroraCanvas.height = h;
    }
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    function drawAurora() {
        if (!auroraEnabled) {
            aCtx.clearRect(0, 0, auroraCanvas.width, auroraCanvas.height);
            auroraRunning = false;
            return;
        }
        auroraRunning = true;
        const w = auroraCanvas.width, h = auroraCanvas.height;
        aCtx.clearRect(0, 0, w, h);
        auroraTime += 0.003;

        const style = getComputedStyle(document.documentElement);
        const accentRgb = style.getPropertyValue('--accent-rgb').trim() || '102,126,234';
        const accent2Rgb = style.getPropertyValue('--accent2-rgb').trim() || '118,75,162';

        for (let i = 0; i < 3; i++) {
            const yBase = h * (0.2 + i * 0.25);
            const amplitude = h * 0.1;
            aCtx.beginPath();
            aCtx.moveTo(0, yBase);
            for (let x = 0; x <= w; x += 4) {
                const y = yBase + Math.sin(x * 0.003 + auroraTime + i * 2) * amplitude
                    + Math.sin(x * 0.007 + auroraTime * 1.5 + i) * (amplitude * 0.5);
                aCtx.lineTo(x, y);
            }
            aCtx.lineTo(w, h);
            aCtx.lineTo(0, h);
            aCtx.closePath();

            const rgb = i % 2 === 0 ? accentRgb : accent2Rgb;
            const grad = aCtx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 2);
            grad.addColorStop(0, `rgba(${rgb}, 0)`);
            grad.addColorStop(0.5, `rgba(${rgb}, 0.04)`);
            grad.addColorStop(1, `rgba(${rgb}, 0)`);
            aCtx.fillStyle = grad;
            aCtx.fill();
        }
        requestAnimationFrame(drawAurora);
    }

    // ============================================================
    //  PARTICLE SYSTEM
    // ============================================================
    const pCtx = particleCanvas.getContext('2d');
    let particles = [];

    class Particle {
        constructor(x, y, color) {
            this.x = x; this.y = y;
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.life = 1;
            this.decay = 0.02 + Math.random() * 0.02;
            this.size = 3 + Math.random() * 4;
            this.color = color;
        }
        update() { this.x += this.vx; this.y += this.vy; this.vy += 0.15; this.life -= this.decay; this.size *= 0.97; }
        draw(ctx) { ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
    }

    const TILE_COLORS = { 2:'#2d3561',4:'#3b4578',8:'#5b6abf',16:'#667eea',32:'#764ba2',64:'#f093fb',128:'#f5af19',256:'#f7971e',512:'#ee0979',1024:'#f7971e',2048:'#667eea' };

    function emitParticles(sx, sy, value) {
        const color = TILE_COLORS[value] || '#667eea';
        const count = Math.min(12 + Math.log2(value) * 2, 30);
        for (let i = 0; i < count; i++) particles.push(new Particle(sx, sy, color));
    }

    function animateParticles() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) { p.update(); p.draw(pCtx); }
        pCtx.globalAlpha = 1;
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ============================================================
    //  CONFETTI SYSTEM
    // ============================================================
    const cCtx = confettiCanvas.getContext('2d');
    let confetti = [];
    let confettiRunning = false;

    class ConfettiPiece {
        constructor() {
            this.x = Math.random() * confettiCanvas.width;
            this.y = -20 - Math.random() * 200;
            this.w = 6 + Math.random() * 6;
            this.h = 4 + Math.random() * 4;
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = 2 + Math.random() * 4;
            this.rotation = Math.random() * 360;
            this.rotSpeed = (Math.random() - 0.5) * 10;
            this.color = ['#667eea','#764ba2','#f093fb','#f5af19','#ee0979','#ffd200','#4caf60'][Math.floor(Math.random() * 7)];
            this.life = 1;
        }
        update() { this.x += this.vx; this.y += this.vy; this.vy += 0.03; this.rotation += this.rotSpeed; if (this.y > confettiCanvas.height + 20) this.life = 0; }
        draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation * Math.PI / 180); ctx.fillStyle = this.color; ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h); ctx.restore(); }
    }

    function launchConfetti() {
        confetti = [];
        for (let i = 0; i < 150; i++) confetti.push(new ConfettiPiece());
        if (!confettiRunning) { confettiRunning = true; animateConfetti(); }
        setTimeout(() => { for (let i = 0; i < 80; i++) confetti.push(new ConfettiPiece()); }, 500);
        setTimeout(() => { for (let i = 0; i < 60; i++) confetti.push(new ConfettiPiece()); }, 1000);
    }

    function animateConfetti() {
        cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confetti = confetti.filter(c => c.life > 0);
        for (const c of confetti) { c.update(); c.draw(cCtx); }
        if (confetti.length > 0) requestAnimationFrame(animateConfetti);
        else confettiRunning = false;
    }

    // ============================================================
    //  TILE SIZING
    // ============================================================
    let cellSize = 0, cellGap = 0, gridPadding = 0;

    function recalcSizes() {
        const el = $('grid'), rect = el.getBoundingClientRect();
        const s = getComputedStyle(document.documentElement);
        cellGap = parseFloat(s.getPropertyValue('--cell-gap'));
        gridPadding = parseFloat(s.getPropertyValue('--grid-padding'));
        const inner = rect.width - gridPadding * 2;
        cellSize = (inner - cellGap * (gridSize - 1)) / gridSize;
    }

    function tilePos(r, c) { return { top: r * (cellSize + cellGap), left: c * (cellSize + cellGap) }; }

    function tileFontSize(val) {
        const d = String(val).length, b = cellSize * 0.42;
        if (d <= 2) return b; if (d === 3) return b * 0.8; if (d === 4) return b * 0.65; return b * 0.52;
    }

    // ============================================================
    //  GRID HELPERS
    // ============================================================
    function createEmptyGrid() {
        const g = [];
        for (let r = 0; r < gridSize; r++) { g[r] = []; for (let c = 0; c < gridSize; c++) g[r][c] = null; }
        return g;
    }

    function emptyCells() {
        const cells = [];
        for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) if (!grid[r][c]) cells.push({ r, c });
        return cells;
    }

    function buildGridBg() {
        gridBackground.innerHTML = '';
        gridBackground.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gridBackground.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        for (let i = 0; i < gridSize * gridSize; i++) {
            const c = document.createElement('div');
            c.className = 'grid-cell';
            gridBackground.appendChild(c);
        }
    }

    // ============================================================
    //  TILE OBJECTS
    // ============================================================
    function createTile(r, c, value, noAnim) {
        const tile = { id: tileId++, r, c, value, el: null };
        const el = document.createElement('div');
        el.className = `tile tile-${value <= 2048 ? value : 'super'}${noAnim ? '' : ' tile-new'}`;
        el.textContent = value;
        const pos = tilePos(r, c);
        el.style.width = cellSize + 'px'; el.style.height = cellSize + 'px';
        el.style.top = pos.top + 'px'; el.style.left = pos.left + 'px';
        el.style.fontSize = tileFontSize(value) + 'px'; el.style.lineHeight = cellSize + 'px';
        tileContainer.appendChild(el);
        tile.el = el;
        el.addEventListener('animationend', () => el.classList.remove('tile-new', 'tile-merged'));
        return tile;
    }

    function updateTilePos(tile) { const p = tilePos(tile.r, tile.c); tile.el.style.top = p.top + 'px'; tile.el.style.left = p.left + 'px'; }

    function updateTileVal(tile, val) {
        tile.value = val; tile.el.textContent = val;
        tile.el.className = `tile tile-${val <= 2048 ? val : 'super'} tile-merged`;
        tile.el.style.width = cellSize + 'px'; tile.el.style.height = cellSize + 'px';
        tile.el.style.fontSize = tileFontSize(val) + 'px'; tile.el.style.lineHeight = cellSize + 'px';
    }

    function removeTileEl(tile) { if (tile.el?.parentNode) tile.el.parentNode.removeChild(tile.el); }

    // ============================================================
    //  TILE TRAIL EFFECT
    // ============================================================
    function spawnTrail(fromR, fromC, toR, toC, value) {
        const fromPos = tilePos(fromR, fromC);
        const trail = document.createElement('div');
        trail.className = `tile-trail tile-${value <= 2048 ? value : 'super'}`;
        trail.style.width = cellSize + 'px'; trail.style.height = cellSize + 'px';
        trail.style.top = fromPos.top + 'px'; trail.style.left = fromPos.left + 'px';
        tileContainer.appendChild(trail);
        setTimeout(() => { trail.style.opacity = '0'; }, 10);
        setTimeout(() => { if (trail.parentNode) trail.parentNode.removeChild(trail); }, 320);
    }

    // ============================================================
    //  SCREEN SHAKE
    // ============================================================
    function screenShake() {
        const el = $('grid');
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 300);
    }

    // ============================================================
    //  COMBO SYSTEM
    // ============================================================
    function showCombo(count) {
        if (count < 2) return;
        const labels = ['', '', 'Double!', 'Triple!', 'Quad!', 'MEGA!', 'ULTRA!', 'INSANE!'];
        const label = count < labels.length ? labels[count] : 'GODLIKE!';
        comboText.textContent = `${count}x ${label}`;
        comboDisplay.classList.remove('show');
        void comboDisplay.offsetWidth;
        comboDisplay.classList.add('show');
        SFX.combo(count);
        if (count >= 3) screenShake();
    }

    // ============================================================
    //  SPAWN
    // ============================================================
    function spawnTile() {
        const empty = emptyCells();
        if (empty.length === 0) return;
        const idx = Math.floor(getRandom() * empty.length);
        const cell = empty[idx];
        let value;
        if (currentMode === 'hard') {
            value = getRandom() < 0.6 ? 2 : 4;
        } else {
            value = getRandom() < 0.9 ? 2 : 4;
        }
        grid[cell.r][cell.c] = createTile(cell.r, cell.c, value);
    }

    // ============================================================
    //  SCORE
    // ============================================================
    function addScore(pts) {
        if (currentMode === 'zen') return; // no scoring in zen
        score += pts;
        scoreEl.textContent = score;
        if (score > bestScore) { bestScore = score; bestScoreEl.textContent = bestScore; localStorage.setItem('2048-best', bestScore.toString()); }
        scoreAddition.textContent = '+' + pts;
        scoreAddition.classList.remove('active');
        void scoreAddition.offsetWidth;
        scoreAddition.classList.add('active');
    }

    // ============================================================
    //  UNDO
    // ============================================================
    function saveSnapshot() {
        const snap = {
            grid: grid.map(row => row.map(t => t ? { r: t.r, c: t.c, value: t.value } : null)),
            score, moveCount,
        };
        history.push(snap);
        if (history.length > 10) history.shift();
    }

    function undo() {
        if (undosLeft <= 0 || history.length === 0 || gameOver || currentMode === 'daily') return;
        undosLeft--;
        undoCountEl.textContent = undosLeft;
        if (undosLeft <= 0) undoBtn.disabled = true;
        const snap = history.pop();
        tileContainer.innerHTML = '';
        grid = createEmptyGrid();
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++) {
                const s = snap.grid[r]?.[c];
                if (s) { grid[r][c] = createTile(r, c, s.value, true); }
            }
        score = snap.score; moveCount = snap.moveCount;
        scoreEl.textContent = score; moveCountEl.textContent = moveCount;
        SFX.undo(); vibrate(30);
    }

    // ============================================================
    //  AI HINT (simple heuristic)
    // ============================================================
    function cloneGrid() {
        return grid.map(row => row.map(t => t ? { value: t.value } : null));
    }

    function simulateMove(g, dir, gs) {
        const vec = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } }[dir];
        const rows = [], cols = [];
        for (let i = 0; i < gs; i++) { rows.push(i); cols.push(i); }
        if (vec.dr === 1) rows.reverse();
        if (vec.dc === 1) cols.reverse();

        let moved = false, pts = 0;
        const merged = new Set();
        const ng = g.map(r => r.slice());

        for (const r of rows) {
            for (const c of cols) {
                if (!ng[r][c]) continue;
                let pr = r, pc = c;
                let nr = r + vec.dr, nc = c + vec.dc;
                while (nr >= 0 && nr < gs && nc >= 0 && nc < gs && !ng[nr][nc]) {
                    pr = nr; pc = nc; nr += vec.dr; nc += vec.dc;
                }
                if (nr >= 0 && nr < gs && nc >= 0 && nc < gs && ng[nr][nc] &&
                    ng[nr][nc].value === ng[r][c].value && !merged.has(nr * gs + nc)) {
                    const nv = ng[r][c].value * 2;
                    ng[nr][nc] = { value: nv };
                    ng[r][c] = null;
                    merged.add(nr * gs + nc);
                    pts += nv;
                    moved = true;
                } else if (pr !== r || pc !== c) {
                    ng[pr][pc] = ng[r][c];
                    ng[r][c] = null;
                    moved = true;
                }
            }
        }
        let empty = 0, mono = 0, smooth = 0;
        for (let r = 0; r < gs; r++) for (let c = 0; c < gs; c++) {
            if (!ng[r][c]) { empty++; continue; }
            const v = ng[r][c].value;
            if (c < gs - 1 && ng[r][c + 1]) {
                if (ng[r][c + 1].value === v) smooth += v;
                if (ng[r][c + 1].value <= v) mono += v;
            }
            if (r < gs - 1 && ng[r + 1][c]) {
                if (ng[r + 1][c].value === v) smooth += v;
                if (ng[r + 1][c].value <= v) mono += v;
            }
        }
        return moved ? { score: pts + empty * 10 + mono * 2 + smooth * 4 } : null;
    }

    function getBestMove() {
        const dirs = ['up', 'down', 'left', 'right'];
        let best = null, bestScore = -1;
        const g = cloneGrid();
        for (const d of dirs) {
            const result = simulateMove(g, d, gridSize);
            if (result && result.score > bestScore) { bestScore = result.score; best = d; }
        }
        return best;
    }

    function showHint() {
        if (hintsLeft <= 0 || gameOver) return;
        hintsLeft--;
        hintCountEl.textContent = hintsLeft;
        if (hintsLeft <= 0) hintBtn.disabled = true;
        const dir = getBestMove();
        if (!dir) return;
        const arrows = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
        hintArrow.textContent = arrows[dir];
        hintOverlay.classList.add('show');
        SFX.hint();
        setTimeout(() => hintOverlay.classList.remove('show'), 1500);
    }

    // ============================================================
    //  TIMER
    // ============================================================
    function startTimer() {
        stopTimer();
        timerSeconds = currentMode === 'timed' ? timedDuration : 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            if (currentMode === 'timed') {
                timerSeconds--;
                if (timerSeconds <= 10 && timerSeconds > 0) SFX.countdown();
                if (timerSeconds <= 0) { timerSeconds = 0; updateTimerDisplay(); stopTimer(); gameOver = true; showMessage('lose'); SFX.lose(); vibrate([50, 30, 50]); endGame(); return; }
            } else {
                timerSeconds++;
            }
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

    function updateTimerDisplay() {
        const m = String(Math.floor(Math.abs(timerSeconds) / 60)).padStart(2, '0');
        const s = String(Math.abs(timerSeconds) % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        if (currentMode === 'timed' && timerSeconds <= 10) timerEl.style.color = '#e85050';
        else timerEl.style.color = '';
    }

    // ============================================================
    //  MOVE LOGIC
    // ============================================================
    function getVector(dir) {
        return { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } }[dir];
    }

    function buildTraversals(vec) {
        const rows = [], cols = [];
        for (let i = 0; i < gridSize; i++) { rows.push(i); cols.push(i); }
        if (vec.dr === 1) rows.reverse();
        if (vec.dc === 1) cols.reverse();
        return { rows, cols };
    }

    function findFarthest(r, c, vec) {
        let pr = r, pc = c, nr = r + vec.dr, nc = c + vec.dc;
        while (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !grid[nr][nc]) {
            pr = nr; pc = nc; nr += vec.dr; nc += vec.dc;
        }
        return {
            farthest: { r: pr, c: pc },
            next: (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) ? { r: nr, c: nc } : null,
        };
    }

    function getTileScreenPos(r, c) {
        const el = $('grid'), rect = el.getBoundingClientRect(), pos = tilePos(r, c);
        return { x: rect.left + gridPadding + pos.left + cellSize / 2, y: rect.top + gridPadding + pos.top + cellSize / 2 };
    }

    function move(direction) {
        if (gameOver || moving) return;
        if (gameWon && !keepPlaying) return;

        const vec = getVector(direction);
        const { rows, cols } = buildTraversals(vec);
        let moved = false;
        const mergedThisTurn = new Set();
        let pointsThisTurn = 0, mergeCount = 0, highestMerge = 0;

        saveSnapshot();

        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (grid[r][c]) grid[r][c].mergedFrom = null;

        for (const r of rows) {
            for (const c of cols) {
                const tile = grid[r][c];
                if (!tile) continue;
                const { farthest, next } = findFarthest(r, c, vec);

                if (next && grid[next.r][next.c] && grid[next.r][next.c].value === tile.value && !mergedThisTurn.has(grid[next.r][next.c].id)) {
                    const target = grid[next.r][next.c];
                    const newVal = tile.value * 2;

                    // Trail effect
                    spawnTrail(r, c, next.r, next.c, tile.value);

                    tile.r = next.r; tile.c = next.c;
                    updateTilePos(tile);
                    setTimeout(() => removeTileEl(tile), 130);
                    updateTileVal(target, newVal);
                    target.mergedFrom = tile;
                    mergedThisTurn.add(target.id);
                    grid[r][c] = null;
                    grid[next.r][next.c] = target;
                    pointsThisTurn += newVal;
                    mergeCount++;
                    highestMerge = Math.max(highestMerge, newVal);

                    const sp = getTileScreenPos(next.r, next.c);
                    emitParticles(sp.x, sp.y, newVal);

                    if (newVal === WINNING_VALUE && !keepPlaying && currentMode !== 'zen') gameWon = true;
                    if (newVal > stats.highestTile) { stats.highestTile = newVal; saveStats(); }
                    moved = true;
                } else if (farthest.r !== r || farthest.c !== c) {
                    spawnTrail(r, c, farthest.r, farthest.c, tile.value);
                    grid[r][c] = null;
                    grid[farthest.r][farthest.c] = tile;
                    tile.r = farthest.r; tile.c = farthest.c;
                    updateTilePos(tile);
                    moved = true;
                }
            }
        }

        if (!moved) { history.pop(); return; }

        replayMoves.push(direction);
        moving = true;
        moveCount++;
        moveCountEl.textContent = moveCount;
        stats.totalMoves++;
        saveStats();

        if (pointsThisTurn > 0) addScore(pointsThisTurn);

        // Combo
        if (mergeCount > 0) { comboCount++; } else { comboCount = 0; }
        if (comboCount >= 2) showCombo(comboCount);

        // Big merge shake (512+)
        if (highestMerge >= 512) screenShake();

        // Sound & haptic
        if (mergeCount > 0) { SFX.merge(highestMerge); vibrate(mergeCount > 2 ? [30, 20, 30] : 20); }
        else { SFX.move(); vibrate(10); comboCount = 0; }

        // Hard mode: spawn extra tiles
        const extraSpawns = currentMode === 'hard' ? 2 : 1;

        setTimeout(() => {
            for (let i = 0; i < extraSpawns; i++) spawnTile();
            moving = false;

            if (gameWon && !keepPlaying) {
                showMessage('win');
                SFX.win(); launchConfetti();
                stats.gamesWon++; saveStats();
            } else if (!movesAvailable()) {
                gameOver = true;
                showMessage('lose');
                SFX.lose(); vibrate([50, 30, 50]);
                endGame();
            }
            checkAchievements();
        }, 140);
    }

    function movesAvailable() {
        if (emptyCells().length > 0) return true;
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++) {
                const v = grid[r][c]?.value;
                if (v == null) continue;
                if (c < gridSize - 1 && grid[r][c + 1]?.value === v) return true;
                if (r < gridSize - 1 && grid[r + 1]?.[c]?.value === v) return true;
            }
        return false;
    }

    // ============================================================
    //  MESSAGES
    // ============================================================
    function showMessage(type) {
        if (type === 'win') {
            messageText.textContent = 'You Win! 🎉';
            messageText.className = 'win-text';
            messageSub.textContent = `Score: ${score} · Moves: ${moveCount}`;
            keepPlayingBtn.style.display = 'inline-flex';
        } else {
            messageText.textContent = 'Game Over';
            messageText.className = 'lose-text';
            messageSub.textContent = `Score: ${score} · Moves: ${moveCount}`;
            keepPlayingBtn.style.display = 'none';
        }
        gameMessage.classList.add('active');
    }

    function hideMessage() { gameMessage.classList.remove('active'); }

    // ============================================================
    //  STATS
    // ============================================================
    function saveStats() { localStorage.setItem('2048-stats', JSON.stringify(stats)); }

    function endGame() {
        stopTimer();
        stats.gamesPlayed++; stats.totalScore += score; saveStats();
        addToLeaderboard(score);
        lastReplay = { moves: [...replayMoves], gridSize, mode: currentMode, seed: challengeSeed || getDailySeed() };
        localStorage.setItem('2048-lastReplay', JSON.stringify(lastReplay));
    }

    function renderStats() {
        $('stat-games').textContent = stats.gamesPlayed;
        $('stat-wins').textContent = stats.gamesWon;
        $('stat-winrate').textContent = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) + '%' : '0%';
        $('stat-highest').textContent = stats.highestTile;
        $('stat-avgscore').textContent = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
        $('stat-totalmoves').textContent = stats.totalMoves;
        if (watchReplayBtn) watchReplayBtn.style.display = lastReplay ? 'flex' : 'none';
    }

    // ============================================================
    //  ACHIEVEMENTS
    // ============================================================
    function checkAchievements() {
        for (const a of ACHIEVEMENTS) {
            if (!unlockedAchievements.includes(a.id) && a.check()) {
                unlockedAchievements.push(a.id);
                localStorage.setItem('2048-achievements', JSON.stringify(unlockedAchievements));
                showAchievementToast(a);
                SFX.achievement(); vibrate([30, 15, 30, 15, 50]);
            }
        }
    }

    function showAchievementToast(a) {
        toastDesc.textContent = `${a.icon} ${a.name} — ${a.desc}`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    function renderAchievements() {
        const list = $('achievements-list');
        list.innerHTML = '';
        for (const a of ACHIEVEMENTS) {
            const u = unlockedAchievements.includes(a.id);
            const el = document.createElement('div');
            el.className = `achievement-item ${u ? 'unlocked' : 'locked'}`;
            el.innerHTML = `<span class="achievement-icon">${a.icon}</span><div class="achievement-info"><span class="achievement-name">${a.name}</span><span class="achievement-desc">${a.desc}</span></div>${u ? '<span class="achievement-check">✓</span>' : ''}`;
            list.appendChild(el);
        }
    }

    // ============================================================
    //  LEADERBOARD
    // ============================================================
    function addToLeaderboard(s) {
        if (s === 0) return;
        const name = playerName || 'Anonymous';
        leaderboard.push({ score: s, name, date: new Date().toLocaleDateString(), moves: moveCount, time: timerSeconds, mode: currentMode });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem('2048-leaderboard', JSON.stringify(leaderboard));
    }

    function renderLeaderboard() {
        const list = $('leaderboard-list');
        list.innerHTML = '';
        if (leaderboard.length === 0) { list.innerHTML = '<div class="leaderboard-empty">No scores yet. Play a game!</div>'; return; }
        const medals = ['🥇', '🥈', '🥉'];
        leaderboard.forEach((e, i) => {
            const el = document.createElement('div');
            el.className = 'leaderboard-item';
            el.innerHTML = `<span class="lb-rank">${i < 3 ? medals[i] : '#' + (i + 1)}</span><div class="lb-info"><span class="lb-score">${e.score.toLocaleString()}</span><span class="lb-name">${e.name || 'Anonymous'}</span></div><span class="lb-meta">${e.moves || '?'}m · ${MODES[e.mode]?.icon || '🎮'}</span>`;
            list.appendChild(el);
        });
    }

    // ============================================================
    //  REPLAY SYSTEM
    // ============================================================
    function startReplay(data) {
        if (!data || !data.moves || data.moves.length === 0) return;
        replayPlaying = false;
        replayIndex = 0;

        // Reset to replay state
        const prevMode = currentMode;
        gridSize = data.gridSize || 4;
        rng = new SeededRNG(data.seed || 12345);
        buildGridBg(); recalcSizes();
        tileContainer.innerHTML = '';
        grid = createEmptyGrid();
        score = 0; moveCount = 0; gameOver = false; gameWon = false; keepPlaying = true;
        scoreEl.textContent = '0'; moveCountEl.textContent = '0';
        hideMessage();
        spawnTile(); spawnTile();

        replayBar.style.display = 'flex';
        replaySlider.max = data.moves.length;
        replaySlider.value = 0;
        replayStepEl.textContent = `0/${data.moves.length}`;

        // Store replay data
        replayBar._data = data;
        replayBar._prevMode = prevMode;
        showPanel('game');
    }

    function replayStep(dir) {
        // Temporarily disable rng for replay spawns
        move(dir);
    }

    function replayForward() {
        const data = replayBar._data;
        if (!data || replayIndex >= data.moves.length) return;
        replayStep(data.moves[replayIndex]);
        replayIndex++;
        replaySlider.value = replayIndex;
        replayStepEl.textContent = `${replayIndex}/${data.moves.length}`;
    }

    function replayPlay() {
        if (replayPlaying) { replayPause(); return; }
        replayPlaying = true;
        $('replay-play').textContent = '⏸';
        replayTimer = setInterval(() => {
            if (replayIndex >= replayBar._data.moves.length) { replayPause(); return; }
            replayForward();
        }, 300);
    }

    function replayPause() {
        replayPlaying = false;
        $('replay-play').textContent = '▶';
        if (replayTimer) clearInterval(replayTimer);
    }

    function closeReplay() {
        replayPause();
        replayBar.style.display = 'none';
        currentMode = replayBar._prevMode || 'classic';
        newGame();
    }

    // ============================================================
    //  SHARE CARD
    // ============================================================
    function generateShareCard() {
        const canvas = shareCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 500;

        // Background
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, 400, 500);

        // Border gradient
        const borderGrad = ctx.createLinearGradient(0, 0, 400, 500);
        borderGrad.addColorStop(0, '#667eea');
        borderGrad.addColorStop(1, '#764ba2');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 3;
        ctx.roundRect(10, 10, 380, 480, 20);
        ctx.stroke();

        // Title
        const titleGrad = ctx.createLinearGradient(100, 60, 300, 60);
        titleGrad.addColorStop(0, '#667eea');
        titleGrad.addColorStop(1, '#764ba2');
        ctx.fillStyle = titleGrad;
        ctx.font = '900 64px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('2048', 200, 90);

        // Mode
        ctx.fillStyle = '#8888aa';
        ctx.font = '600 16px Inter, sans-serif';
        ctx.fillText(`${MODES[currentMode]?.icon || '🎮'} ${MODES[currentMode]?.name || 'Classic'} Mode`, 200, 125);

        // Score
        ctx.fillStyle = '#e8e8f0';
        ctx.font = '800 48px Inter, sans-serif';
        ctx.fillText(score.toLocaleString(), 200, 210);
        ctx.fillStyle = '#667eea';
        ctx.font = '700 14px Inter, sans-serif';
        ctx.fillText('SCORE', 200, 235);

        // Stats
        ctx.fillStyle = '#8888aa';
        ctx.font = '600 16px Inter, sans-serif';
        ctx.fillText(`${moveCount} moves · ${timerEl.textContent}`, 200, 280);

        // Grid mini-preview
        const gridStartX = 80, gridStartY = 310;
        const miniSize = 240, miniCell = (miniSize - (gridSize - 1) * 4) / gridSize;
        ctx.fillStyle = '#16213e';
        ctx.roundRect(gridStartX - 5, gridStartY - 5, miniSize + 10, miniSize + 10, 10);
        ctx.fill();

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const x = gridStartX + c * (miniCell + 4);
                const y = gridStartY + r * (miniCell + 4);
                const tile = grid[r][c];
                if (tile) {
                    ctx.fillStyle = TILE_COLORS[tile.value] || '#667eea';
                    ctx.roundRect(x, y, miniCell, miniCell, 4);
                    ctx.fill();
                    ctx.fillStyle = tile.value <= 4 ? '#b8c4e8' : '#fff';
                    ctx.font = `800 ${miniCell * 0.4}px Inter, sans-serif`;
                    ctx.fillText(tile.value, x + miniCell / 2, y + miniCell / 2 + miniCell * 0.14);
                } else {
                    ctx.fillStyle = '#1e2a4a';
                    ctx.roundRect(x, y, miniCell, miniCell, 4);
                    ctx.fill();
                }
            }
        }

        // Player
        ctx.fillStyle = '#555570';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillText(playerName || 'Anonymous', 200, 475);
    }

    function openShareModal() {
        generateShareCard();
        shareModal.classList.add('active');
    }

    // ============================================================
    //  CHALLENGE SYSTEM
    // ============================================================
    function generateChallengeCode() {
        const seed = Math.floor(Math.random() * 9999999);
        const code = `2048-${gridSize}x${gridSize}-${currentMode}-${seed}`;
        challengeCode.value = code;
        challengeCode.readOnly = true;
    }

    function parseChallengeCode(code) {
        const match = code.match(/^2048-(\d)x\d-(\w+)-(\d+)$/);
        if (!match) return null;
        return { gridSize: parseInt(match[1]), mode: match[2], seed: parseInt(match[3]) };
    }

    // ============================================================
    //  TUTORIAL
    // ============================================================
    const TUTORIAL_STEPS = [
        { icon: '👆', title: 'Swipe to Move', desc: 'Swipe in any direction or use arrow keys to slide all tiles.' },
        { icon: '🔗', title: 'Merge Tiles', desc: 'When two tiles with the same number collide, they merge into one!' },
        { icon: '🎯', title: 'Reach 2048', desc: 'Keep merging to create the 2048 tile and win the game.' },
        { icon: '↩️', title: 'Use Undo', desc: 'Made a mistake? Use the undo button (max 3 per game).' },
        { icon: '💡', title: 'Get Hints', desc: 'Stuck? The AI hint button suggests the best move.' },
        { icon: '🎮', title: 'Game Modes', desc: 'Try Classic, Timed, Zen, Daily Challenge, or Hard mode in Settings!' },
    ];

    let tutorialStep = 0;

    function showTutorial() {
        tutorialStep = 0;
        renderTutorialStep();
        tutorialOverlay.classList.add('show');
    }

    function renderTutorialStep() {
        const step = TUTORIAL_STEPS[tutorialStep];
        $('tutorial-illustration').textContent = step.icon;
        $('tutorial-title').textContent = step.title;
        $('tutorial-desc').textContent = step.desc;

        const dots = $('tutorial-dots');
        dots.innerHTML = '';
        TUTORIAL_STEPS.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = `tutorial-dot${i === tutorialStep ? ' active' : ''}`;
            dots.appendChild(dot);
        });

        $('tutorial-next').textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let's Play!" : 'Next →';
    }

    function nextTutorialStep() {
        tutorialStep++;
        if (tutorialStep >= TUTORIAL_STEPS.length) {
            tutorialOverlay.classList.remove('show');
            localStorage.setItem('2048-tutorialDone', '1');
            return;
        }
        renderTutorialStep();
    }

    // ============================================================
    //  PANELS & NAV
    // ============================================================
    function showPanel(panel) {
        activePanel = panel;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === panel));
        $('game-container').style.display = panel === 'game' ? '' : 'none';
        $('stats-panel').style.display = panel === 'stats' ? '' : 'none';
        $('achievements-panel').style.display = panel === 'achievements' ? '' : 'none';
        $('leaderboard-panel').style.display = panel === 'leaderboard' ? '' : 'none';
        if (panel === 'stats') renderStats();
        if (panel === 'achievements') renderAchievements();
        if (panel === 'leaderboard') renderLeaderboard();
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showPanel(btn.dataset.panel)));

    // ============================================================
    //  SETTINGS
    // ============================================================
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('2048-theme', theme);
        themeOptions.querySelectorAll('.theme-swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === theme));
    }

    function applyGridSize(size) {
        if (size === gridSize) return;
        gridSize = size;
        localStorage.setItem('2048-gridSize', size.toString());
        sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.size) === size));
        newGame();
    }

    function applyMode(mode) {
        currentMode = mode;
        localStorage.setItem('2048-mode', mode);
        modeOptions.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        modeIcon.textContent = MODES[mode].icon;
        modeName.textContent = MODES[mode].name;
        timedOptions.style.display = mode === 'timed' ? '' : 'none';

        // Zen mode hides score
        if (mode === 'zen') {
            $('score-box').style.opacity = '0.3';
            $('timer-pill').style.display = 'none';
        } else {
            $('score-box').style.opacity = '1';
            $('timer-pill').style.display = '';
        }
    }

    // Theme
    themeOptions.addEventListener('click', e => { const s = e.target.closest('.theme-swatch'); if (s) applyTheme(s.dataset.theme); });
    // Size
    sizeOptions.addEventListener('click', e => { const b = e.target.closest('.size-btn'); if (b) applyGridSize(parseInt(b.dataset.size)); });
    // Mode
    modeOptions.addEventListener('click', e => { const b = e.target.closest('.mode-btn'); if (b) { applyMode(b.dataset.mode); newGame(); } });
    // Timed duration
    timedOptions.addEventListener('click', e => {
        const b = e.target.closest('.size-btn');
        if (b) {
            timedDuration = parseInt(b.dataset.time);
            localStorage.setItem('2048-timedDuration', timedDuration.toString());
            timedOptions.querySelectorAll('.size-btn').forEach(x => x.classList.toggle('active', parseInt(x.dataset.time) === timedDuration));
            if (currentMode === 'timed') newGame();
        }
    });

    // Sound toggle
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('active', soundEnabled);
        soundLabel.textContent = soundEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-sound', soundEnabled ? 'on' : 'off');
        if (soundEnabled) SFX.move();
    });

    // Music toggle
    musicToggle.addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        musicToggle.classList.toggle('active', musicEnabled);
        musicLabel.textContent = musicEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-music', musicEnabled ? 'on' : 'off');
        if (musicEnabled) startMusic(); else stopMusic();
    });

    // Volume
    volumeSlider.addEventListener('input', () => {
        volume = parseInt(volumeSlider.value);
        localStorage.setItem('2048-volume', volume.toString());
        updateMusicVolume();
    });

    // Haptic
    hapticToggle.addEventListener('click', () => {
        hapticEnabled = !hapticEnabled;
        hapticToggle.classList.toggle('active', hapticEnabled);
        hapticLabel.textContent = hapticEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-haptic', hapticEnabled ? 'on' : 'off');
        if (hapticEnabled) vibrate(30);
    });

    // Aurora
    auroraToggle.addEventListener('click', () => {
        auroraEnabled = !auroraEnabled;
        auroraToggle.classList.toggle('active', auroraEnabled);
        auroraLabel.textContent = auroraEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-aurora', auroraEnabled ? 'on' : 'off');
        if (auroraEnabled && !auroraRunning) drawAurora();
    });

    // Player name
    playerNameInput.addEventListener('input', () => {
        playerName = playerNameInput.value.trim();
        localStorage.setItem('2048-name', playerName);
    });

    // Settings modal
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

    // Share modal
    shareBtn.addEventListener('click', openShareModal);
    closeShareBtn.addEventListener('click', () => shareModal.classList.remove('active'));
    shareModal.addEventListener('click', e => { if (e.target === shareModal) shareModal.classList.remove('active'); });

    shareDownload.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = '2048-score.png';
        link.href = shareCanvas.toDataURL('image/png');
        link.click();
    });

    shareCopy.addEventListener('click', () => {
        const text = `🎮 2048 ${MODES[currentMode]?.name || 'Classic'}\n🏆 Score: ${score.toLocaleString()}\n📊 Moves: ${moveCount}\n🏅 Highest: ${stats.highestTile}\nCan you beat me?`;
        navigator.clipboard.writeText(text).then(() => {
            shareCopy.textContent = '✅ Copied!';
            setTimeout(() => { shareCopy.innerHTML = '📋 Copy Text'; }, 2000);
        }).catch(() => {});
    });

    // Challenge
    genChallenge.addEventListener('click', generateChallengeCode);
    copyChallenge.addEventListener('click', () => {
        if (challengeCode.value) {
            navigator.clipboard.writeText(challengeCode.value).catch(() => {});
            copyChallenge.textContent = '✅';
            setTimeout(() => { copyChallenge.textContent = '📋'; }, 2000);
        }
    });

    // ============================================================
    //  REPLAY CONTROLS
    // ============================================================
    $('replay-play').addEventListener('click', replayPlay);
    $('replay-next').addEventListener('click', replayForward);
    $('replay-prev').addEventListener('click', () => {
        // Restart replay from beginning to prev point
        if (replayIndex <= 0) return;
        const data = replayBar._data;
        const targetIdx = replayIndex - 1;
        rng = new SeededRNG(data.seed || 12345);
        tileContainer.innerHTML = '';
        grid = createEmptyGrid();
        score = 0; moveCount = 0; gameOver = false; gameWon = false; keepPlaying = true;
        scoreEl.textContent = '0'; moveCountEl.textContent = '0';
        hideMessage();
        spawnTile(); spawnTile();
        replayIndex = 0;
        for (let i = 0; i < targetIdx; i++) {
            // Quick simulation
            const dir = data.moves[i];
            move(dir);
            replayIndex = i + 1;
        }
        replaySlider.value = replayIndex;
        replayStepEl.textContent = `${replayIndex}/${data.moves.length}`;
    });
    $('replay-close').addEventListener('click', closeReplay);
    replaySlider.addEventListener('input', () => {
        // Jump to position
        const data = replayBar._data;
        const target = parseInt(replaySlider.value);
        if (target === replayIndex) return;
        rng = new SeededRNG(data.seed || 12345);
        tileContainer.innerHTML = '';
        grid = createEmptyGrid();
        score = 0; moveCount = 0; gameOver = false; gameWon = false; keepPlaying = true;
        scoreEl.textContent = '0'; moveCountEl.textContent = '0';
        hideMessage();
        spawnTile(); spawnTile();
        replayIndex = 0;
        for (let i = 0; i < target; i++) {
            move(data.moves[i]);
            replayIndex = i + 1;
        }
        replayStepEl.textContent = `${replayIndex}/${data.moves.length}`;
    });

    if (watchReplayBtn) watchReplayBtn.addEventListener('click', () => { if (lastReplay) startReplay(lastReplay); });

    // ============================================================
    //  INPUT: KEYBOARD
    // ============================================================
    document.addEventListener('keydown', e => {
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); return; }
        const dir = map[e.key];
        if (dir && activePanel === 'game') { e.preventDefault(); move(dir); }
    });

    // ============================================================
    //  INPUT: TOUCH
    // ============================================================
    let touchStartX = 0, touchStartY = 0, touchActive = false;
    document.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; touchActive = true;
    }, { passive: true });
    document.addEventListener('touchmove', e => { if (activePanel === 'game') e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', e => {
        if (!touchActive) return; touchActive = false;
        const dx = e.changedTouches[0].clientX - touchStartX, dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    // Mouse drag
    let mouseDown = false, msx = 0, msy = 0;
    document.addEventListener('mousedown', e => { mouseDown = true; msx = e.clientX; msy = e.clientY; });
    document.addEventListener('mouseup', e => {
        if (!mouseDown) return; mouseDown = false;
        const dx = e.clientX - msx, dy = e.clientY - msy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    });

    // ============================================================
    //  BUTTONS
    // ============================================================
    newGameBtn.addEventListener('click', () => { if (score > 0 && !gameOver) endGame(); newGame(); });
    retryBtn.addEventListener('click', () => { if (score > 0 && !gameOver) endGame(); newGame(); });
    keepPlayingBtn.addEventListener('click', () => { keepPlaying = true; hideMessage(); });
    undoBtn.addEventListener('click', undo);
    hintBtn.addEventListener('click', showHint);

    // ============================================================
    //  TIMED MODE COUNTDOWN
    // ============================================================
    function showCountdown(cb) {
        let count = 3;
        countdownOverlay.classList.add('show');
        countdownNumber.textContent = count;
        SFX.countdown();
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                countdownOverlay.classList.remove('show');
                cb();
            } else {
                countdownNumber.textContent = count;
                SFX.countdown();
            }
        }, 1000);
    }

    // ============================================================
    //  OFFLINE / INSTALL
    // ============================================================
    window.addEventListener('online', () => offlineBadge.classList.remove('show'));
    window.addEventListener('offline', () => offlineBadge.classList.add('show'));
    if (!navigator.onLine) offlineBadge.classList.add('show');

    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (!localStorage.getItem('2048-installDismissed')) installBanner.classList.add('show');
    });
    installBtn.addEventListener('click', () => {
        if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); deferredInstallPrompt = null; }
        installBanner.classList.remove('show');
    });
    dismissInstall.addEventListener('click', () => {
        installBanner.classList.remove('show');
        localStorage.setItem('2048-installDismissed', '1');
    });

    // ============================================================
    //  RESIZE
    // ============================================================
    window.addEventListener('resize', () => {
        recalcSizes();
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++) {
                const tile = grid[r][c];
                if (tile) {
                    tile.el.style.width = cellSize + 'px'; tile.el.style.height = cellSize + 'px';
                    tile.el.style.fontSize = tileFontSize(tile.value) + 'px'; tile.el.style.lineHeight = cellSize + 'px';
                    updateTilePos(tile);
                }
            }
    });

    // ============================================================
    //  SERVICE WORKER
    // ============================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    }

    // ============================================================
    //  NEW GAME
    // ============================================================
    function newGame() {
        tileContainer.innerHTML = '';

        // Set RNG based on mode
        if (currentMode === 'daily') {
            rng = new SeededRNG(getDailySeed());
            challengeSeed = getDailySeed();
        } else if (challengeSeed) {
            rng = new SeededRNG(challengeSeed);
        } else {
            rng = null;
        }

        buildGridBg();
        grid = createEmptyGrid();
        score = 0; gameOver = false; gameWon = false; keepPlaying = false;
        moving = false; moveCount = 0; undosLeft = MAX_UNDOS; hintsLeft = MAX_HINTS;
        history = []; replayMoves = []; comboCount = 0;
        scoreEl.textContent = '0'; bestScoreEl.textContent = bestScore;
        moveCountEl.textContent = '0'; undoCountEl.textContent = undosLeft;
        hintCountEl.textContent = hintsLeft;
        undoBtn.disabled = false; hintBtn.disabled = false;
        hideMessage();
        recalcSizes();
        spawnTile(); spawnTile();

        // Handle timed mode countdown
        if (currentMode === 'timed') {
            showCountdown(() => startTimer());
        } else if (currentMode !== 'zen') {
            startTimer();
        } else {
            stopTimer();
            timerEl.textContent = '∞';
        }

        // Apply mode badge
        modeIcon.textContent = MODES[currentMode]?.icon || '🎮';
        modeName.textContent = MODES[currentMode]?.name || 'Classic';

        showPanel('game');
    }

    // ============================================================
    //  BOOT
    // ============================================================
    // Apply saved settings
    applyTheme(currentTheme);
    applyMode(currentMode);
    soundToggle.classList.toggle('active', soundEnabled);
    soundLabel.textContent = soundEnabled ? 'On' : 'Off';
    musicToggle.classList.toggle('active', musicEnabled);
    musicLabel.textContent = musicEnabled ? 'On' : 'Off';
    hapticToggle.classList.toggle('active', hapticEnabled);
    hapticLabel.textContent = hapticEnabled ? 'On' : 'Off';
    auroraToggle.classList.toggle('active', auroraEnabled);
    auroraLabel.textContent = auroraEnabled ? 'On' : 'Off';
    volumeSlider.value = volume;
    playerNameInput.value = playerName;
    sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.size) === gridSize));
    timedOptions.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.time) === timedDuration));

    // Start aurora
    if (auroraEnabled) drawAurora();
    // Start music if enabled
    if (musicEnabled) document.addEventListener('click', () => startMusic(), { once: true });

    // Tutorial for first time
    if (!localStorage.getItem('2048-tutorialDone')) {
        setTimeout(showTutorial, 500);
    }

    // Tutorial buttons
    $('tutorial-next').addEventListener('click', nextTutorialStep);
    $('tutorial-skip').addEventListener('click', () => {
        tutorialOverlay.classList.remove('show');
        localStorage.setItem('2048-tutorialDone', '1');
    });

    // Check URL for challenge code
    const urlParams = new URLSearchParams(window.location.search);
    const urlChallenge = urlParams.get('challenge');
    if (urlChallenge) {
        const parsed = parseChallengeCode(urlChallenge);
        if (parsed) {
            gridSize = parsed.gridSize;
            currentMode = parsed.mode;
            challengeSeed = parsed.seed;
            applyMode(currentMode);
        }
    }

    // Start!
    newGame();

})();
