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
    exit: '#fd8a5e',
    wilsonPath: '#3FBF6A',
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
                inFrontier: false,
                inPath: false,
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
        case 'hak': return "Hunt and Kill Algorithm";
        case 'ellers': return "Eller's Algorithm";
        case 'kruskals': return "Randomized Kruskal's Algorithm";
        case 'wilsons': return "Wilson's Algorithm";
        case 'btree': return "The Binary Tree Algorithm";
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
            } else if (cell.inPath) {
                ctx.fillStyle = colors.wilsonPath;  // Add this color to your colors object
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
    
    switch (algorithm) {
        case 'dfs':
            // Start at entrance
            const startX = entranceCell.x;
            const startY = entranceCell.y;
            grid[startY][startX].visited = true;
            visitedCells++;
            frontier.push({ x: startX, y: startY });  // Fixed y coordinate from startX to startY
            break;
        case 'ellers':
            initEller();
            break;
        case 'kruskals':
            initKruskal();
            break;
        case 'wilsons':
            initWilson();
            break;
        case 'btree':
            initBinaryTree();
            break;
        case 'hak':
            // Start at entrance
            grid[entranceCell.y][entranceCell.x].visited = true;
            visitedCells++;
            currentCell = { x: entranceCell.x, y: entranceCell.y };
            break;
        default:  // Default to Prim's
            visitCell(entranceCell.x, entranceCell.y);
            break;
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

// Hunt and Kill algorithm state
let huntRow = 0;

// Hunt and Kill algorithm step
function huntAndKillStep() {
    // If we have a current cell, try to carve a path from it
    if (currentCell) {
        const { x, y } = currentCell;
        const cell = grid[y][x];
        
        // Get unvisited neighbors
        const neighbors = getNeighbors(x, y).filter(n => {
            return !grid[n.y][n.x].visited;
        });
        
        if (neighbors.length > 0) {
            // Choose a random unvisited neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            const nextCell = grid[next.y][next.x];
            
            // Remove walls between cells
            cell.walls[next.direction] = false;
            nextCell.walls[next.opposite] = false;
            
            // Mark the new cell as visited
            nextCell.visited = true;
            visitedCells++;
            cellsProcessed++;
            processingCounter++;
            
            // Move to the new cell
            currentCell = { x: next.x, y: next.y };
            
            return true;
        } else {
            // No unvisited neighbors, need to hunt for a new cell
            currentCell = null;
            return true;
        }
    } else {
        // Hunt mode: scan for a visited cell that has unvisited neighbors
        for (let y = huntRow; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                if (grid[y][x].visited) {
                    // Check if this visited cell has unvisited neighbors
                    const neighbors = getNeighbors(x, y).filter(n => {
                        return !grid[n.y][n.x].visited;
                    });
                    
                    if (neighbors.length > 0) {
                        // Found a cell with unvisited neighbors
                        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                        const nextCell = grid[next.y][next.x];
                        
                        // Connect these cells
                        grid[y][x].walls[next.direction] = false;
                        nextCell.walls[next.opposite] = false;
                        
                        // Mark the new cell as visited
                        nextCell.visited = true;
                        visitedCells++;
                        cellsProcessed++;
                        processingCounter++;
                        
                        // Continue from this new cell
                        currentCell = { x: next.x, y: next.y };
                        huntRow = y; // Resume hunt from this row next time
                        
                        return true;
                    }
                }
            }
        }
        
        // If we've scanned the entire grid and found nothing, we're done
        huntRow = 0;
        return false;
    }
}

// Eller's algorithm state
let ellerRow = 0;
let ellerSets = [];
let nextSetId = 1;

// Initialize Eller's algorithm
function initEller() {
    ellerRow = 0;
    ellerSets = [];
    nextSetId = 1;
    
    // Initialize first row, each cell in its own set
    const firstRow = [];
    for (let x = 0; x < mazeWidth; x++) {
        firstRow.push(nextSetId++);
    }
    ellerSets.push(firstRow);
    
    // Mark entrance cell as visited
    grid[0][0].visited = true;
    visitedCells++;
}

// Eller's algorithm step - processes one row at a time
function ellerStep() {
    console.log('works')
    if (ellerRow >= mazeHeight) {
        return false; // Done
    }
    
    // Get current row set ids
    const currentSetRow = ellerSets[ellerSets.length - 1];
    
    // Step 1: Randomly connect cells horizontally in this row
    for (let x = 0; x < mazeWidth - 1; x++) {
        // Randomly decide whether to connect to the right neighbor
        if (Math.random() < 0.5 && currentSetRow[x] !== currentSetRow[x + 1]) {
            // Connect cells by removing the walls
            grid[ellerRow][x].walls.right = false;
            grid[ellerRow][x + 1].walls.left = false;
            
            // Merge sets
            const oldSetId = currentSetRow[x + 1];
            const newSetId = currentSetRow[x];
            
            // Update all cells in this row with the old set ID
            for (let i = 0; i < mazeWidth; i++) {
                if (currentSetRow[i] === oldSetId) {
                    currentSetRow[i] = newSetId;
                }
            }
            
            // Mark cells as visited
            if (!grid[ellerRow][x].visited) {
                grid[ellerRow][x].visited = true;
                visitedCells++;
            }
            if (!grid[ellerRow][x + 1].visited) {
                grid[ellerRow][x + 1].visited = true;
                visitedCells++;
            }
            
            cellsProcessed++;
            processingCounter++;
        }
    }
    
    // Last row special case
    if (ellerRow === mazeHeight - 1) {
        // For the last row, connect all cells with different set IDs
        for (let x = 0; x < mazeWidth - 1; x++) {
            if (currentSetRow[x] !== currentSetRow[x + 1]) {
                // Connect cells
                grid[ellerRow][x].walls.right = false;
                grid[ellerRow][x + 1].walls.left = false;
                
                // Merge sets
                const oldSetId = currentSetRow[x + 1];
                const newSetId = currentSetRow[x];
                
                // Update all cells with the old set ID
                for (let i = 0; i < mazeWidth; i++) {
                    if (currentSetRow[i] === oldSetId) {
                        currentSetRow[i] = newSetId;
                    }
                }
                
                // Mark cells as visited
                if (!grid[ellerRow][x].visited) {
                    grid[ellerRow][x].visited = true;
                    visitedCells++;
                }
                if (!grid[ellerRow][x + 1].visited) {
                    grid[ellerRow][x + 1].visited = true;
                    visitedCells++;
                }
                
                cellsProcessed++;
                processingCounter++;
            }
        }
        
        ellerRow++;
        return true;
    }
    
    // Step 2: For each set, randomly create at least one vertical connection
    // to the next row
    const nextSetRow = new Array(mazeWidth).fill(0);
    
    // Find all unique set IDs in current row
    const uniqueSets = [...new Set(currentSetRow)];
    
    // For each set, create at least one vertical connection
    for (const setId of uniqueSets) {
        // Get all cells with this set ID
        const setCells = [];
        for (let x = 0; x < mazeWidth; x++) {
            if (currentSetRow[x] === setId) {
                setCells.push(x);
            }
        }
        
        // Choose at least one cell to connect vertically
        const minConnections = Math.min(1, setCells.length);
        let connectionsCount = 0;
        
        for (const x of setCells) {
            // Choose to connect randomly, but ensure at least one connection
            if (connectionsCount < minConnections || Math.random() < 0.3) {
                // Connect this cell to the next row
                grid[ellerRow][x].walls.bottom = false;
                grid[ellerRow + 1][x].walls.top = false;
                
                // Keep the set ID for this column
                nextSetRow[x] = setId;
                
                // Mark cells as visited
                if (!grid[ellerRow][x].visited) {
                    grid[ellerRow][x].visited = true;
                    visitedCells++;
                }
                if (!grid[ellerRow + 1][x].visited) {
                    grid[ellerRow + 1][x].visited = true;
                    visitedCells++;
                }
                
                connectionsCount++;
                cellsProcessed++;
                processingCounter++;
            }
        }
    }
    
    // Fill in new sets for unconnected cells in next row
    for (let x = 0; x < mazeWidth; x++) {
        if (nextSetRow[x] === 0) {
            nextSetRow[x] = nextSetId++;
        }
    }
    
    // Add the next row
    ellerSets.push(nextSetRow);
    
    // Move to the next row
    ellerRow++;
    
    return true;
}

// Kruskal's algorithm state
let edges = [];
let kruskalSets = [];

// Initialize Kruskal's algorithm
function initKruskal() {
    edges = [];
    kruskalSets = [];
    
    // Create a list of all walls/edges
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            if (x < mazeWidth - 1) {
                edges.push({
                    x1: x, y1: y,
                    x2: x + 1, y2: y,
                    dir1: 'right', dir2: 'left'
                });
            }
            if (y < mazeHeight - 1) {
                edges.push({
                    x1: x, y1: y,
                    x2: x, y2: y + 1,
                    dir1: 'bottom', dir2: 'top'
                });
            }
        }
    }
    
    // Shuffle the edges randomly
    for (let i = edges.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    
    // Create a set for each cell
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            kruskalSets.push({ x, y });
        }
    }
    
    // Mark the entrance cell as visited
    grid[entranceCell.y][entranceCell.x].visited = true;
    visitedCells++;
}

