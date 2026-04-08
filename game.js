/* =============================================
   2048 Game Engine — Full Featured
   =============================================
   Features: particles, confetti, themes, undo,
   leaderboard, move counter, timer, board sizes,
   stats, achievements, sound FX, haptic feedback
   ============================================= */

(function () {
    'use strict';

    // ============================================================
    //  CONFIGURATION & STATE
    // ============================================================
    const WINNING_VALUE = 2048;
    const MAX_UNDOS = 3;

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
    let history = []; // stack of { grid, score, moveCount } snapshots for undo
    let soundEnabled = localStorage.getItem('2048-sound') !== 'off';
    let hapticEnabled = localStorage.getItem('2048-haptic') !== 'off';
    let currentTheme = localStorage.getItem('2048-theme') || 'dark';

    // Stats persisted in localStorage
    let stats = JSON.parse(localStorage.getItem('2048-stats') || JSON.stringify({
        gamesPlayed: 0,
        gamesWon: 0,
        highestTile: 0,
        totalScore: 0,
        totalMoves: 0,
    }));

    // Achievements
    const ACHIEVEMENTS = [
        { id: 'first_merge',  icon: '🔗', name: 'First Merge',      desc: 'Merge your first tiles',          check: () => stats.totalMoves >= 1 },
        { id: 'score_500',    icon: '⭐', name: 'Rising Star',      desc: 'Reach a score of 500',            check: () => bestScore >= 500 },
        { id: 'score_2000',   icon: '🌟', name: 'Score Master',     desc: 'Reach a score of 2,000',          check: () => bestScore >= 2000 },
        { id: 'score_10000',  icon: '💫', name: 'Score Legend',     desc: 'Reach a score of 10,000',         check: () => bestScore >= 10000 },
        { id: 'score_50000',  icon: '🔥', name: 'Unstoppable',     desc: 'Reach a score of 50,000',         check: () => bestScore >= 50000 },
        { id: 'tile_128',     icon: '🟨', name: 'Warming Up',      desc: 'Create a 128 tile',               check: () => stats.highestTile >= 128 },
        { id: 'tile_256',     icon: '🟧', name: 'Getting There',   desc: 'Create a 256 tile',               check: () => stats.highestTile >= 256 },
        { id: 'tile_512',     icon: '🟥', name: 'Halfway There',   desc: 'Create a 512 tile',               check: () => stats.highestTile >= 512 },
        { id: 'tile_1024',    icon: '🟪', name: 'So Close!',       desc: 'Create a 1024 tile',              check: () => stats.highestTile >= 1024 },
        { id: 'tile_2048',    icon: '🏆', name: 'Champion',        desc: 'Create the legendary 2048 tile!', check: () => stats.highestTile >= 2048 },
        { id: 'tile_4096',    icon: '👑', name: 'Beyond Limits',   desc: 'Create a 4096 tile',              check: () => stats.highestTile >= 4096 },
        { id: 'games_10',     icon: '🎮', name: 'Dedicated',       desc: 'Play 10 games',                   check: () => stats.gamesPlayed >= 10 },
        { id: 'games_50',     icon: '🎯', name: 'Addicted',        desc: 'Play 50 games',                   check: () => stats.gamesPlayed >= 50 },
        { id: 'wins_5',       icon: '🥇', name: 'Serial Winner',   desc: 'Win 5 games',                     check: () => stats.gamesWon >= 5 },
    ];

    let unlockedAchievements = JSON.parse(localStorage.getItem('2048-achievements') || '[]');
    let leaderboard = JSON.parse(localStorage.getItem('2048-leaderboard') || '[]');

    // ============================================================
    //  DOM REFERENCES
    // ============================================================
    const tileContainer = document.getElementById('tile-container');
    const gridBackground = document.getElementById('grid-background');
    const scoreEl = document.getElementById('score');
    const bestScoreEl = document.getElementById('best-score');
    const scoreAddition = document.getElementById('score-addition');
    const gameMessage = document.getElementById('game-message');
    const messageText = document.getElementById('message-text');
    const newGameBtn = document.getElementById('new-game-btn');
    const retryBtn = document.getElementById('retry-btn');
    const keepPlayingBtn = document.getElementById('keep-playing-btn');
    const undoBtn = document.getElementById('undo-btn');
    const undoCountEl = document.getElementById('undo-count');
    const moveCountEl = document.getElementById('move-count');
    const timerEl = document.getElementById('timer');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const themeOptions = document.getElementById('theme-options');
    const sizeOptions = document.getElementById('size-options');
    const soundToggle = document.getElementById('sound-toggle');
    const soundLabel = document.getElementById('sound-label');
    const hapticToggle = document.getElementById('haptic-toggle');
    const hapticLabel = document.getElementById('haptic-label');
    const particleCanvas = document.getElementById('particle-canvas');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const toastEl = document.getElementById('achievement-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastDesc = document.getElementById('toast-desc');

    // ============================================================
    //  AUDIO ENGINE (Web Audio API — no files needed)
    // ============================================================
    let audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playTone(freq, duration, type = 'sine', vol = 0.12) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {}
    }

    const SFX = {
        move() { playTone(220, 0.08, 'sine', 0.06); },
        merge(value) {
            const base = 300 + Math.log2(value) * 40;
            playTone(base, 0.15, 'triangle', 0.1);
            setTimeout(() => playTone(base * 1.25, 0.12, 'sine', 0.08), 60);
        },
        win() {
            [523, 659, 784, 1047].forEach((f, i) => {
                setTimeout(() => playTone(f, 0.3, 'sine', 0.1), i * 120);
            });
        },
        lose() {
            playTone(200, 0.3, 'sawtooth', 0.06);
            setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.05), 150);
        },
        undo() { playTone(500, 0.1, 'sine', 0.05); playTone(400, 0.1, 'sine', 0.05); },
        achievement() {
            [660, 880, 1100].forEach((f, i) => {
                setTimeout(() => playTone(f, 0.2, 'triangle', 0.08), i * 100);
            });
        },
    };

    // ============================================================
    //  HAPTIC ENGINE
    // ============================================================
    function vibrate(pattern) {
        if (!hapticEnabled) return;
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    // ============================================================
    //  PARTICLE SYSTEM
    // ============================================================
    const pCtx = particleCanvas.getContext('2d');
    let particles = [];

    function resizeCanvases() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.life = 1;
            this.decay = 0.02 + Math.random() * 0.02;
            this.size = 3 + Math.random() * 4;
            this.color = color;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.15; // gravity
            this.life -= this.decay;
            this.size *= 0.97;
        }
        draw(ctx) {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const TILE_COLORS = {
        2: '#2d3561', 4: '#3b4578', 8: '#5b6abf', 16: '#667eea',
        32: '#764ba2', 64: '#f093fb', 128: '#f5af19', 256: '#f7971e',
        512: '#ee0979', 1024: '#f7971e', 2048: '#667eea',
    };

    function emitParticles(screenX, screenY, value) {
        const color = TILE_COLORS[value] || '#667eea';
        const count = Math.min(12 + Math.log2(value) * 2, 30);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(screenX, screenY, color));
        }
    }

    function animateParticles() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
            p.update();
            p.draw(pCtx);
        }
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
            this.color = ['#667eea','#764ba2','#f093fb','#f5af19','#ee0979','#ffd200','#4caf60'][Math.floor(Math.random()*7)];
            this.life = 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.03;
            this.rotation += this.rotSpeed;
            if (this.y > confettiCanvas.height + 20) this.life = 0;
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            ctx.restore();
        }
    }

    function launchConfetti() {
        confetti = [];
        for (let i = 0; i < 150; i++) {
            confetti.push(new ConfettiPiece());
        }
        if (!confettiRunning) {
            confettiRunning = true;
            animateConfetti();
        }
        // Launch more waves
        setTimeout(() => { for (let i = 0; i < 80; i++) confetti.push(new ConfettiPiece()); }, 500);
        setTimeout(() => { for (let i = 0; i < 60; i++) confetti.push(new ConfettiPiece()); }, 1000);
    }

    function animateConfetti() {
        cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confetti = confetti.filter(c => c.life > 0);
        for (const c of confetti) {
            c.update();
            c.draw(cCtx);
        }
        if (confetti.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiRunning = false;
        }
    }

    // ============================================================
    //  TILE SIZING
    // ============================================================
    let cellSize = 0;
    let cellGap = 0;
    let gridPadding = 0;

    function recalcSizes() {
        const gridEl = document.getElementById('grid');
        const rect = gridEl.getBoundingClientRect();
        const style = getComputedStyle(document.documentElement);
        cellGap = parseFloat(style.getPropertyValue('--cell-gap'));
        gridPadding = parseFloat(style.getPropertyValue('--grid-padding'));
        const innerSize = rect.width - gridPadding * 2;
        cellSize = (innerSize - cellGap * (gridSize - 1)) / gridSize;
    }

    function tilePos(row, col) {
        return {
            top: row * (cellSize + cellGap),
            left: col * (cellSize + cellGap),
        };
    }

    function tileFontSize(value) {
        const digits = String(value).length;
        const base = cellSize * 0.45;
        if (digits <= 2) return base;
        if (digits === 3) return base * 0.82;
        if (digits === 4) return base * 0.68;
        return base * 0.55;
    }

    // ============================================================
    //  GRID HELPERS
    // ============================================================
    function createEmptyGrid() {
        const g = [];
        for (let r = 0; r < gridSize; r++) {
            g[r] = [];
            for (let c = 0; c < gridSize; c++) g[r][c] = null;
        }
        return g;
    }

    function emptyCells() {
        const cells = [];
        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (!grid[r][c]) cells.push({ r, c });
        return cells;
    }

    function buildGridBackground() {
        gridBackground.innerHTML = '';
        gridBackground.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gridBackground.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            gridBackground.appendChild(cell);
        }
    }

    // ============================================================
    //  TILE OBJECTS
    // ============================================================
    let tileId = 0;

    function createTile(r, c, value) {
        const tile = { id: tileId++, r, c, value, el: null, mergedFrom: null };
        const el = document.createElement('div');
        el.className = `tile tile-${value <= 2048 ? value : 'super'} tile-new`;
        el.textContent = value;
        const pos = tilePos(r, c);
        el.style.width = cellSize + 'px';
        el.style.height = cellSize + 'px';
        el.style.top = pos.top + 'px';
        el.style.left = pos.left + 'px';
        el.style.fontSize = tileFontSize(value) + 'px';
        el.style.lineHeight = cellSize + 'px';
        tileContainer.appendChild(el);
        tile.el = el;
        el.addEventListener('animationend', () => {
            el.classList.remove('tile-new', 'tile-merged');
        });
        return tile;
    }

    function updateTilePosition(tile) {
        const pos = tilePos(tile.r, tile.c);
        tile.el.style.top = pos.top + 'px';
        tile.el.style.left = pos.left + 'px';
    }

    function updateTileValue(tile, value) {
        tile.value = value;
        tile.el.textContent = value;
        tile.el.className = `tile tile-${value <= 2048 ? value : 'super'} tile-merged`;
        tile.el.style.width = cellSize + 'px';
        tile.el.style.height = cellSize + 'px';
        tile.el.style.fontSize = tileFontSize(value) + 'px';
        tile.el.style.lineHeight = cellSize + 'px';
    }

    function removeTileEl(tile) {
        if (tile.el && tile.el.parentNode) tile.el.parentNode.removeChild(tile.el);
    }

    // ============================================================
    //  SPAWN
    // ============================================================
    function spawnTile() {
        const empty = emptyCells();
        if (empty.length === 0) return;
        const cell = empty[Math.floor(Math.random() * empty.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        grid[cell.r][cell.c] = createTile(cell.r, cell.c, value);
    }

    // ============================================================
    //  SCORE
    // ============================================================
    function addScore(points) {
        score += points;
        scoreEl.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreEl.textContent = bestScore;
            localStorage.setItem('2048-best', bestScore.toString());
        }

        scoreAddition.textContent = '+' + points;
        scoreAddition.classList.remove('active');
        void scoreAddition.offsetWidth;
        scoreAddition.classList.add('active');
    }

    // ============================================================
    //  UNDO SYSTEM
    // ============================================================
    function saveSnapshot() {
        const snap = {
            grid: grid.map(row => row.map(t => t ? { r: t.r, c: t.c, value: t.value } : null)),
            score,
            moveCount,
        };
        history.push(snap);
        if (history.length > 10) history.shift();
    }

    function undo() {
        if (undosLeft <= 0 || history.length === 0 || gameOver) return;
        undosLeft--;
        undoCountEl.textContent = undosLeft;
        if (undosLeft <= 0) undoBtn.disabled = true;

        const snap = history.pop();
        // Clear current tiles
        tileContainer.innerHTML = '';
        grid = createEmptyGrid();
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const saved = snap.grid[r]?.[c];
                if (saved) {
                    grid[r][c] = createTile(r, c, saved.value);
                    grid[r][c].el.classList.remove('tile-new'); // no animation on undo
                }
            }
        }
        score = snap.score;
        moveCount = snap.moveCount;
        scoreEl.textContent = score;
        moveCountEl.textContent = moveCount;
        SFX.undo();
        vibrate(30);
    }

    // ============================================================
    //  TIMER
    // ============================================================
    function startTimer() {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    function updateTimerDisplay() {
        const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const s = String(timerSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
    }

    // ============================================================
    //  MOVE LOGIC
    // ============================================================
    function getVector(direction) {
        return { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } }[direction];
    }

    function buildTraversals(vector) {
        const rows = [], cols = [];
        for (let i = 0; i < gridSize; i++) { rows.push(i); cols.push(i); }
        if (vector.dr === 1) rows.reverse();
        if (vector.dc === 1) cols.reverse();
        return { rows, cols };
    }

    function findFarthest(r, c, vector) {
        let prevR = r, prevC = c;
        let nextR = r + vector.dr;
        let nextC = c + vector.dc;
        while (nextR >= 0 && nextR < gridSize && nextC >= 0 && nextC < gridSize && !grid[nextR][nextC]) {
            prevR = nextR; prevC = nextC;
            nextR += vector.dr; nextC += vector.dc;
        }
        return {
            farthest: { r: prevR, c: prevC },
            next: (nextR >= 0 && nextR < gridSize && nextC >= 0 && nextC < gridSize) ? { r: nextR, c: nextC } : null,
        };
    }

    function getTileScreenPos(row, col) {
        const gridEl = document.getElementById('grid');
        const rect = gridEl.getBoundingClientRect();
        const pos = tilePos(row, col);
        return {
            x: rect.left + gridPadding + pos.left + cellSize / 2,
            y: rect.top + gridPadding + pos.top + cellSize / 2,
        };
    }

    function move(direction) {
        if (gameOver || moving) return;
        if (gameWon && !keepPlaying) return;

        const vector = getVector(direction);
        const { rows, cols } = buildTraversals(vector);
        let moved = false;
        const mergedThisTurn = new Set();
        let pointsThisTurn = 0;
        let mergeCount = 0;
        let highestMerge = 0;

        // Save undo snapshot before move
        saveSnapshot();

        for (let r = 0; r < gridSize; r++)
            for (let c = 0; c < gridSize; c++)
                if (grid[r][c]) grid[r][c].mergedFrom = null;

        for (const r of rows) {
            for (const c of cols) {
                const tile = grid[r][c];
                if (!tile) continue;

                const { farthest, next } = findFarthest(r, c, vector);

                if (next && grid[next.r][next.c] &&
                    grid[next.r][next.c].value === tile.value &&
                    !mergedThisTurn.has(grid[next.r][next.c].id)) {

                    const target = grid[next.r][next.c];
                    const newVal = tile.value * 2;

                    tile.r = next.r;
                    tile.c = next.c;
                    updateTilePosition(tile);
                    setTimeout(() => removeTileEl(tile), 130);

                    updateTileValue(target, newVal);
                    target.mergedFrom = tile;
                    mergedThisTurn.add(target.id);

                    grid[r][c] = null;
                    grid[next.r][next.c] = target;

                    pointsThisTurn += newVal;
                    mergeCount++;
                    highestMerge = Math.max(highestMerge, newVal);

                    // Particles at merge position
                    const screenPos = getTileScreenPos(next.r, next.c);
                    emitParticles(screenPos.x, screenPos.y, newVal);

                    if (newVal === WINNING_VALUE && !keepPlaying) gameWon = true;
                    if (newVal > stats.highestTile) {
                        stats.highestTile = newVal;
                        saveStats();
                    }

                    moved = true;
                } else if (farthest.r !== r || farthest.c !== c) {
                    grid[r][c] = null;
                    grid[farthest.r][farthest.c] = tile;
                    tile.r = farthest.r;
                    tile.c = farthest.c;
                    updateTilePosition(tile);
                    moved = true;
                }
            }
        }

        if (!moved) {
            // Remove the snapshot we just saved since no move happened
            history.pop();
            return;
        }

        moving = true;
        moveCount++;
        moveCountEl.textContent = moveCount;
        stats.totalMoves++;
        saveStats();

        if (pointsThisTurn > 0) addScore(pointsThisTurn);

        // Sound & haptic
        if (mergeCount > 0) {
            SFX.merge(highestMerge);
            vibrate(mergeCount > 2 ? [30, 20, 30] : 20);
        } else {
            SFX.move();
            vibrate(10);
        }

        setTimeout(() => {
            spawnTile();
            moving = false;

            if (gameWon && !keepPlaying) {
                showMessage('win');
                SFX.win();
                launchConfetti();
                stats.gamesWon++;
                saveStats();
            } else if (!movesAvailable()) {
                gameOver = true;
                showMessage('lose');
                SFX.lose();
                vibrate([50, 30, 50]);
                endGame();
            }

            checkAchievements();
        }, 140);
    }

    function movesAvailable() {
        if (emptyCells().length > 0) return true;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const val = grid[r][c]?.value;
                if (val == null) continue;
                if (c < gridSize - 1 && grid[r][c + 1]?.value === val) return true;
                if (r < gridSize - 1 && grid[r + 1]?.[c]?.value === val) return true;
            }
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
            keepPlayingBtn.style.display = 'inline-block';
        } else {
            messageText.textContent = 'Game Over';
            messageText.className = 'lose-text';
            keepPlayingBtn.style.display = 'none';
        }
        gameMessage.classList.add('active');
    }

    function hideMessage() { gameMessage.classList.remove('active'); }

    // ============================================================
    //  STATS & PERSISTENCE
    // ============================================================
    function saveStats() {
        localStorage.setItem('2048-stats', JSON.stringify(stats));
    }

    function endGame() {
        stopTimer();
        stats.gamesPlayed++;
        stats.totalScore += score;
        saveStats();
        addToLeaderboard(score);
    }

    function renderStats() {
        document.getElementById('stat-games').textContent = stats.gamesPlayed;
        document.getElementById('stat-wins').textContent = stats.gamesWon;
        document.getElementById('stat-winrate').textContent =
            stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) + '%' : '0%';
        document.getElementById('stat-highest').textContent = stats.highestTile;
        document.getElementById('stat-avgscore').textContent =
            stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
        document.getElementById('stat-totalmoves').textContent = stats.totalMoves;
    }

    // ============================================================
    //  ACHIEVEMENTS
    // ============================================================
    function checkAchievements() {
        for (const ach of ACHIEVEMENTS) {
            if (!unlockedAchievements.includes(ach.id) && ach.check()) {
                unlockedAchievements.push(ach.id);
                localStorage.setItem('2048-achievements', JSON.stringify(unlockedAchievements));
                showAchievementToast(ach);
                SFX.achievement();
                vibrate([30, 15, 30, 15, 50]);
            }
        }
    }

    function showAchievementToast(ach) {
        toastDesc.textContent = `${ach.icon} ${ach.name} — ${ach.desc}`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    function renderAchievements() {
        const list = document.getElementById('achievements-list');
        list.innerHTML = '';
        for (const ach of ACHIEVEMENTS) {
            const unlocked = unlockedAchievements.includes(ach.id);
            const item = document.createElement('div');
            item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
            item.innerHTML = `
                <span class="achievement-icon">${ach.icon}</span>
                <div class="achievement-info">
                    <span class="achievement-name">${ach.name}</span>
                    <span class="achievement-desc">${ach.desc}</span>
                </div>
                ${unlocked ? '<span class="achievement-check">✓</span>' : ''}
            `;
            list.appendChild(item);
        }
    }

    // ============================================================
    //  LEADERBOARD
    // ============================================================
    function addToLeaderboard(s) {
        if (s === 0) return;
        leaderboard.push({ score: s, date: new Date().toLocaleDateString(), moves: moveCount, time: timerSeconds });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem('2048-leaderboard', JSON.stringify(leaderboard));
    }

    function renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        if (leaderboard.length === 0) {
            list.innerHTML = '<div class="leaderboard-empty">No scores yet. Start playing!</div>';
            return;
        }
        leaderboard.forEach((entry, i) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            const medals = ['🥇', '🥈', '🥉'];
            const rankText = i < 3 ? medals[i] : `#${i + 1}`;
            const timeStr = entry.time != null ?
                `${String(Math.floor(entry.time / 60)).padStart(2, '0')}:${String(entry.time % 60).padStart(2, '0')}` : '';
            item.innerHTML = `
                <span class="lb-rank">${rankText}</span>
                <span class="lb-score">${entry.score.toLocaleString()}</span>
                <span class="lb-date">${entry.moves || '?'} moves ${timeStr ? '· ' + timeStr : ''}</span>
            `;
            list.appendChild(item);
        });
    }

    // ============================================================
    //  PANELS & NAVIGATION
    // ============================================================
    const navBtns = document.querySelectorAll('.nav-btn');
    let activePanel = 'game';

    function showPanel(panel) {
        activePanel = panel;
        // Toggle nav active
        navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.panel === panel));

        // Show/hide game container and panels
        document.getElementById('game-container').style.display = panel === 'game' ? '' : 'none';
        document.getElementById('stats-panel').style.display = panel === 'stats' ? '' : 'none';
        document.getElementById('achievements-panel').style.display = panel === 'achievements' ? '' : 'none';
        document.getElementById('leaderboard-panel').style.display = panel === 'leaderboard' ? '' : 'none';

        if (panel === 'stats') renderStats();
        if (panel === 'achievements') renderAchievements();
        if (panel === 'leaderboard') renderLeaderboard();
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => showPanel(btn.dataset.panel));
    });

    // ============================================================
    //  SETTINGS
    // ============================================================
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('2048-theme', theme);
        // Update swatch active
        themeOptions.querySelectorAll('.theme-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.theme === theme);
        });
    }

    function applyGridSize(size) {
        if (size === gridSize) return;
        gridSize = size;
        localStorage.setItem('2048-gridSize', size.toString());
        sizeOptions.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
        });
        newGame();
    }

    // Theme buttons
    themeOptions.addEventListener('click', (e) => {
        const swatch = e.target.closest('.theme-swatch');
        if (swatch) applyTheme(swatch.dataset.theme);
    });

    // Size buttons
    sizeOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.size-btn');
        if (btn) applyGridSize(parseInt(btn.dataset.size));
    });

    // Sound toggle
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('active', soundEnabled);
        soundLabel.textContent = soundEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-sound', soundEnabled ? 'on' : 'off');
        if (soundEnabled) SFX.move(); // feedback
    });

    // Haptic toggle
    hapticToggle.addEventListener('click', () => {
        hapticEnabled = !hapticEnabled;
        hapticToggle.classList.toggle('active', hapticEnabled);
        hapticLabel.textContent = hapticEnabled ? 'On' : 'Off';
        localStorage.setItem('2048-haptic', hapticEnabled ? 'on' : 'off');
        if (hapticEnabled) vibrate(30);
    });

    // Settings modal
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    // ============================================================
    //  INIT & NEW GAME
    // ============================================================
    function newGame() {
        tileContainer.innerHTML = '';
        buildGridBackground();
        grid = createEmptyGrid();
        score = 0;
        gameOver = false;
        gameWon = false;
        keepPlaying = false;
        moving = false;
        moveCount = 0;
        undosLeft = MAX_UNDOS;
        history = [];
        scoreEl.textContent = '0';
        bestScoreEl.textContent = bestScore;
        moveCountEl.textContent = '0';
        undoCountEl.textContent = undosLeft;
        undoBtn.disabled = false;
        hideMessage();
        recalcSizes();
        spawnTile();
        spawnTile();
        startTimer();
        showPanel('game');
    }

    // ============================================================
    //  INPUT: KEYBOARD
    // ============================================================
    document.addEventListener('keydown', (e) => {
        const keyMap = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', s: 'down', a: 'left', d: 'right',
        };
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); return; }
        const dir = keyMap[e.key];
        if (dir) { e.preventDefault(); move(dir); }
    });

    // ============================================================
    //  INPUT: TOUCH / SWIPE
    // ============================================================
    let touchStartX = 0, touchStartY = 0, touchActive = false;

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchActive = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (activePanel === 'game') e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!touchActive) return;
        touchActive = false;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const minSwipe = 30;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < minSwipe) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    // ============================================================
    //  INPUT: MOUSE DRAG (desktop)
    // ============================================================
    let mouseDown = false, mouseStartX = 0, mouseStartY = 0;

    document.addEventListener('mousedown', (e) => { mouseDown = true; mouseStartX = e.clientX; mouseStartY = e.clientY; });
    document.addEventListener('mouseup', (e) => {
        if (!mouseDown) return;
        mouseDown = false;
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    });

    // ============================================================
    //  BUTTONS
    // ============================================================
    newGameBtn.addEventListener('click', () => {
        if (score > 0 && !gameOver) {
            endGame();
        }
        newGame();
    });
    retryBtn.addEventListener('click', () => { if (score > 0) endGame(); newGame(); });
    keepPlayingBtn.addEventListener('click', () => { keepPlaying = true; hideMessage(); });
    undoBtn.addEventListener('click', undo);

    // ============================================================
    //  RESIZE
    // ============================================================
    window.addEventListener('resize', () => {
        recalcSizes();
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const tile = grid[r][c];
                if (tile) {
                    tile.el.style.width = cellSize + 'px';
                    tile.el.style.height = cellSize + 'px';
                    tile.el.style.fontSize = tileFontSize(tile.value) + 'px';
                    tile.el.style.lineHeight = cellSize + 'px';
                    updateTilePosition(tile);
                }
            }
        }
    });

    // ============================================================
    //  SERVICE WORKER
    // ============================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }

    // ============================================================
    //  BOOT
    // ============================================================
    // Apply saved settings
    applyTheme(currentTheme);
    soundToggle.classList.toggle('active', soundEnabled);
    soundLabel.textContent = soundEnabled ? 'On' : 'Off';
    hapticToggle.classList.toggle('active', hapticEnabled);
    hapticLabel.textContent = hapticEnabled ? 'On' : 'Off';
    sizeOptions.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.size) === gridSize);
    });

    newGame();
})();
