// Canvas and context setup Script.js
let canvas = document.getElementById('mazeCanvas');
let ctx = canvas.getContext('2d');

// UI elements
let progressBar = document.getElementById('progressBar');
let progressText = document.getElementById('progress');
let algorithmText = document.getElementById('algorithm');
let cellsProcessedText = document.getElementById('cellsProcessed');
let operationTimeText = document.getElementById('operationTime');
let computationSpeedText = document.getElementById('computationSpeed');
let startStopBtn = document.getElementById('startStopBtn');
let resetBtn = document.getElementById('resetBtn');
let solveBtn = document.getElementById('solveBtn');
let algorithmSelect = document.getElementById('algorithmSelect');
let mazeWidthInput = document.getElementById('mazeWidth');
let mazeHeightInput = document.getElementById('mazeHeight');
let cellSizeRange = document.getElementById('cellSizeRange');

// Maze parameters
let cellSize = parseInt(cellSizeRange.value) || 16;
let mazeWidth = parseInt(mazeWidthInput.value) || 24;
let mazeHeight = parseInt(mazeHeightInput.value) || 24;
let wallThickness = 2;

// Entrance and exit positions
let entranceCell = { x: 0, y: 0 };
let exitCell = { x: mazeWidth - 1, y: mazeHeight - 1 };

// Animation and timing parameters
let animationFrameId = null;
let isRunning = false;
let cellsProcessed = 0;
let lastTimestamp = 0;
let processingCounter = 0;
let processingRate = 0;
let lastRateUpdate = 0;
let mazeCompleted = false;

// Grid for the maze
let grid = [];

// Colors
const colors = {
    background: '#121212',
    wall: '#e0e0e0',
    visited: '#355c7d',
    frontier: '#6a8caf',
    current: '#c06c84',
    path: '#f67280',
    entrance: '#63d471',
    exit: '#fd8a5e'
};

// Algorithm-specific data structures
let frontier = [];
let currentCell = null;
let visitedCells = 0;
let totalCells = 0;
let algorithm = algorithmSelect.value || 'prim';

// Speed settings
const speeds = {
    slow: { delay: 120, cellsPerFrame: 1 },
    medium: { delay: 60, cellsPerFrame: 2 },
    fast: { delay: 30, cellsPerFrame: 4 }
};
let speed = speeds.medium;
let solverSpeed = speeds.medium;
let lastFrameTime = 0;

// Initialize the canvas size
function initCanvas() {
    canvas.width = cellSize * mazeWidth + wallThickness;
    canvas.height = cellSize * mazeHeight + wallThickness;
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Initialize the grid
function initGrid() {
    grid = [];
    for (let y = 0; y < mazeHeight; y++) {
        const row = [];
        for (let x = 0; x < mazeWidth; x++) {
            row.push({
                x,
                y,
                visited: false,
                walls: { top: true, right: true, bottom: true, left: true },
                inFrontier: false
            });
        }
        grid.push(row);
    }
    totalCells = mazeWidth * mazeHeight;
    
    // Set entrance and exit cells
    setEntranceAndExit();
}

// Set entrance and exit cells
function setEntranceAndExit() {
    // Set entrance at top left area
    entranceCell = { x: 0, y: 0 };
    grid[entranceCell.y][entranceCell.x].walls.left = false;
    
    // Set exit at bottom right area
    exitCell = { x: mazeWidth - 1, y: mazeHeight - 1 };
    grid[exitCell.y][exitCell.x].walls.right = false;
}

// Reset the maze generation
function resetMaze() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    isRunning = false;
    cellsProcessed = 0;
    visitedCells = 0;
    processingCounter = 0;
    processingRate = 0;
    lastRateUpdate = 0;
    mazeCompleted = false;
    
    initGrid();
    drawGrid();
    
    frontier = [];
    algorithm = algorithmSelect.value;
    
    algorithmText.textContent = getAlgorithmName(algorithm);
    progressText.textContent = '0%';
    progressBar.style.width = '0%';
    cellsProcessedText.textContent = '0';
    computationSpeedText.textContent = '0 cells/s';
    operationTimeText.textContent = '0ms';
    
    startStopBtn.textContent = 'Generate Maze';
    startStopBtn.disabled = false;
    
    if (solveBtn) {
        solveBtn.disabled = true;
    }
}

// Get readable algorithm name
function getAlgorithmName(alg) {
    switch (alg) {
        case 'prim': return "Prim's Algorithm";
        case 'dfs': return "Depth-First Search";
        default: return alg;
    }
}