// Find the set for a cell
function findSet(x, y) {
    for (let i = 0; i < kruskalSets.length; i++) {
        if (kruskalSets[i].x === x && kruskalSets[i].y === y) {
            return i;
        }
    }
    return -1;
}

// Kruskal's algorithm step
function kruskalStep() {
    if (edges.length === 0) {
        return false; // Done
    }
    
    // Get the next edge from the shuffled list
    const edge = edges.pop();
    const { x1, y1, x2, y2, dir1, dir2 } = edge;
    
    // Find the sets of the two cells
    const set1 = findSet(x1, y1);
    const set2 = findSet(x2, y2);
    
    // If cells are in different sets, remove the wall between them
    if (set1 !== set2 && set1 !== -1 && set2 !== -1) {
        // Remove wall between cells
        grid[y1][x1].walls[dir1] = false;
        grid[y2][x2].walls[dir2] = false;
        
        // Mark cells as visited
        if (!grid[y1][x1].visited) {
            grid[y1][x1].visited = true;
            visitedCells++;
        }
        if (!grid[y2][x2].visited) {
            grid[y2][x2].visited = true;
            visitedCells++;
        }
        
        // Union the sets (merge set2 into set1)
        const toMerge = kruskalSets[set2];
        kruskalSets.splice(set2, 1);
        
        // Update the currentCell to visualize progress
        currentCell = { x: x2, y: y2 };
        
        cellsProcessed++;
        processingCounter++;
    }
    
    return true;
}

