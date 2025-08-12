// Инициализация Yandex SDK
let ysdk;
let player;

YaGames.init().then(_ysdk => {
    ysdk = _ysdk;
    window.ysdk = ysdk;
    console.log('Yandex SDK initialized');
    
    // Инициализация игрока
    return ysdk.getPlayer();
}).then(_player => {
    player = _player;
    console.log('Player initialized');
    
    // Проверка авторизации
    if (!player.isAuthorized()) {
        // Можно предложить авторизацию
        console.log('Player is not authorized');
    }
    
    // Загружаем лучший счет из данных игрока
    return player.getData(['bestScore']);
}).then(data => {
    if (data && data.bestScore) {
        const bestScoreDisplay = document.getElementById('best-score');
        bestScoreDisplay.textContent = data.bestScore;
        localStorage.setItem('bestScore', data.bestScore);
    }
}).catch(err => {
    console.error('Yandex SDK initialization error:', err);
});

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
    
    let board = [];
    let nextTiles = [];
    let score = 0;
    let lastscore = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
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
    
    // Sound elements
    let loseSound;
    let mergeSound;
    let newRecordSound;
    let pauseResumeSound;
    
    soundButton.addEventListener('click', toggleSound);
    bestScoreDisplay.textContent = bestScore;
    
    // Start button event listener
    startButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        initGame();
        
        // Уведомляем SDK, что игра загружена и готова
        if (ysdk && ysdk.features && ysdk.features.LoadingAPI) {
            ysdk.features.LoadingAPI.ready();
        }
        
        // Уведомляем SDK о начале геймплея
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.start();
        }
    });
    
    // Pause button event listener
    pauseButton.addEventListener('click', togglePause);
    
    // Second chance button event listener
    secondChanceButton.addEventListener('click', showRewardedAd);

    function toggleSound() {
        isSoundEnabled = !isSoundEnabled;
        
        if (isSoundEnabled) {
            soundButton.classList.remove('muted');
            soundIcon.textContent = '🔊';
        } else {
            soundButton.classList.add('muted');
            soundIcon.textContent = '🔇';
        }
    }
    
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            clearInterval(dropInterval);
            clearInterval(dropTimerInterval);
            pauseButton.style.background = 'linear-gradient(145deg, #ff9a76, #ff7b54)';
            pauseButton.querySelector('span').textContent = 'ДАЛЕЕ';
            
            // Уведомляем SDK о паузе в игре
            if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
                ysdk.features.GameplayAPI.stop();
            }
            
            // Play pause/resume sound
            if (isSoundEnabled) {
                pauseResumeSound.currentTime = 0;
                pauseResumeSound.play();
            }
        } else {
            startDropTimer();
            scheduleNextDrop();
            pauseButton.style.background = 'linear-gradient(145deg, #2d4059, #1d2d44)';
            pauseButton.querySelector('span').textContent = 'ПАУЗА';
            
            // Уведомляем SDK о возобновлении игры
            if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
                ysdk.features.GameplayAPI.start();
            }
            
            // Play pause/resume sound
            if (isSoundEnabled) {
                pauseResumeSound.currentTime = 0;
                pauseResumeSound.play();
            }
        }
    }
    
    function showRewardedAd() {
        if (!ysdk || !ysdk.adv) {
            // Если SDK не загружен, просто даем второй шанс
            useSecondChance();
            return;
        }
        
        ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log('Rewarded ad opened');
                    // Уведомляем SDK о паузе в игре
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
                    // Уведомляем SDK о возобновлении игры
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.start();
                    }
                },
                onError: (e) => {
                    console.log('Rewarded ad error:', e);
                    // В случае ошибки все равно даем второй шанс
                    useSecondChance();
                }
            }
        });
    }
    
    function useSecondChance() {
        if (!hasSecondChance) return;
        
        hasSecondChance = false; // Устанавливаем флаг, что второй шанс использован
        isGameOver = false;
        gameOverDisplay.style.display = 'none';
        
        // Очищаем верхний ряд
        for (let col = 0; col < gridSize; col++) {
            if (board[0][col] !== null) {
                const tile = document.getElementById(`tile-0-${col}`);
                if (tile) tile.remove();
                board[0][col] = null;
            }
        }
        
        // Сбрасываем таймеры
        clearInterval(dropInterval);
        clearInterval(dropTimerInterval);
        
        // Обновляем отображение
        updateBoardView();
        
        // Перезапускаем таймеры
        startDropTimer();
        scheduleNextDrop();
        
        // Уведомляем SDK о возобновлении игры
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.start();
        }
    }
    
    function showFullscreenAd() {
        if (!ysdk || !ysdk.adv) {
            // Если SDK не загружен, просто перезапускаем игру
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
                    
                    // Всегда возобновляем игру, независимо от того, была ли показана реклама
                    if (ysdk.features && ysdk.features.GameplayAPI) {
                        ysdk.features.GameplayAPI.start();
                    }
                    
                    // Перезапускаем игру в любом случае
                    initGame();
                },
                onError: (e) => {
                    
                    // В случае ошибки все равно перезапускаем игру
                    initGame();
                }
            }
        });
    }
    
    // Initialize the game
    function initGame() {
        // Clear the grid and preview
        grid.innerHTML = '';
        previewRow.innerHTML = '';
        fallingArea.innerHTML = '';
        
        // Initialize sounds
        loseSound = document.getElementById('lose-sound');
        mergeSound = document.getElementById('merge-sound');
        newRecordSound = document.getElementById('newrecord-sound');
        pauseResumeSound = document.getElementById('pauseresume-sound');
        
        // Set volume (optional)
        loseSound.volume = 0.2;
        mergeSound.volume = 0.1;
        newRecordSound.volume = 0.5;
        pauseResumeSound.volume = 0.1;
        
        // Инициализация лидерборда
        initLeaderboard();
        // Create preview cells
        for (let i = 0; i < gridSize; i++) {
            const previewCell = document.createElement('div');
            previewCell.className = 'preview-cell';
            previewCell.id = `preview-cell-${i}`;
            previewRow.appendChild(previewCell);
        }
        
        // Create grid cells
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
        hasSecondChance = true; // Сбрасываем флаг второго шанса при новой игре
        nextTiles = [];
        isPaused = false;
        fallingTilesCount = 0;
        animationInProgress = false;
        swipeAnimationInProgress = false;
        
        // Generate first next tiles (2 tiles)
        generateNextTile();
        generateNextTile();
        updatePreview();
        
        // Add initial tiles (2 tiles)
        addRandomTile();
        addRandomTile();
        
        // Start the falling tiles interval
        if (dropInterval) clearInterval(dropInterval);
        if (dropTimerInterval) clearInterval(dropTimerInterval);
        
        startDropTimer();
        scheduleNextDrop();
    }
    
    // Generate next falling tile with updated probabilities
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
            } else if (random < 0.6) { // 0.1-0.6 = 50%
                value = 4;
            } else { // 0.6-1.0 = 40%
                value = 2;
            }
        } else {
            value = Math.random() < 0.85 ? 2 : 4;
        }
        
        nextTiles.push({ column, value });
        
        // Keep only 2 next tiles in queue
        if (nextTiles.length > 2) {
            nextTiles.shift();
        }
    }
    
    // Update the preview display
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

    // Добавьте эту функцию для инициализации лидерборда
    function initLeaderboard() {
        if (!ysdk || !ysdk.leaderboards) {
            console.log('Leaderboards not available');
            return;
        }
        
        // Проверяем доступность метода
        ysdk.isAvailableMethod('leaderboards.getPlayerEntry').then(available => {
            if (available) {
                updateLeaderboard();
            } else {
                console.log('Leaderboards methods not available for this user');
                document.getElementById('leaderboard-box').style.display = 'none';
            }
        });
    }

    // Функция для обновления данных лидерборда
    function updateLeaderboard() {
        if (!ysdk || !ysdk.leaderboards) return;
        
        // Получаем запись текущего игрока
        ysdk.leaderboards.getPlayerEntry(leaderboardName)
            .then(entry => {
                displayPlayerRank(entry);
            })
            .catch(err => {
                console.log('Leaderboard error:', err);
                document.getElementById('leaderboard-box').style.display = 'none';
            });
    }

    // Функция для отображения места игрока
    function displayPlayerRank(entry) {
        const rankElement = document.getElementById('player-rank');
        
        if (entry) {
            playerRank = entry.rank;
            rankElement.textContent = entry.rank;
            
            // Обновляем запись игрока в лидерборде, если его текущий счет выше
            if (score > 0 && score > entry.score) {
                updatePlayerScore();
            }
        } else {
            rankElement.textContent = '-';
        }
    }
    
    
    // Schedule next tile drop
    function scheduleNextDrop() {
        const now = Date.now();
        const timeSinceLastDrop = now - lastDropTime;
        let delay;
        
        if (score >= 1000) {
            delay = Math.max(0, 3000 - timeSinceLastDrop);
        } else if (score >= 300) {
            delay = Math.max(0, 4000 - timeSinceLastDrop);
        } else {
            delay = Math.max(0, 5000 - timeSinceLastDrop);
        }
        
        // Обновляем время до следующего падения
        timeUntilNextDrop = delay;
        
        if (dropInterval) clearInterval(dropInterval);
        
        dropInterval = setTimeout(() => {
            if (!isGameOver && !isMoving && !isPaused && fallingTilesCount === 0 && !animationInProgress) {
                addFallingTileFromQueue();
            }
            lastDropTime = Date.now();
            scheduleNextDrop();
        }, delay);
    }

    // Add falling tile from queue
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
    
    // Start drop timer countdown
    function startDropTimer() {
        dropTimer = 3;
        updateTimerDisplay();
        
        if (dropTimerInterval) clearInterval(dropTimerInterval);
        
        dropTimerInterval = setInterval(() => {
            if (isPaused) return;
            
            const now = Date.now();
            const timeSinceLastDrop = now - lastDropTime;
            let totalTime;
            
            if (score >= 1000) {
                totalTime = 3000;
            } else if (score >= 300) {
                totalTime = 4000;
            } else {
                totalTime = 5000;
            }
            
            dropTimer = Math.max(0, (totalTime - timeSinceLastDrop) / 1000);
            updateTimerDisplay();
        }, 50);
    }
    
    // Update timer display
    function updateTimerDisplay() {
        timerText.textContent = dropTimer.toFixed(1);
        let totalTime;
        
        if (score >= 1000) {
            totalTime = 3;
        } else if (score >= 300) {
            totalTime = 4;
        } else {
            totalTime = 5;
        }
        
        timerProgress.style.width = `${(dropTimer / totalTime) * 100}%`;
    }
    
    // Add a random tile (2 or 4) to a random empty cell
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

    // Функция для обновления счета игрока в лидерборде
    function updatePlayerScore() {
        if (!ysdk || !ysdk.leaderboards || score <= 0) return;
        
        // Проверяем доступность метода
        ysdk.isAvailableMethod('leaderboards.setScore').then(available => {
            if (available) {
                ysdk.leaderboards.setScore(leaderboardName, score)
                    .then(() => {
                        console.log('Score updated in leaderboard');
                        // После обновления счета обновляем отображение
                        updateLeaderboard();
                    })
                    .catch(err => {
                        console.log('Error updating leaderboard score:', err);
                    });
            }
        });
}
    
    // Add a single falling tile to a column
    function addFallingTile(col, value) {
        fallingTilesCount++;
        animationInProgress = true;
        const fallingTile = document.createElement('div');
        fallingTile.className = `falling-tile tile-${value}`;
        fallingTile.textContent = value;
        
        const cell = document.getElementById('cell-0-0');
        const cellRect = cell.getBoundingClientRect();
        const gridRect = gridContainer.getBoundingClientRect();
        
        const leftPos = cellRect.left - gridRect.left + col * (cellRect.width + 15);
        fallingTile.style.left = `${leftPos}px`;
        fallingTile.style.top = '0';
        
        fallingArea.appendChild(fallingTile);
        
        fallingTile.getBoundingClientRect();
        
        let landingRow = 0;
        while (landingRow < gridSize && board[landingRow][col] === null) {
            landingRow++;
        }
        
        const finalTop = cellRect.top - gridRect.top + (landingRow > 0 ? landingRow - 1 : 0) * (cellRect.height + 15) - 15;
        
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
    
    // Check if top row is full
    function checkTopRowFull() {
        for (let col = 0; col < gridSize; col++) {
            if (board[0][col] === null) {
                return false;
            }
        }
        gameOver();
        return true;
    }
    
    // Add a tile to the board
    function addTile(row, col, value) {
        board[row][col] = value;
        const tile = createTile(row, col, value);
        document.getElementById(`cell-${row}-${col}`).appendChild(tile);
    }
    
    // Create a tile element
    function createTile(row, col, value) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} tile-new`;
        tile.id = `tile-${row}-${col}`;
        tile.textContent = value;
        return tile;
    }
    
    // Merge tiles
    function mergeTiles(row, col, value) {
        const newValue = value * 2;
        board[row][col] = newValue;
        
        score += newValue;
        if(score !== lastscore){
            // Play merge sound
            if (isSoundEnabled && score !== lastscore) {
                mergeSound.currentTime = 0;
                mergeSound.play();
            }
        }
        lastscore = score;
        scoreDisplay.textContent = score;
        
        if (score > bestScore) {
            bestScore = score;
            bestScoreDisplay.textContent = bestScore;
            localStorage.setItem('bestScore', bestScore);
            
            // Сохраняем лучший счет в данных игрока
            if (player) {
                player.setData({ bestScore });
            }
            
            // Play new record sound if this is a new high score
            newRecordSound.currentTime = 0;
            newRecordSound.play();
        }
        
        const tileElement = document.getElementById(`tile-${row}-${col}`);
        if (tileElement) {
            tileElement.textContent = newValue;
            tileElement.className = `tile tile-${newValue}`;
            
            tileElement.style.transform = 'scale(1)';
            setTimeout(() => {
                tileElement.style.transform = 'scale(1)';
            }, 100);
        } else {
            addTile(row, col, newValue);
        }
    }
    
    // Move tiles in a direction
    function move(direction) {
        // Проверяем, что до падения осталось больше 500 мс
        if (timeUntilNextDrop <= 500) {
            return; // Прерываем свайп, если до падения меньше 500 мс
        }
        
        if (isGameOver || isMoving || isPaused || fallingTilesCount > 0 || animationInProgress) return;
        
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
                            if (isSoundEnabled) {
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
                            if (isSoundEnabled) {
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
                            if (isSoundEnabled) {
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
                            if (isSoundEnabled) {
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
                localStorage.setItem('bestScore', bestScore);
                
                // Сохраняем лучший счет в данных игрока
                if (player) {
                    player.setData({ bestScore });
                }
                
                // Play new record sound if this is a new high score
                newRecordSound.currentTime = 0;
                newRecordSound.play();
            }
            
            updateBoardView();
            
            setTimeout(() => {
                checkGameOver();
                isMoving = false;
                swipeAnimationInProgress = false; // Сбрасываем флаг анимации свайпа
            }, 100);
        } else {
            isMoving = false;
            swipeAnimationInProgress = false; // Сбрасываем флаг анимации свайпа
        }
    }
    
    // Update the board view after moves
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
    
    // Check if game is over
    function checkGameOver() {
        // Check for empty cells
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] === null) {
                    return false;
                }
            }
        }
        
        // Check for possible merges
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const value = board[row][col];
                
                // Check adjacent tiles
                if (row > 0 && board[row - 1][col] === value) return false;
                if (row < gridSize - 1 && board[row + 1][col] === value) return false;
                if (col > 0 && board[row][col - 1] === value) return false;
                if (col < gridSize - 1 && board[row][col + 1] === value) return false;
            }
        }
        
        // Game over
        gameOver();
        return true;
    }
    
    // Game over function
    function gameOver() {
        if (isGameOver) return;
        
        isGameOver = true;
        gameOverDisplay.style.display = 'flex';
        finalScoreDisplay.textContent = score;
        clearInterval(dropInterval);
        clearInterval(dropTimerInterval);
        updatePlayerScore();
        
        // Показываем или скрываем кнопку второго шанса в зависимости от того, был ли он уже использован
        if (hasSecondChance) {
            document.getElementById('second-chance-button').style.display = 'block';
        } else {
            document.getElementById('second-chance-button').style.display = 'none';
        }
        
        // Уведомляем SDK об окончании геймплея
        if (ysdk && ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.stop();
        }
        
        // Play lose sound
        if (isSoundEnabled) {
            loseSound.currentTime = 0;
            loseSound.play();
        }
    }
    // Event listeners for keyboard controls
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
    
    // Restart button event listener
    restartButton.addEventListener('click', () => {
        // Показываем полноэкранную рекламу перед перезапуском
        showFullscreenAd();
    });
    
    // Touch controls for mobile
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
        
        // Проверяем, что до падения осталось больше 200 мс
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