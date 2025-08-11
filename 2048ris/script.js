document.addEventListener('DOMContentLoaded', () => {
    const gridSize = 4;
    const grid = document.getElementById('grid');
    const previewRow = document.getElementById('preview-row');
    const scoreDisplay = document.getElementById('score');
    const bestScoreDisplay = document.getElementById('best-score');
    const gameOverDisplay = document.getElementById('game-over');
    const restartButton = document.getElementById('restart-button');
    const gridContainer = document.getElementById('grid-container');
    const fallingArea = document.getElementById('falling-area');
    const timerText = document.getElementById('timer-text');
    const timerProgress = document.getElementById('timer-progress');
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const instructions = document.getElementById('instructions');
    
    let board = [];
    let nextTiles = [];
    let score = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
    let isGameOver = false;
    let isMoving = false;
    let dropInterval;
    let dropTimer = 3;
    let dropTimerInterval;
    let lastDropTime = 0;
    let hasMoved = false;
    let isPaused = false;
    let fallingTilesCount = 0;
    let animationInProgress = false;
    
    bestScoreDisplay.textContent = bestScore;
    
    // Start button event listener
    startButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        instructions.style.display = 'block';
        initGame();
    });
    
    // Pause button event listener
    pauseButton.addEventListener('click', togglePause);
    
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            clearInterval(dropInterval);
            clearInterval(dropTimerInterval);
            pauseButton.style.background = 'linear-gradient(145deg, #ff9a76, #ff7b54)';
            pauseButton.querySelector('span').textContent = 'ПРОДОЛЖИТЬ';
        } else {
            startDropTimer();
            scheduleNextDrop();
            pauseButton.style.background = 'linear-gradient(145deg, #2d4059, #1d2d44)';
            pauseButton.querySelector('span').textContent = 'ПАУЗА';
        }
    }
    
    // Initialize the game
    function initGame() {
        // Clear the grid and preview
        grid.innerHTML = '';
        previewRow.innerHTML = '';
        fallingArea.innerHTML = '';
        
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
        hasMoved = false;
        nextTiles = [];
        isPaused = false;
        fallingTilesCount = 0;
        animationInProgress = false;
        
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
        
        if (dropInterval) clearInterval(dropInterval);
        
        dropInterval = setTimeout(() => {
            if (!isGameOver && !isMoving && !isPaused && fallingTilesCount === 0 && !animationInProgress) {
                addFallingTileFromQueue(); // Вызываем один раз - он сам обработает все плитки
            }
            lastDropTime = Date.now();
            scheduleNextDrop();
        }, delay);
    }

    // Add falling tile from queue
    function addFallingTileFromQueue() {
        if (isGameOver || nextTiles.length === 0 || isMoving || isPaused || animationInProgress) return;
        
        // Берем все доступные плитки из очереди (максимум 2)
        const tilesToDrop = nextTiles.splice(0, 2);
        
        // Добавляем все плитки одновременно
        tilesToDrop.forEach(tile => {
            addFallingTile(tile.column, tile.value);
        });
        
        // Генерируем новые плитки для превью, если очередь опустела
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
        
        fallingTile.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
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
        scoreDisplay.textContent = score;
        if (score > bestScore) {
            bestScore = score;
            bestScoreDisplay.textContent = bestScore;
            localStorage.setItem('bestScore', bestScore);
        }
        
        const tileElement = document.getElementById(`tile-${row}-${col}`);
        if (tileElement) {
            tileElement.textContent = newValue;
            tileElement.className = `tile tile-${newValue}`;
            
            tileElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                tileElement.style.transform = 'scale(1)';
            }, 100);
        } else {
            addTile(row, col, newValue);
        }
    }
    
    // Move tiles in a direction
    function move(direction) {
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
            hasMoved = true;
            
            scoreDisplay.textContent = score;
            if (score > bestScore) {
                bestScore = score;
                bestScoreDisplay.textContent = bestScore;
                localStorage.setItem('bestScore', bestScore);
            }
            
            updateBoardView();
            
            setTimeout(() => {
                checkGameOver();
                isMoving = false;
            }, 100);
        } else {
            isMoving = false;
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
        clearInterval(dropInterval);
        clearInterval(dropTimerInterval);
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
    restartButton.addEventListener('click', initGame);
    
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
        if (isGameOver || !touchStartX || !touchStartY) return;
        
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (Math.max(absDx, absDy) < 30) return; // Ignore small movements
        
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