// Wilson's algorithm state
let unvisitedCells = [];
let currentPath = [];
let isGeneratingPath = false;

// Initialize Wilson's algorithm
function initWilson() {
    unvisitedCells = [];
    currentPath = [];
    isGeneratingPath = false;
    
    // Add all cells to unvisited list, except the starting cell
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            if (x !== entranceCell.x || y !== entranceCell.y) {
                unvisitedCells.push({ x, y });
            }
        }
    }
    
    // Mark starting cell as visited
    grid[entranceCell.y][entranceCell.x].visited = true;
    visitedCells++;
    
    // Shuffle unvisited cells
    for (let i = unvisitedCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unvisitedCells[i], unvisitedCells[j]] = [unvisitedCells[j], unvisitedCells[i]];
    }
}

// Get a random direction from a cell
function getRandomDirection(x, y) {
    const directions = [];
    
    if (y > 0) directions.push({ x, y: y - 1, direction: 'top', opposite: 'bottom' });
    if (x < mazeWidth - 1) directions.push({ x: x + 1, y, direction: 'right', opposite: 'left' });
    if (y < mazeHeight - 1) directions.push({ x, y: y + 1, direction: 'bottom', opposite: 'top' });
    if (x > 0) directions.push({ x: x - 1, y, direction: 'left', opposite: 'right' });
    
    return directions[Math.floor(Math.random() * directions.length)];
}

