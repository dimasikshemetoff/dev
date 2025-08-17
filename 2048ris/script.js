// Инициализация Yandex SDK
let ysdk;
let player;
let currentLanguage = 'ru'; 

YaGames.init().then(_ysdk => {
    ysdk = _ysdk;
    window.ysdk = ysdk;
    ysdk.features.LoadingAPI?.ready()

    document.getElementById('start-button').style.opacity = 1;
    document.getElementById('start-button').removeAttribute('disabled');

    // Автоматическое определение языка
    if (ysdk.environment && ysdk.environment.i18n) {
        currentLanguage = ysdk.environment.i18n.lang;
    }

    
    
    // Инициализация игрока
    return ysdk.getPlayer();

    
}).then(_player => {
    player = _player;
    
    if (!player.isAuthorized()) {
        console.log('Player is not authorized - leaderboard features will be limited');
        // Можно предложить игроку авторизоваться
    }
    
    // Загружаем лучший счет из данных игрока
    return player.getData(['BestScore']);
}).then(data => {
    if (data && data.bestScore) {
        const bestScoreDisplay = document.getElementById('best-score');
        bestScoreDisplay.textContent = data.bestScore;
        localStorage.setItem('BestScore', data.bestScore);
    }

    
}).catch(err => {
    console.error('Yandex SDK initialization error:', err);
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('touchstart', (e) => {
    // Ничего не делаем, просто предотвращаем стандартное поведение
}, { passive: false });

document.addEventListener('touchend', (e) => {
    // Предотвращаем появление контекстного меню после долгого нажатия
    const now = Date.now();
    if (e.timeStamp - e.target._touchStartTime > 500) {
        e.preventDefault();
    }
});

document.oncontextmenu = function (){return false};

let loseSound, mergeSound, newRecordSound, pauseResumeSound;

document.addEventListener('DOMContentLoaded', () => {
    const gridSize = 4;
    const grid = document.getElementById('grid');
    const previewRow = document.getElementById('preview-row');
    const scoreDisplay = document.getElementById('score');
    const bestScoreDisplay = document.getElementById('best-score');
    const gameOverDisplay = document.getElementById('game-over');
    const restartButton = document.getElementById('restart-button');
    const secondChanceButton = document.getElementById('second-chance-button');
    const gridContainer = document.getElementById('grid-container');
    const fallingArea = document.getElementById('falling-area');
    const timerText = document.getElementById('timer-text');
    const timerProgress = document.getElementById('timer-progress');
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const soundButton = document.getElementById('sound-button');
    const soundIcon = document.getElementById('sound-icon');
    const finalScoreDisplay = document.getElementById('final-score');
    const leaderboardBox = document.getElementById('leaderboard-box');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeModal = document.getElementById('close-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    
    let board = [];
    let nextTiles = [];
    let score = 0;
    let lastscore = 0;
    let bestScore = localStorage.getItem('BestScore') || 0;
    let isGameOver = false;
    let isMoving = false;
    let dropInterval;
    let dropTimer = 3;
    let dropTimerInterval;
    let lastDropTime = 0;
    let isSoundEnabled = true;
    let isPaused = false;
    let fallingTilesCount = 0;
    let timeUntilNextDrop = 0;
    let animationInProgress = false;
    let swipeAnimationInProgress = false;
    let hasSecondChance = true;
    let leaderboardName = 'tilesleaderboard';
    let playerRank = '-';
    let hasNewRecordSoundPlayed = false;
    let pausedTimeRemaining = 0;
    let totalDropTime = 5000;
    
    // Инициализация звуков
    loseSound = document.getElementById('lose-sound');
    mergeSound = document.getElementById('merge-sound');
    newRecordSound = document.getElementById('newrecord-sound');
    pauseResumeSound = document.getElementById('pauseresume-sound');
    
    // Установка начальной громкости
    if (loseSound) loseSound.volume = 0.2;
    if (mergeSound) mergeSound.volume = 0.1;
    if (newRecordSound) newRecordSound.volume = 0.5;
    if (pauseResumeSound) pauseResumeSound.volume = 0.1;

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (loseSound) loseSound.volume = 0;
            if (mergeSound) mergeSound.volume = 0;
            if (newRecordSound) newRecordSound.volume = 0;
            if (pauseResumeSound) pauseResumeSound.volume = 0;
        } else if (!document.hidden) {
            if (loseSound) loseSound.volume = 0.2;
            if (mergeSound) mergeSound.volume = 0.1;
            if (newRecordSound) newRecordSound.volume = 0.5;
            if (pauseResumeSound) pauseResumeSound.volume = 0.1;
        }
        });


    function resumeAllSounds() {
        if (!isSoundEnabled || document.hidden) return;
        
        if (loseSound) loseSound.volume = 0.2;
        if (mergeSound) mergeSound.volume = 0.1;
        if (newRecordSound) newRecordSound.volume = 0.5;
        if (pauseResumeSound) pauseResumeSound.volume = 0.1;
    }
    
    soundButton.addEventListener('click', toggleSound);
    bestScoreDisplay.textContent = bestScore;
    
    function toggleSound() {
        isSoundEnabled = !isSoundEnabled;
        
        if (isSoundEnabled) {
            soundButton.classList.remove('muted');
            soundIcon.textContent = '🔊';
            resumeAllSounds();
        } else {
            soundButton.classList.add('muted');
            soundIcon.textContent = '🔇';
            // Обнуляем громкость всех звуков
            if (loseSound) loseSound.volume = 0;
            if (mergeSound) mergeSound.volume = 0;
            if (newRecordSound) newRecordSound.volume = 0;
            if (pauseResumeSound) pauseResumeSound.volume = 0;
        }
    }
    

    startButton.addEventListener('click', () => {
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
                ysdk.features.GameplayAPI.start();
            }
            startScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            initGame();
            
        
    });
    
    pauseButton.addEventListener('click', togglePause);
    secondChanceButton.addEventListener('click', showRewardedAd);

    leaderboardBox.addEventListener('click', () => {
        if (isGameOver) return;
        
        const wasPaused = isPaused;
        if (!isPaused) {
            togglePause();
        }
        
        leaderboardModal.style.display = 'flex';
        loadLeaderboardData();
    });

    closeModal.addEventListener('click', () => {
        leaderboardModal.style.display = 'none';
    });

    function formatPlayerName(player) {
        if (!player) return 'Аноним';
        if (player.publicName) return player.publicName;
        return `Игрок ${player.uniqueID ? player.uniqueID.substring(0, 4) : '0000'}`;
    }

    function loadLeaderboardData() {
        if (!ysdk || !ysdk.leaderboards) {
            return Promise.resolve();
        }
        
        return Promise.all([
            ysdk.leaderboards.getEntries(leaderboardName, {
                quantityTop: 5,
                includeUser: false
            }),
            ysdk.leaderboards.getPlayerEntry(leaderboardName).catch(err => {
                if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
                    return null;
                }
                throw err;
            })
        ]).then(([topEntries, playerEntry]) => {
            leaderboardList.innerHTML = '';
            
            if (topEntries && topEntries.entries && topEntries.entries.length > 0) {
                topEntries.entries.forEach(entry => {
                    addLeaderboardEntry(leaderboardList, entry, false);
                });
            } else {
                leaderboardList.innerHTML = '<div class="no-data">Нет данных</div>';
            }
            
            if (playerEntry) {
                const separator = document.createElement('div');
                separator.className = 'leaderboard-separator';
                separator.textContent = 'Ваше место';
                leaderboardList.appendChild(separator);
                
                addLeaderboardEntry(leaderboardList, playerEntry, true);
            } else if (player && player.isAuthorized()) {
                const separator = document.createElement('div');
                separator.className = 'leaderboard-separator';
                separator.textContent = 'Вы ещё не в таблице';
                leaderboardList.appendChild(separator);
            }
        }).catch(err => {
            console.log('Error loading leaderboard data:', err);
            leaderboardList.innerHTML = '<div class="no-data">Ошибка загрузки</div>';
        });
    }

    function addLeaderboardEntry(container, entry, isPlayer) {
        const entryElement = document.createElement('div');
        entryElement.className = `leaderboard-item ${isPlayer ? 'player' : ''}`;
        
        entryElement.innerHTML = `
            <span class="leaderboard-rank">${entry.rank}.</span>
            <span class="leaderboard-name">${formatPlayerName(entry.player)}</span>
            <span class="leaderboard-score">${entry.formattedScore || entry.score}</span>
        `;
        
        container.appendChild(entryElement);
    }
    
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            pausedTimeRemaining = timeUntilNextDrop;
            clearInterval(dropInterval);
            clearInterval(dropTimerInterval);
            pauseButton.style.background = 'linear-gradient(145deg, #ff9a76, #ff7b54)';
            pauseButton.querySelector('span').textContent = 'ДАЛЕЕ';
            
            if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
                ysdk.features.GameplayAPI.stop();
            }
            
            if (isSoundEnabled && pauseResumeSound) {
                pauseResumeSound.currentTime = 0;
                pauseResumeSound.play();
            }
        } else {
            timeUntilNextDrop = pausedTimeRemaining;
            lastDropTime = Date.now() - (totalDropTime - pausedTimeRemaining);
            
            startDropTimer();
            scheduleNextDrop();
            pauseButton.style.background = 'linear-gradient(145deg, #2d4059, #1d2d44)';
            pauseButton.querySelector('span').textContent = 'ПАУЗА';
            
            if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
                ysdk.features.GameplayAPI.start();
            }
            
            if (isSoundEnabled && pauseResumeSound) {
                pauseResumeSound.currentTime = 0;
                pauseResumeSound.play();
            }
        }
    }
    
    function showRewardedAd() {
        if (!ysdk || !ysdk.adv) {
            useSecondChance();
            return;
        }
        
        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log('Rewarded ad opened');
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.stop();
                    }
                },
                onRewarded: () => {
                    console.log('Rewarded!');
                    useSecondChance();
                },
                onClose: () => {
                    console.log('Rewarded ad closed');
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.start();
                    }
                },
                onError: (e) => {
                    console.log('Rewarded ad error:', e);
                    useSecondChance();
                }
            }
        });
    }
    
    function useSecondChance() {
        if (!hasSecondChance) return;
        
        hasSecondChance = false;
        isGameOver = false;
        gameOverDisplay.style.display = 'none';
        
        // Удаляем все плитки со значениями ниже 16 (2, 4, 8)
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] !== null && board[row][col] < 16) {
                    const tile = document.getElementById(`tile-${row}-${col}`);
                    if (tile) tile.remove();
                    board[row][col] = null;
                }
            }
        }
        
        // Перемещаем оставшиеся плитки вниз
        for (let col = 0; col < gridSize; col++) {
            let emptyRow = gridSize - 1;
            
            // Проходим снизу вверх
            for (let row = gridSize - 1; row >= 0; row--) {
                if (board[row][col] !== null) {
                    if (row !== emptyRow) {
                        // Перемещаем плитку вниз
                        board[emptyRow][col] = board[row][col];
                        board[row][col] = null;
                        
                        // Обновляем DOM
                        const tile = document.getElementById(`tile-${row}-${col}`);
                        if (tile) {
                            tile.remove();
                            addTile(emptyRow, col, board[emptyRow][col]);
                        }
                    }
                    emptyRow--;
                }
            }
        }
        
        clearInterval(dropInterval);
        clearInterval(dropTimerInterval);
        updateBoardView();
        startDropTimer();
        scheduleNextDrop();
        
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.start();
        }
    }
    
    function showFullscreenAd() {
        if (!ysdk || !ysdk.adv) {
            initGame();
            return;
        }
        
        ysdk.adv.showFullscreenAdv({
            callbacks: {
                onOpen: () => {
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.stop();
                    }
                },
                onClose: (wasShown) => {
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.start();
                    }
                    initGame();
                },
                onError: (e) => {
                    initGame();
                }
            }
        });
    }
    
    function initGame() {
        grid.innerHTML = '';
        previewRow.innerHTML = '';
        fallingArea.innerHTML = '';
        
        hasNewRecordSoundPlayed = false;
        
        initLeaderboard();
        
        for (let i = 0; i < gridSize; i++) {
            const previewCell = document.createElement('div');
            previewCell.className = 'preview-cell';
            previewCell.id = `preview-cell-${i}`;
            previewRow.appendChild(previewCell);
        }
        
        for (let row = 0; row < gridSize; row++) {
            board[row] = [];
            const gridRow = document.createElement('div');
            gridRow.className = 'grid-row';
            
            for (let col = 0; col < gridSize; col++) {
                board[row][col] = null;
                const gridCell = document.createElement('div');
                gridCell.className = 'grid-cell';
                gridCell.id = `cell-${row}-${col}`;
                gridRow.appendChild(gridCell);
            }
            
            grid.appendChild(gridRow);
        }
        
        score = 0;
        scoreDisplay.textContent = score;
        isGameOver = false;
        gameOverDisplay.style.display = 'none';
        isMoving = false;
        dropTimer = 3;
        lastDropTime = Date.now();
        hasSecondChance = true;
        nextTiles = [];
        isPaused = false;
        fallingTilesCount = 0;
        animationInProgress = false;
        swipeAnimationInProgress = false;
        pausedTimeRemaining = 0;
        
        generateNextTile();
        generateNextTile();
        updatePreview();
        addRandomTile();
        addRandomTile();
        
        if (dropInterval) clearInterval(dropInterval);
        if (dropTimerInterval) clearInterval(dropTimerInterval);
        
        startDropTimer();
        scheduleNextDrop();
    }
    
    function generateNextTile() {
        let column;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            column = Math.floor(Math.random() * gridSize);
            attempts++;
            
            if (attempts >= maxAttempts) break;
            
        } while (nextTiles.length > 0 && nextTiles[nextTiles.length - 1].column === column);
        
        let value;
        const random = Math.random();
        
        if (score >= 700) {
            if (random < 0.1) {
                value = 8;
            } else if (random < 0.6) {
                value = 4;
            } else {
                value = 2;
            }
        } else {
            value = Math.random() < 0.85 ? 2 : 4;
        }
        
        nextTiles.push({ column, value });
        
        if (nextTiles.length > 2) {
            nextTiles.shift();
        }
    }
    
    function updatePreview() {
        for (let i = 0; i < gridSize; i++) {
            const cell = document.getElementById(`preview-cell-${i}`);
            cell.innerHTML = '';
            cell.classList.remove('active');
        }
        
        nextTiles.forEach(tile => {
            const cell = document.getElementById(`preview-cell-${tile.column}`);
            if (cell) {
                cell.classList.add('active');
                const previewValue = document.createElement('div');
                previewValue.className = `preview-value`;
                previewValue.textContent = tile.value;
                cell.appendChild(previewValue);
            }
        });
    }

    function initLeaderboard() {
        if (!ysdk || !ysdk.leaderboards) {
            console.log('Leaderboards not available');
            document.getElementById('leaderboard-box').style.display = 'none';
            return;
        }
        
        // Проверяем доступность лидербордов для данного пользователя
        ysdk.isAvailableMethod('leaderboards.getPlayerEntry').then(available => {
            if (available) {
                document.getElementById('leaderboard-box').style.display = 'flex';
                updateLeaderboard();
            } else {
                console.log('Leaderboards methods not available for this user');
                document.getElementById('leaderboard-box').style.display = 'none';
            }
        }).catch(err => {
            console.log('Error checking leaderboard availability:', err);
            document.getElementById('leaderboard-box').style.display = 'none';
        });
    }

    function updateLeaderboard() {
        if (!ysdk || !ysdk.leaderboards) return Promise.resolve();
        
        return Promise.all([
            ysdk.leaderboards.getEntries(leaderboardName, {
                quantityTop: 5,
                includeUser: false
            }),
            ysdk.leaderboards.getPlayerEntry(leaderboardName).catch(err => {
                if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
                    return null;
                }
                throw err;
            })
        ]).then(([topEntries, playerEntry]) => {
            // Обновляем UI лидерборда
            displayLeaderboardData(topEntries);
            displayPlayerRank(playerEntry);
        }).catch(err => {
            console.error('Error loading leaderboard data:', err);
        });
    }

    function displayLeaderboardData(topEntries) {
        leaderboardList.innerHTML = '';
        
        if (topEntries && topEntries.entries && topEntries.entries.length > 0) {
            topEntries.entries.forEach(entry => {
                const playerElement = document.createElement('div');
                playerElement.className = 'leaderboard-entry';
                playerElement.innerHTML = `
                    <span class="leaderboard-rank">${entry.rank}.</span>
                    <span class="leaderboard-name">${formatPlayerName(entry.player)}</span>
                    <span class="leaderboard-score">${entry.formattedScore || entry.score}</span>
                `;
                leaderboardList.appendChild(playerElement);
            });
        } else {
            leaderboardList.innerHTML = '<div class="no-data">Нет данных</div>';
        }
    }

    function displayPlayerRank(entry) {
        const rankElement = document.getElementById('player-rank');
        
        if (entry) {
            playerRank = entry.rank;
            rankElement.textContent = entry.rank;
            
            if (score > 0 && score > entry.score) {
                updatePlayerScore();
            }
        } else {
            rankElement.textContent = '-';
        }
    }
        
    function scheduleNextDrop() {
        const now = Date.now();
        const timeSinceLastDrop = now - lastDropTime;
        let delay;
        
        if (score >= 1000) {
            totalDropTime = 3000;
            delay = Math.max(0, totalDropTime - timeSinceLastDrop);
        } else if (score >= 300) {
            totalDropTime = 4000;
            delay = Math.max(0, totalDropTime - timeSinceLastDrop);
        } else {
            totalDropTime = 5000;
            delay = Math.max(0, totalDropTime - timeSinceLastDrop);
        }
        
        timeUntilNextDrop = delay;
        
        if (dropInterval) clearInterval(dropInterval);
        
        dropInterval = setTimeout(() => {
            if (!isGameOver && !isMoving && !isPaused && fallingTilesCount === 0) {
                addFallingTileFromQueue();
            }
            lastDropTime = Date.now();
            scheduleNextDrop();
        }, delay);
    }

    function addFallingTileFromQueue() {
        if (isGameOver || nextTiles.length === 0 || isPaused) return;
        
        const tilesToDrop = nextTiles.splice(0, 2);
        
        tilesToDrop.forEach(tile => {
            addFallingTile(tile.column, tile.value);
        });
        
        if (nextTiles.length === 0) {
            generateNextTile();
            generateNextTile();
            updatePreview();
        }
    }
    
    function startDropTimer() {
        dropTimer = totalDropTime / 1000;
        updateTimerDisplay();
        
        if (dropTimerInterval) clearInterval(dropTimerInterval);
        
        dropTimerInterval = setInterval(() => {
            if (isPaused) return;
            
            const now = Date.now();
            const timeSinceLastDrop = now - lastDropTime;
            
            dropTimer = Math.max(0, (totalDropTime - timeSinceLastDrop) / 1000);
            timeUntilNextDrop = totalDropTime - timeSinceLastDrop;
            updateTimerDisplay();
        }, 50);
    }
    
    function updateTimerDisplay() {
        timerText.textContent = dropTimer.toFixed(1);
        timerProgress.style.width = `${(dropTimer / (totalDropTime / 1000)) * 100}%`;
    }
    
    function addRandomTile() {
        const emptyCells = [];
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] === null) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            
            addTile(row, col, value);
            return true;
        }
        
        return false;
    }

    function updatePlayerScore() {
        // Проверяем доступность SDK и лидербордов
        if (!ysdk || !ysdk.leaderboards || score <= 0) {
            console.log('Leaderboards not available or invalid score');
            return;
        }

        // Получаем текущий рекорд игрока
        ysdk.leaderboards.getPlayerEntry(leaderboardName)
            .then(currentEntry => {
                // Если у игрока уже есть запись в лидерборде и текущий счет не больше
                if (currentEntry && score <= currentEntry.score) {
                    console.log('Current score is not better than existing record');
                    return;
                }

                // Если игрок авторизован, сохраняем рекорд в его данные
                if (player && player.isAuthorized()) {
                    player.getData(['BestScore'])
                        .then(data => {
                            const playerBest = data && data.bestScore ? parseInt(data.bestScore) : 0;
                            // Обновляем только если текущий счет больше
                            if (score > playerBest) {
                                return player.setData({ bestScore: score });
                            }
                        })
                        .then(() => {
                            // Обновляем лидерборд только если счет действительно новый рекорд
                            return ysdk.leaderboards.setScore(leaderboardName, score);
                        })
                        .then(() => {
                            console.log('Score successfully updated in leaderboard:', score);
                            window.lastLeaderboardUpdate = Date.now();
                            return updateLeaderboard();
                        })
                        .catch(err => {
                            console.error('Error updating leaderboard score:', err);
                            handleLeaderboardError(err);
                        });
                } else {
                    // Для неавторизованных игроков используем localStorage
                    const localBest = parseInt(localStorage.getItem('BestScore')) || 0;
                    if (score > localBest) {
                        localStorage.setItem('BestScore', score);
                    }
                    console.log('Player not authorized, score saved locally');
                }
            })
            .catch(err => {
                if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
                    // Если записи игрока нет, создаем новую
                    ysdk.leaderboards.setScore(leaderboardName, score)
                        .then(() => {
                            console.log('New player record created in leaderboard:', score);
                            window.lastLeaderboardUpdate = Date.now();
                            return updateLeaderboard();
                        })
                        .catch(err => {
                            console.error('Error creating leaderboard entry:', err);
                            handleLeaderboardError(err);
                        });
                } else {
                    console.error('Error checking player entry:', err);
                    handleLeaderboardError(err);
                }
            });
    }

    function handleLeaderboardError(err) {
        // Обработка специфических ошибок
        if (err.code === 'LEADERBOARD_TOO_MANY_REQUESTS') {
            console.log('Too many requests, retrying in 1 second');
            setTimeout(updatePlayerScore, 1000);
        } 
        else if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
            console.log('Player not present in leaderboard');
        }
        else if (err.code === 'NETWORK_ERROR') {
            console.log('Network error, retrying in 2 seconds');
            setTimeout(updatePlayerScore, 2000);
        }
        else {
            console.error('Permanent error, cannot update leaderboard');
        }
    }
    
    function addFallingTile(col, value) {
        fallingTilesCount++;
        animationInProgress = true;
        const fallingTile = document.createElement('div');
        fallingTile.className = `falling-tile tile-${value}`;
        fallingTile.textContent = value;
        
        const bodyStyle = window.getComputedStyle(document.body);
        const transformValue = bodyStyle.getPropertyValue('transform');
        let scale = 1;
        
        if (transformValue !== 'none') {
            const matrix = transformValue.match(/^matrix\((.+)\)$/);
            if (matrix) {
                const values = matrix[1].split(', ');
                scale = parseFloat(values[0]);
            }
        }
        
        const cell = document.getElementById('cell-0-0');
        const cellRect = cell.getBoundingClientRect();
        const gridRect = gridContainer.getBoundingClientRect();
        
        const leftPos = (cellRect.left - gridRect.left) / scale + col * (cellRect.width / scale + 15 / scale);
        fallingTile.style.left = `${leftPos}px`;
        fallingTile.style.top = '0';
        
        fallingTile.style.width = `${80 / scale}px`;
        fallingTile.style.height = `${80 / scale}px`;
        fallingTile.style.fontSize = `${35 / scale}px`;
        
        fallingArea.appendChild(fallingTile);
        
        fallingTile.getBoundingClientRect();
        
        let landingRow = 0;
        while (landingRow < gridSize && board[landingRow][col] === null) {
            landingRow++;
        }
        
        const finalTop = (cellRect.top - gridRect.top) / scale + 
                        (landingRow > 0 ? landingRow - 1 : 0) * (cellRect.height / scale + 15 / scale) - 
                        15 / scale;
        
        fallingTile.style.transition = 'transform 0.5s ease-in-out';
        fallingTile.style.transform = `translateY(${finalTop}px)`;
        
        setTimeout(() => {
            if (landingRow === gridSize) {
                landingRow = gridSize - 1;
                board[landingRow][col] = value;
                addTile(landingRow, col, value);
                fallingTile.remove();
                
                checkTopRowFull();
            } else {
                if (landingRow < gridSize && board[landingRow][col] === value) {
                    mergeTiles(landingRow, col, value);
                    fallingTile.remove();
                } else {
                    if (landingRow > 0) {
                        landingRow--;
                        board[landingRow][col] = value;
                        addTile(landingRow, col, value);
                        fallingTile.remove();
                        
                        checkTopRowFull();
                    } else {
                        gameOver();
                        fallingTile.remove();
                        fallingTilesCount--;
                        animationInProgress = false;
                        return;
                    }
                }
            }
            fallingTilesCount--;
            animationInProgress = false;
        }, 500);
    }
    
    function checkTopRowFull() {
        for (let col = 0; col < gridSize; col++) {
            if (board[0][col] === null) {
                return false;
            }
        }
        gameOver();
        return true;
    }
    
    function addTile(row, col, value) {
        board[row][col] = value;
        const tile = createTile(row, col, value);
        document.getElementById(`cell-${row}-${col}`).appendChild(tile);
    }
    
    function createTile(row, col, value) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} tile-new`;
        tile.id = `tile-${row}-${col}`;
        tile.textContent = value;
        return tile;
    }
    
    function mergeTiles(row, col, value) {
        const newValue = value * 2;
        board[row][col] = newValue;
        
        score += newValue;
        if(score !== lastscore){
            if (isSoundEnabled && mergeSound) {
                mergeSound.currentTime = 0;
                mergeSound.play();
            }
        }
        lastscore = score;
        scoreDisplay.textContent = score;
        
        if (score > bestScore) {
            bestScore = score;
            bestScoreDisplay.textContent = bestScore;
            localStorage.setItem('BestScore', bestScore);
            
            if (player) {
                player.setData({ bestScore });
            }
            
            if (!hasNewRecordSoundPlayed && isSoundEnabled && newRecordSound) {
                newRecordSound.currentTime = 0;
                newRecordSound.play();
                hasNewRecordSoundPlayed = true;
            }
        }
        
        const tileElement = document.getElementById(`tile-${row}-${col}`);
        if (tileElement) {
            tileElement.textContent = newValue;
            tileElement.className = `tile tile-${newValue}`;
            
            tileElement.style.transform = 'scale(0.8)';
            tileElement.style.filter = 'filter: contrast(1.6)';
            setTimeout(() => {
                tileElement.style.transform = 'scale(1)';
                tileElement.style.filter = 'filter: contrast(1)';
            }, 400);
        } else {
            addTile(row, col, newValue);
        }
    }
    
    function move(direction) {
        if (timeUntilNextDrop <= 200) {
            return;
        }
        
        if (isGameOver || isMoving || isPaused || fallingTilesCount > 0) return;
        
        isMoving = true;
        let moved = false;
        const oldBoard = JSON.parse(JSON.stringify(board));
        if (direction === 'up') {
            for (let col = 0; col < gridSize; col++) {
                let mergePosition = 0;
                let previousValue = null;
                
                for (let row = 0; row < gridSize; row++) {
                    if (board[row][col] !== null) {
                        if (previousValue === board[row][col]) {
                            const mergedValue = previousValue * 2;
                            if (isSoundEnabled && mergeSound) {
                                mergeSound.currentTime = 0;
                                mergeSound.play();
                            }
                            board[mergePosition - 1][col] = mergedValue;
                            board[row][col] = null;
                            score += mergedValue;
                            previousValue = null;
                            moved = true;
                        } else {
                            if (mergePosition !== row) {
                                board[mergePosition][col] = board[row][col];
                                board[row][col] = null;
                                moved = true;
                            }
                            previousValue = board[mergePosition][col];
                            mergePosition++;
                        }
                    }
                }
            }
        } else if (direction === 'down') {
            for (let col = 0; col < gridSize; col++) {
                let mergePosition = gridSize - 1;
                let previousValue = null;
                
                for (let row = gridSize - 1; row >= 0; row--) {
                    if (board[row][col] !== null) {
                        if (previousValue === board[row][col]) {
                            const mergedValue = previousValue * 2;
                            if (isSoundEnabled && mergeSound) {
                                mergeSound.currentTime = 0;
                                mergeSound.play();
                            }
                            board[mergePosition + 1][col] = mergedValue;
                            board[row][col] = null;
                            score += mergedValue;
                            previousValue = null;
                            moved = true;
                        } else {
                            if (mergePosition !== row) {
                                board[mergePosition][col] = board[row][col];
                                board[row][col] = null;
                                moved = true;
                            }
                            previousValue = board[mergePosition][col];
                            mergePosition--;
                        }
                    }
                }
            }
        } else if (direction === 'left') {
            for (let row = 0; row < gridSize; row++) {
                let mergePosition = 0;
                let previousValue = null;
                
                for (let col = 0; col < gridSize; col++) {
                    if (board[row][col] !== null) {
                        if (previousValue === board[row][col]) {
                            const mergedValue = previousValue * 2;
                            if (isSoundEnabled && mergeSound) {
                                mergeSound.currentTime = 0;
                                mergeSound.play();
                            }
                            board[row][mergePosition - 1] = mergedValue;
                            board[row][col] = null;
                            score += mergedValue;
                            previousValue = null;
                            moved = true;
                        } else {
                            if (mergePosition !== col) {
                                board[row][mergePosition] = board[row][col];
                                board[row][col] = null;
                                moved = true;
                            }
                            previousValue = board[row][mergePosition];
                            mergePosition++;
                        }
                    }
                }
            }
        } else if (direction === 'right') {
            for (let row = 0; row < gridSize; row++) {
                let mergePosition = gridSize - 1;
                let previousValue = null;
                
                for (let col = gridSize - 1; col >= 0; col--) {
                    if (board[row][col] !== null) {
                        if (previousValue === board[row][col]) {
                            const mergedValue = previousValue * 2;
                            if (isSoundEnabled && mergeSound) {
                                mergeSound.currentTime = 0;
                                mergeSound.play();
                            }
                            board[row][mergePosition + 1] = mergedValue;
                            board[row][col] = null;
                            score += mergedValue;
                            previousValue = null;
                            moved = true;
                        } else {
                            if (mergePosition !== col) {
                                board[row][mergePosition] = board[row][col];
                                board[row][col] = null;
                                moved = true;
                            }
                            previousValue = board[row][mergePosition];
                            mergePosition--;
                        }
                    }
                }
            }
        }
        
        if (moved) {
            scoreDisplay.textContent = score;
           if (score > bestScore) {
                bestScore = score;
                bestScoreDisplay.textContent = bestScore;
                localStorage.setItem('BestScore', bestScore);
                
                if (player) {
                    player.setData({ bestScore });
                }
                
                if (!hasNewRecordSoundPlayed && isSoundEnabled && newRecordSound) {
                    newRecordSound.currentTime = 0;
                    newRecordSound.play();
                    hasNewRecordSoundPlayed = true;
                }
            }
            
            updateBoardView();
            
            setTimeout(() => {
                checkGameOver();
                isMoving = false;
                swipeAnimationInProgress = false;
            }, 100);
        } else {
            isMoving = false;
            swipeAnimationInProgress = false;
        }
    }
    
    function updateBoardView() {
        const tiles = document.querySelectorAll('.tile:not(.falling-tile)');
        tiles.forEach(tile => {
            tile.remove();
        });
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] !== null) {
                    addTile(row, col, board[row][col]);
                }
            }
        }
    }
    
    function checkGameOver() {
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] === null) {
                    return false;
                }
            }
        }
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const value = board[row][col];
                
                if (row > 0 && board[row - 1][col] === value) return false;
                if (row < gridSize - 1 && board[row + 1][col] === value) return false;
                if (col > 0 && board[row][col - 1] === value) return false;
                if (col < gridSize - 1 && board[row][col + 1] === value) return false;
            }
        }
        
        gameOver();
        return true;
    }
    
    function gameOver() {
        if (isGameOver) return;
        
        isGameOver = true;
        gameOverDisplay.style.display = 'flex';
        finalScoreDisplay.textContent = score;
        clearInterval(dropInterval);
        clearInterval(dropTimerInterval);
        updatePlayerScore();
        
        if (hasSecondChance) {
            document.getElementById('second-chance-button').style.display = 'flex';
        } else {
            document.getElementById('second-chance-button').style.display = 'none';
        }
        
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.stop();
        }
        
        if (isSoundEnabled) {
            loseSound.currentTime = 0;
            loseSound.play();
        }
    }

    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                move('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                move('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                move('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                move('right');
                break;
            case ' ':
            case 'p':
                e.preventDefault();
                togglePause();
                break;
        }
    });
    
    restartButton.addEventListener('click', () => {
        showFullscreenAd();
    });
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    gridContainer.addEventListener('touchstart', (e) => {
        if (isGameOver) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });
    
    gridContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    gridContainer.addEventListener('touchend', (e) => {
        if (isGameOver || !touchStartX || !touchStartY || isPaused) return;
        
        if (timeUntilNextDrop <= 500) {
            touchStartX = 0;
            touchStartY = 0;
            return;
        }
        
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (Math.max(absDx, absDy) < 30) return;
        
        if (absDx > absDy) {
            if (dx > 0) {
                move('right');
            } else {
                move('left');
            }
        } else {
            if (dy > 0) {
                move('down');
            } else {
                move('up');
            }
        }
        
        touchStartX = 0;
        touchStartY = 0;
        e.preventDefault();
    }, { passive: false });
});