// Draw the grid
function drawGrid() {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            const cell = grid[y][x];
            
            // Fill cell based on its state
            if ((x === entranceCell.x && y === entranceCell.y)) {
                ctx.fillStyle = colors.entrance;
                ctx.fillRect(
                    x * cellSize + wallThickness/2, 
                    y * cellSize + wallThickness/2, 
                    cellSize, 
                    cellSize
                );
            } else if ((x === exitCell.x && y === exitCell.y)) {
                ctx.fillStyle = colors.exit;
                ctx.fillRect(
                    x * cellSize + wallThickness/2, 
                    y * cellSize + wallThickness/2, 
                    cellSize, 
                    cellSize
                );
            } else if (currentCell && currentCell.x === x && currentCell.y === y) {
                ctx.fillStyle = colors.current;
                ctx.fillRect(
                    x * cellSize + wallThickness/2, 
                    y * cellSize + wallThickness/2, 
                    cellSize, 
                    cellSize
                );
            } else if (cell.visited) {
                ctx.fillStyle = colors.visited;
                ctx.fillRect(
                    x * cellSize + wallThickness/2, 
                    y * cellSize + wallThickness/2, 
                    cellSize, 
                    cellSize
                );
            } else if (cell.inFrontier) {
                ctx.fillStyle = colors.frontier;
                ctx.fillRect(
                    x * cellSize + wallThickness/2, 
                    y * cellSize + wallThickness/2, 
                    cellSize, 
                    cellSize
                );
            }
            
            // Draw walls
            ctx.strokeStyle = colors.wall;
            ctx.lineWidth = wallThickness;
            ctx.beginPath();
            
            if (cell.walls.top) {
                ctx.moveTo(x * cellSize + wallThickness/2, y * cellSize + wallThickness/2);
                ctx.lineTo((x + 1) * cellSize + wallThickness/2, y * cellSize + wallThickness/2);
            }
            
            if (cell.walls.right) {
                ctx.moveTo((x + 1) * cellSize + wallThickness/2, y * cellSize + wallThickness/2);
                ctx.lineTo((x + 1) * cellSize + wallThickness/2, (y + 1) * cellSize + wallThickness/2);
            }
            
            if (cell.walls.bottom) {
                ctx.moveTo(x * cellSize + wallThickness/2, (y + 1) * cellSize + wallThickness/2);
                ctx.lineTo((x + 1) * cellSize + wallThickness/2, (y + 1) * cellSize + wallThickness/2);
            }
            
            if (cell.walls.left) {
                ctx.moveTo(x * cellSize + wallThickness/2, y * cellSize + wallThickness/2);
                ctx.lineTo(x * cellSize + wallThickness/2, (y + 1) * cellSize + wallThickness/2);
            }
            
            ctx.stroke();
        }
    }
}

// Get neighboring cells
function getNeighbors(x, y) {
    const neighbors = [];
    
    if (y > 0) neighbors.push({ x, y: y - 1, direction: 'top', opposite: 'bottom' });
    if (x < mazeWidth - 1) neighbors.push({ x: x + 1, y, direction: 'right', opposite: 'left' });
    if (y < mazeHeight - 1) neighbors.push({ x, y: y + 1, direction: 'bottom', opposite: 'top' });
    if (x > 0) neighbors.push({ x: x - 1, y, direction: 'left', opposite: 'right' });
    
    return neighbors;
}

// Initialize the algorithm
function initAlgorithm() {
    visitedCells = 0;
    frontier = [];
    
    if (algorithm === 'dfs') {
        // Start at entrance
        const startX = entranceCell.x;
        const startY = entranceCell.y;
        grid[startY][startX].visited = true;
        visitedCells++;
        frontier.push({ x: startX, y: startY });
    } else {
        visitCell(entranceCell.x, entranceCell.y); // for Prim's
    }
}

// Visit a cell and add its neighbors to the frontier
function visitCell(x, y) {
    const cell = grid[y][x];
    cell.visited = true;
    cell.inFrontier = false;
    visitedCells++;
    cellsProcessed++;
    processingCounter++;
    
    // Add unvisited neighbors to the frontier
    const neighbors = getNeighbors(x, y);
    for (const neighbor of neighbors) {
        const nx = neighbor.x;
        const ny = neighbor.y;
        const neighborCell = grid[ny][nx];
        
        if (!neighborCell.visited && !neighborCell.inFrontier) {
            neighborCell.inFrontier = true;
            frontier.push({ 
                x: nx, 
                y: ny, 
                fromX: x, 
                fromY: y, 
                direction: neighbor.direction, 
                opposite: neighbor.opposite 
            });
        }
    }
}

// Prim's algorithm step
function primStep() {
    if (frontier.length === 0) return false;
    
    // Choose a random cell from the frontier
    const randomIndex = Math.floor(Math.random() * frontier.length);
    const { x, y, fromX, fromY, direction, opposite } = frontier[randomIndex];
    frontier.splice(randomIndex, 1);
    
    currentCell = { x, y };
    
    // Remove the wall between the current cell and the cell it came from
    grid[y][x].walls[opposite] = false;
    grid[fromY][fromX].walls[direction] = false;
    
    visitCell(x, y);
    return true;
}