// Find path index for a cell
function findInPath(x, y) {
    for (let i = 0; i < currentPath.length; i++) {
        if (currentPath[i].x === x && currentPath[i].y === y) {
            return i;
        }
    }
    return -1;
}

// Wilson's algorithm step
// Wilson's algorithm step
function wilsonStep() {
    if (unvisitedCells.length === 0) {
        return false; // Done
    }
    
    if (!isGeneratingPath) {
        // Start a new path from a random unvisited cell
        const randomCell = unvisitedCells[0];
        currentPath = [{ x: randomCell.x, y: randomCell.y }];
        isGeneratingPath = true;
        
        // Set as current cell for visualization
        currentCell = { x: randomCell.x, y: randomCell.y };
        
        // Mark cells in the path with a special state
        grid[randomCell.y][randomCell.x].inPath = true;
    } else {
        // Continue random walk
        const lastCell = currentPath[currentPath.length - 1];
        const nextDirection = getRandomDirection(lastCell.x, lastCell.y);
        
        // Set as current cell for visualization
        currentCell = { x: nextDirection.x, y: nextDirection.y };
        
        // Check if we hit our own path (loop erasing)
        const pathIndex = findInPath(nextDirection.x, nextDirection.y);
        if (pathIndex !== -1) {
            // Found a loop, erase it
            
            // First, clear the 'inPath' flag from all cells that will be erased
            for (let i = pathIndex + 1; i < currentPath.length; i++) {
                const cell = currentPath[i];
                grid[cell.y][cell.x].inPath = false;
            }
            
            currentPath = currentPath.slice(0, pathIndex + 1);
        } else if (grid[nextDirection.y][nextDirection.x].visited) {
            // Hit a visited cell, carve the path
            lastCell.direction = nextDirection.direction;
            lastCell.opposite = nextDirection.opposite;
            
            // Add the visited cell to complete the path
            currentPath.push({ 
                x: nextDirection.x, 
                y: nextDirection.y,
                direction: null,
                opposite: null
            });
            
            // Carve the path
            for (let i = 0; i < currentPath.length - 1; i++) {
                const current = currentPath[i];
                const next = currentPath[i + 1];
                
                // Remove walls between cells
                grid[current.y][current.x].walls[current.direction] = false;
                grid[next.y][next.x].walls[current.opposite] = false;
                
                // Mark cells as visited and clear path flag
                grid[current.y][current.x].inPath = false;
                
                if (!grid[current.y][current.x].visited) {
                    grid[current.y][current.x].visited = true;
                    visitedCells++;
                    
                    // Remove from unvisited list
                    unvisitedCells = unvisitedCells.filter(cell => 
                        !(cell.x === current.x && cell.y === current.y));
                }
                
                cellsProcessed++;
                processingCounter++;
            }
            
            // Reset for next path
            isGeneratingPath = false;
        } else {
            // Continue the path
            currentPath.push({
                x: nextDirection.x,
                y: nextDirection.y,
                direction: null,
                opposite: null
            });
            
            // Mark this cell as part of the current path
            grid[nextDirection.y][nextDirection.x].inPath = true;
            
            // Update the direction for the previous cell
            currentPath[currentPath.length - 2].direction = nextDirection.direction;
            currentPath[currentPath.length - 2].opposite = nextDirection.opposite;
        }
    }
    
    return true;
}

// Binary Tree algorithm state
let binaryTreeRow = 0;
let binaryTreeCol = 0;

// Initialize Binary Tree algorithm
function initBinaryTree() {
    binaryTreeRow = 0;
    binaryTreeCol = 0;

        // Randomly choose a configuration
    // 0: North-East, 1: North-West, 2: South-East, 3: South-West
    binaryTreeConfig = Math.floor(Math.random() * 4);
}

