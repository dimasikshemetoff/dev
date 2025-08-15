document.addEventListener('DOMContentLoaded', () => {
    const BOARD_SIZE = 128;
    const CELL_SIZE = 4; // 512px / 128 cells = 4px per cell
    const gameBoard = document.getElementById('game-board');
    const colorPicker = document.getElementById('color-picker');
    const progressSpan = document.getElementById('progress');
    
    let playerPos = { x: 0, y: 0 };
    let currentColor = '#ff0000';
    let paintedCells = 0;
    let totalCells = BOARD_SIZE * BOARD_SIZE;
    let grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(false));
    
    // Инициализация игрового поля
    function initGameBoard() {
        gameBoard.innerHTML = '';
        
        // Создаем клетки
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                gameBoard.appendChild(cell);
            }
        }
        
        // Создаем игрока
        const player = document.createElement('div');
        player.className = 'player';
        player.id = 'player';
        player.style.backgroundColor = currentColor;
        gameBoard.appendChild(player);
        
        // Создаем вспомогательные кубики в центре
        createHelperCubes();
        
        // Устанавливаем начальную позицию игрока
        updatePlayerPosition();
    }
    
    // Создание вспомогательных кубиков в центре
    function createHelperCubes() {
        const center = Math.floor(BOARD_SIZE / 2);
        const offsets = [-1, 0, 1];
        
        offsets.forEach(dx => {
            offsets.forEach(dy => {
                if (dx === 0 && dy === 0) return; // Пропускаем центр (там будет игрок)
                
                const helper = document.createElement('div');
                helper.className = 'helper';
                helper.style.left = `${(center + dx) * CELL_SIZE}px`;
                helper.style.top = `${(center + dy) * CELL_SIZE}px`;
                gameBoard.appendChild(helper);
            });
        });
    }
    
    // Обновление позиции игрока
    function updatePlayerPosition() {
        const player = document.getElementById('player');
        player.style.left = `${playerPos.x * CELL_SIZE}px`;
        player.style.top = `${playerPos.y * CELL_SIZE}px`;
        
        // Закрашиваем клетку под игроком
        paintCurrentCell();
    }
    
    // Закрашивание текущей клетки
    function paintCurrentCell() {
        const x = playerPos.x;
        const y = playerPos.y;
        
        if (!grid[y][x]) {
            grid[y][x] = true;
            paintedCells++;
            updateProgress();
            
            // Находим клетку в DOM и закрашиваем
            const cells = document.querySelectorAll('.cell');
            const index = y * BOARD_SIZE + x;
            if (index < cells.length) {
                cells[index].style.backgroundColor = currentColor;
                cells[index].style.borderColor = currentColor;
            }
        }
    }
    
    // Обновление прогресса
    function updateProgress() {
        const progress = Math.round((paintedCells / totalCells) * 100);
        progressSpan.textContent = progress;
    }
    
    // Движение игрока до стенки
    function movePlayer(dx, dy) {
        let newX = playerPos.x;
        let newY = playerPos.y;
        
        // Двигаемся пока не упремся в стенку
        while (true) {
            const nextX = newX + dx;
            const nextY = newY + dy;
            
            if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
                break;
            }
            
            newX = nextX;
            newY = nextY;
        }
        
        playerPos = { x: newX, y: newY };
        updatePlayerPosition();
    }
    
    // Обработка нажатий клавиш
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                movePlayer(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                movePlayer(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                movePlayer(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                movePlayer(1, 0);
                break;
        }
    });
    
    // Изменение цвета
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        document.getElementById('player').style.backgroundColor = currentColor;
    });
    
    // Инициализация игры
    initGameBoard();
});