function dfsStep() {
    if (frontier.length === 0) return false;

    const current = frontier[frontier.length - 1];
    const { x, y } = current;
    currentCell = { x, y };
    const cell = grid[y][x];
    
    // Get unvisited neighbors
    const neighbors = getNeighbors(x, y).filter(n => {
        const neighbor = grid[n.y][n.x];
        return !neighbor.visited;
    });

    if (neighbors.length > 0) {
        // Pick one at random
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const nextCell = grid[next.y][next.x];

        // Knock down wall between current and next
        cell.walls[next.direction] = false;
        nextCell.walls[next.opposite] = false;
        
        // Mark next cell as visited
        nextCell.visited = true;
        visitedCells++;
        cellsProcessed++;
        processingCounter++;

        // Push next cell to stack
        frontier.push({ x: next.x, y: next.y });
    } else {
        // Backtrack
        frontier.pop();
    }

    return true;
}

// Perform one algorithm step
function algorithmStep() {
    let result = false;
    
    switch (algorithm) {
        case 'prim':
            result = primStep();
            break;
        case 'dfs':
            result = dfsStep();
            break;
    }
    
    return result;
}

// Animation loop
function animate(timestamp) {
    if (!isRunning) return;
    
    // Calculate time difference
    const deltaTime = timestamp - lastFrameTime;
    
    // Process algorithm steps with delay
    if (deltaTime >= speed.delay) {
        let continueAlgorithm = true;
        
        // Process multiple cells per frame based on speed setting
        for (let i = 0; i < speed.cellsPerFrame && continueAlgorithm; i++) {
            continueAlgorithm = algorithmStep();
            
            if (!continueAlgorithm && !mazeCompleted) {
                mazeCompleted = true;
                isRunning = false;
                startStopBtn.textContent = 'Maze Generated';
                startStopBtn.disabled = true;
                if (solveBtn) {
                    solveBtn.disabled = false;
                }
            }
        }
        
        // Update UI
        var progress;
        if (algorithm === 'dfs') {
            // DFS can backtrack so we need to be careful with progress calculation
            progress = Math.min(Math.floor((visitedCells / totalCells) * 100), 100);
        } else {
            progress = Math.floor((visitedCells / totalCells) * 100);
        }
        progressText.textContent = `${progress}%`;
        progressBar.style.width = `${progress}%`;
        cellsProcessedText.textContent = `${cellsProcessed}`;
        
        // Draw the grid
        drawGrid();
        
        lastFrameTime = timestamp;
    }
    
    // Calculate processing speed every second
    if (timestamp - lastRateUpdate > 1000) {
        processingRate = processingCounter;
        processingCounter = 0;
        computationSpeedText.textContent = `${processingRate} cells/s`;
        lastRateUpdate = timestamp;
    }
    
    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
}

// Start/stop the algorithm
function toggleRunning() {
    if (isRunning) {
        isRunning = false;
        startStopBtn.textContent = 'Continue';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        if (visitedCells === 0) {
            initAlgorithm();
        }
        
        isRunning = true;
        startStopBtn.textContent = 'Pause';
        lastFrameTime = performance.now();
        lastRateUpdate = lastFrameTime;
        animationFrameId = requestAnimationFrame(animate);
    }
}

// Initialize solver function stub (will be implemented in maze-solver.js)
function initSolver() {
    // This function will be overridden by maze-solver.js
    console.log('Solver initialized');
}

// Set up initial state
let startTime;

// Event Listeners
function setupEventListeners() {
    startStopBtn.addEventListener('click', toggleRunning);
    resetBtn.addEventListener('click', resetMaze);

    algorithmSelect.addEventListener('change', () => {
        algorithm = algorithmSelect.value;
        resetMaze();
    });
    
    // Set up cell size slider
    cellSizeRange.addEventListener('input', function() {
        const cellSizeValue = document.getElementById('cellSizeValue');
        cellSizeValue.textContent = `${this.value}px`;
        cellSize = parseInt(this.value);
        initCanvas();
        resetMaze();
    });
    
    // Set up maze dimension inputs
    function updateMazeDimensions() {
        const newWidth = parseInt(mazeWidthInput.value);
        const newHeight = parseInt(mazeHeightInput.value);
        
        if (newWidth >= 5 && newWidth <= 50 && newHeight >= 5 && newHeight <= 50) {
            mazeWidth = newWidth;
            mazeHeight = newHeight;
            initCanvas();
            resetMaze();
        }
    }
    
    mazeWidthInput.addEventListener('change', updateMazeDimensions);
    mazeHeightInput.addEventListener('change', updateMazeDimensions);
    
    // Set up speed buttons for generation
    const genSpeedBtns = document.querySelectorAll('.speed-btn:not(.solve-speed)');
    genSpeedBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            genSpeedBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            speed = speeds[this.dataset.speed];
        });
    });
    
    // Set up speed buttons for solving
    const solveSpeedBtns = document.querySelectorAll('.solve-speed');
    solveSpeedBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            solveSpeedBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            solverSpeed = speeds[this.dataset.speed];
        });
    });
}

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initCanvas();
    resetMaze();
});

// Initialize immediately to ensure canvas is drawn right away
initCanvas();
resetMaze();