// Binary Tree algorithm step
function binaryTreeStep() {
    if (binaryTreeRow >= mazeHeight) {
        return false; // Done
    }
    
    // Get current cell
    currentCell = { x: binaryTreeCol, y: binaryTreeRow };
    const cell = grid[binaryTreeRow][binaryTreeCol];
    
    // Mark cell as visited
    if (!cell.visited) {
        cell.visited = true;
        visitedCells++;
    }
    
    // For binary tree algorithm, we only carve north or east
    // (we can also use south and west for variations)
    const possibleDirections = [];
    
    switch(binaryTreeConfig) {
        case 0: // North-East
            if (binaryTreeRow > 0) possibleDirections.push({ x: binaryTreeCol, y: binaryTreeRow - 1, direction: 'top', opposite: 'bottom' });
            if (binaryTreeCol < mazeWidth - 1) possibleDirections.push({ x: binaryTreeCol + 1, y: binaryTreeRow, direction: 'right', opposite: 'left' });
            break;
        case 1: // North-West
            if (binaryTreeRow > 0) possibleDirections.push({ x: binaryTreeCol, y: binaryTreeRow - 1, direction: 'top', opposite: 'bottom' });
            if (binaryTreeCol > 0) possibleDirections.push({ x: binaryTreeCol - 1, y: binaryTreeRow, direction: 'left', opposite: 'right' });
            break;
        case 2: // South-East
            if (binaryTreeRow < mazeHeight - 1) possibleDirections.push({ x: binaryTreeCol, y: binaryTreeRow + 1, direction: 'bottom', opposite: 'top' });
            if (binaryTreeCol < mazeWidth - 1) possibleDirections.push({ x: binaryTreeCol + 1, y: binaryTreeRow, direction: 'right', opposite: 'left' });
            break;
        case 3: // South-West
            if (binaryTreeRow < mazeHeight - 1) possibleDirections.push({ x: binaryTreeCol, y: binaryTreeRow + 1, direction: 'bottom', opposite: 'top' });
            if (binaryTreeCol > 0) possibleDirections.push({ x: binaryTreeCol - 1, y: binaryTreeRow, direction: 'left', opposite: 'right' });
            break;
    }
    
    // If we have possible directions, randomly choose one
    if (possibleDirections.length > 0) {
        const chosen = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        
        // Remove wall between current cell and chosen cell
        cell.walls[chosen.direction] = false;
        grid[chosen.y][chosen.x].walls[chosen.opposite] = false;
        
        // Mark the chosen cell as visited
        if (!grid[chosen.y][chosen.x].visited) {
            grid[chosen.y][chosen.x].visited = true;
            visitedCells++;
        }
        
        cellsProcessed++;
        processingCounter++;
    }
    
    // Move to the next cell
    binaryTreeCol++;
    if (binaryTreeCol >= mazeWidth) {
        binaryTreeCol = 0;
        binaryTreeRow++;
    }
    
    return true;
}

// Perform one algorithm step
function algorithmStep() {
    let result = false;
    console.log("Stepping algorithm:", algorithm);
    
    switch (algorithm) {
        case 'prim':
            result = primStep();
            break;
        case 'dfs':
            result = dfsStep();
            break;
        case 'hak':
            result = huntAndKillStep();
            break;
        case 'ellers':
            console.log("Calling ellerStep");
            result = ellerStep();
            break;
        case 'kruskals':
            console.log("Calling kruskalStep");
            result = kruskalStep();
            break;
        case 'wilsons':
            console.log("Calling wilsonStep");
            result = wilsonStep();
            break;
        case 'btree':
            result = binaryTreeStep();
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
        console.log("Starting algorithm:", algorithm);
        if (visitedCells === 0) {
            console.log("Calling initAlgorithm for:", algorithm);
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
        console.log("Algorithm changed to:", algorithm);
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