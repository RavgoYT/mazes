// Maze-solver.js - Pathfinding algorithms for maze solving

// Additional UI elements
solveBtn = document.getElementById('solveBtn');
let algorithmSolverSelect = document.getElementById('algorithmSolverSelect');
let solutionLengthText = document.getElementById('solutionLength');

// Solver parameters and state
let isSolving = false;
let solverCompleted = false;
let openSet = [];
let closedSet = [];
let solutionPath = [];
solverSpeed = speeds.medium;
let solverAlgorithm = 'astar';
let lastSolverFrameTime = 0;
let nodesVisited = 0;
let processingNodesRate = 0;
let solverProcessingCounter = 0;
let lastSolverRateUpdate = 0;

// colors for visualization
colors.openSet = '#e07a5f';      // 
colors.closedSet = '#3d405b';    // 
colors.solution = '#ffd166';     // 

// Node for pathfinding
class Node {
    constructor(x, y, parent = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        
        // A* scores ignore those comments
        this.g = 0; // Cost from start to current node
        this.h = 0; // Heuristic (estimated cost from current to goal)
        this.f = 0; // Total cost (g + h)
    }
    
    toString() {
        return `${this.x},${this.y}`;
    }
}

// Initz solve button and algorithm selector
function initSolver() {
    console.log("Initializing solver...");
    
    // Get correct UI elements fromDOM
    solveBtn = document.getElementById('solveBtn');
    algorithmSolverSelect = document.getElementById('algorithmSolverSelect');
    solutionLengthText = document.getElementById('solutionLength');
    
    if (solveBtn) {
        solveBtn.addEventListener('click', toggleSolving);
        solveBtn.disabled = !mazeCompleted;
        console.log("Solve button initialized:", solveBtn);
    } else {
        console.error("Solve button not found!");
    }
    
    if (algorithmSolverSelect) {
        solverAlgorithm = algorithmSolverSelect.value;
        algorithmSolverSelect.addEventListener('change', () => {
            solverAlgorithm = algorithmSolverSelect.value;
            resetSolver();
        });
    }
    
    // Set initial state
    resetSolver();
}

// Reset the solver
function resetSolver() {
    if (isSolving && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    isSolving = false;
    solverCompleted = false;
    openSet = [];
    closedSet = [];
    solutionPath = [];
    nodesVisited = 0;
    processingNodesRate = 0;
    solverProcessingCounter = 0;
    
    // Redraw the grid to clear solution visualization
    drawGrid();
    
    if (solveBtn) {
        solveBtn.textContent = 'Solve Maze';
        solveBtn.disabled = !mazeCompleted;
    }
    
    if (solutionLengthText) {
        solutionLengthText.textContent = '0';
    }
}

// Calculate heuristic (Manhattan distance) for A*
function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Get valid neighbor cells that have no walls between them
function getAccessibleNeighbors(node) {
    const { x, y } = node;
    const cell = grid[y][x];
    const neighbors = [];
    
    // Check each direction and confirm there's no wall
    if (!cell.walls.top && y > 0) {
        neighbors.push(new Node(x, y - 1, node));
    }
    if (!cell.walls.right && x < mazeWidth - 1) {
        neighbors.push(new Node(x + 1, y, node));
    }
    if (!cell.walls.bottom && y < mazeHeight - 1) {
        neighbors.push(new Node(x, y + 1, node));
    }
    if (!cell.walls.left && x > 0) {
        neighbors.push(new Node(x - 1, y, node));
    }
    
    return neighbors;
}

// Initialize the A* algorithm
function initAStarSolver() {
    openSet = [];
    closedSet = [];
    solutionPath = [];
    nodesVisited = 0;
    
    // Create start node
    const startNode = new Node(entranceCell.x, entranceCell.y);
    startNode.g = 0;
    startNode.h = heuristic(entranceCell.x, entranceCell.y, exitCell.x, exitCell.y);
    startNode.f = startNode.g + startNode.h;
    
    // Add start to open set
    openSet.push(startNode);
}

// Initialize Dijkstra's algorithm (A* with no heuristic)
function initDijkstraSolver() {
    initAStarSolver(); // Same initialization, but heuristic will be ignored
}

// Initialize Greedy Best-First Search (only heuristic, no path cost)
function initGreedySolver() {
    initAStarSolver(); // Same initialization, but will ignore g-cost
}

// One step of A* algorithm
function astarStep() {
    if (openSet.length === 0) return false;
    
    // Find node with lowest f score
    let lowestIndex = 0;
    for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
            lowestIndex = i;
        }
    }
    
    const current = openSet[lowestIndex];
    
    // Check if reached goal
    if (current.x === exitCell.x && current.y === exitCell.y) {

        let temp = current;
        solutionPath = [];
        while (temp) {
            solutionPath.push({ x: temp.x, y: temp.y });
            temp = temp.parent;
        }
        solutionPath.reverse();
        
        if (solutionLengthText) {
            solutionLengthText.textContent = solutionPath.length;
        }
        
        return false; // Algorithm is done
    }
    
    // Move current from open to closed set
    openSet.splice(lowestIndex, 1);
    closedSet.push(current);
    nodesVisited++;
    solverProcessingCounter++;
    
    // Check neighbors
    const neighbors = getAccessibleNeighbors(current);
    for (const neighbor of neighbors) {
        // Skip if in closed set
        if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
            continue;
        }
        
        // A* specific: calculate g score
        const tentativeG = current.g + 1; // Cost of 1 to move to adjacent cell
        
        // Check if node is already in open set
        const openNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
        
        if (!openNode) {
            // New node, add to open set
            neighbor.g = tentativeG;
            neighbor.h = heuristic(neighbor.x, neighbor.y, exitCell.x, exitCell.y);
            neighbor.f = neighbor.g + neighbor.h;
            openSet.push(neighbor);
        } else if (tentativeG < openNode.g) {
            // Better path found to existing node
            openNode.g = tentativeG;
            openNode.parent = current;
            openNode.f = openNode.g + openNode.h;
        }
    }
    
    return true; // Algorithm continues
}

// One step of Dijkstra's algorithm
function dijkstraStep() {
    if (openSet.length === 0) return false;
    
    // Find node with lowest g score (path cost)
    let lowestIndex = 0;
    for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].g < openSet[lowestIndex].g) {
            lowestIndex = i;
        }
    }
    
    const current = openSet[lowestIndex];
    
    // Check if reached goal
    if (current.x === exitCell.x && current.y === exitCell.y) {
        // Reconstruct path
        let temp = current;
        solutionPath = [];
        while (temp) {
            solutionPath.push({ x: temp.x, y: temp.y });
            temp = temp.parent;
        }
        solutionPath.reverse();
        
        if (solutionLengthText) {
            solutionLengthText.textContent = solutionPath.length;
        }
        
        return false; // Algorithm doneee
    }
    
    // Move current from open to closed set
    openSet.splice(lowestIndex, 1);
    closedSet.push(current);
    nodesVisited++;
    solverProcessingCounter++;
    
    // Check neighbors
    const neighbors = getAccessibleNeighbors(current);
    for (const neighbor of neighbors) {
        // Skip if in closed set
        if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
            continue;
        }
        
        // Calculate g score (path cost)
        const tentativeG = current.g + 1; // Cost of 1 to move to adjacent cell
        
        // Check if node is already in open set
        const openNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
        
        if (!openNode) {
            // New node, add to open set
            neighbor.g = tentativeG;
            neighbor.f = neighbor.g; // f = g (
            openSet.push(neighbor);
        } else if (tentativeG < openNode.g) {
            // Better path found?
            openNode.g = tentativeG;
            openNode.parent = current;
            openNode.f = openNode.g;
        }
    }
    
    return true; // Algorithm continues
}

// One step of Greedy Best-First Search
function greedyStep() {
    if (openSet.length === 0) return false;
    
    // Find node with lowest h score (heuristic only)
    let lowestIndex = 0;
    for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].h < openSet[lowestIndex].h) {
            lowestIndex = i;
        }
    }
    
    const current = openSet[lowestIndex];
    
    // Check if reached goal
    if (current.x === exitCell.x && current.y === exitCell.y) {
        // Reconstruct path
        let temp = current;
        solutionPath = [];
        while (temp) {
            solutionPath.push({ x: temp.x, y: temp.y });
            temp = temp.parent;
        }
        solutionPath.reverse();
        
        if (solutionLengthText) {
            solutionLengthText.textContent = solutionPath.length;
        }
        
        return false; // Algorithm is done
    }
    
    // Move current from open to closed set
    openSet.splice(lowestIndex, 1);
    closedSet.push(current);
    nodesVisited++;
    solverProcessingCounter++;
    
    // Check neighbors
    const neighbors = getAccessibleNeighbors(current);
    for (const neighbor of neighbors) {
        // Skip if in closed set
        if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
            continue;
        }
        
        // Check if node is already in open set
        const openNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
        
        if (!openNode) {
            // New node, add to open set
            neighbor.h = heuristic(neighbor.x, neighbor.y, exitCell.x, exitCell.y);
            neighbor.f = neighbor.h; // For Greedy, f = h (only heuristic matters)
            openSet.push(neighbor);
        }
    }
    
    return true; // Algorithm continues
}

// Dead End Filling algorithm state
let deadEnds = [];

// Initialize Dead End Filling algorithm
function initDeadEndFilling() {
    deadEnds = [];
    solutionPath = [];
    
    // Find all dead ends
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            // Skip entrance and exit
            if ((x === entranceCell.x && y === entranceCell.y) || 
                (x === exitCell.x && y === exitCell.y)) {
                continue;
            }
            
            const cell = grid[y][x];
            const wallCount = [cell.walls.top, cell.walls.right, cell.walls.bottom, cell.walls.left]
                .filter(Boolean).length;
            
            // If the cell has three walls, it's a dead end
            if (wallCount === 3) {
                deadEnds.push({ x, y });
            }
        }
    }
    
    // Mark entrance and exit as visited
    openSet.push({ x: entranceCell.x, y: entranceCell.y });
    closedSet.push({ x: exitCell.x, y: exitCell.y });
}

function deadEndFillingStep() {
    if (deadEnds.length === 0) {
        findSolutionPath(); // Once all dead ends are filled, solve
        return false;
    }

    const { x, y } = deadEnds.pop();
    const cell = grid[y][x];

    // Cnt open directions
    const openDirs = [];
    if (!cell.walls.top) openDirs.push({ x, y: y - 1, dir: 'top', opp: 'bottom' });
    if (!cell.walls.right) openDirs.push({ x: x + 1, y, dir: 'right', opp: 'left' });
    if (!cell.walls.bottom) openDirs.push({ x, y: y + 1, dir: 'bottom', opp: 'top' });
    if (!cell.walls.left) openDirs.push({ x: x - 1, y, dir: 'left', opp: 'right' });

    if (openDirs.length !== 1) {
        // not a dead end anymore! skip!
        return true;
    }

    const next = openDirs[0];
    const nextCell = grid[next.y][next.x];

    // Skip entrance/exit
    if ((next.x === entranceCell.x && next.y === entranceCell.y) ||
        (next.x === exitCell.x && next.y === exitCell.y)) {
        return true;
    }

    // Fill the passage (block it)
    cell.walls[next.dir] = true;
    nextCell.walls[next.opp] = true;

    // Count open passages in the neighbor now
    const neighborOpenWalls = [
        !nextCell.walls.top,
        !nextCell.walls.right,
        !nextCell.walls.bottom,
        !nextCell.walls.left,
    ].filter(Boolean).length;

    if (neighborOpenWalls === 1) {
        // Neighbor is now a dead end
        deadEnds.push({ x: next.x, y: next.y });
    }

    closedSet.push({ x, y });
    nodesVisited++;
    solverProcessingCounter++;

    return true;
}


// Flood Fill algorithm state
let distances = [];
let maxDistance = 0;

// Initialize Flood Fill algorithm
function initFloodFill() {
    // Create a 2D array to store distances from the entrance
    distances = Array(mazeHeight).fill().map(() => Array(mazeWidth).fill(Infinity));
    
    // Set entrance distance to 0
    distances[entranceCell.y][entranceCell.x] = 0;
    
    // Start BFS from entrance
    openSet = [{ x: entranceCell.x, y: entranceCell.y }];
    closedSet = [];
    maxDistance = 0;
}

// Flood Fill algorithm step
function floodFillStep() {
    if (openSet.length === 0) {
        // BFS completed, construct the path
        constructFloodFillPath();
        return false;
    }
    
    // Get next cell from the queue
    const current = openSet.shift();
    const { x, y } = current;
    
    // Mark as visited
    closedSet.push(current);
    nodesVisited++;
    solverProcessingCounter++;
    
    // Get current distance
    const distance = distances[y][x];
    
    // Update max distance
    if (distance > maxDistance) {
        maxDistance = distance;
    }
    
    // Check each direction
    const cell = grid[y][x];
    
    //  top
    if (!cell.walls.top && y > 0 && distances[y-1][x] === Infinity) {
        distances[y-1][x] = distance + 1;
        openSet.push({ x, y: y-1 });
    }
    
    // check right
    if (!cell.walls.right && x < mazeWidth-1 && distances[y][x+1] === Infinity) {
        distances[y][x+1] = distance + 1;
        openSet.push({ x: x+1, y });
    }
    
    // Check bottom
    if (!cell.walls.bottom && y < mazeHeight-1 && distances[y+1][x] === Infinity) {
        distances[y+1][x] = distance + 1;
        openSet.push({ x, y: y+1 });
    }
    
    // Checkleft
    if (!cell.walls.left && x > 0 && distances[y][x-1] === Infinity) {
        distances[y][x-1] = distance + 1;
        openSet.push({ x: x-1, y });
    }
    
    return true;
}

// Construct path using the distance map
function constructFloodFillPath() {
    // Start from the exit
    let current = { x: exitCell.x, y: exitCell.y };
    solutionPath = [current];
    
    // If exit is unreachable, return
    if (distances[current.y][current.x] === Infinity) {
        return;
    }
    
    // Follow the path of decreasing distances back to the entrance
    while (!(current.x === entranceCell.x && current.y === entranceCell.y)) {
        const { x, y } = current;
        const currentDistance = distances[y][x];
        const cell = grid[y][x];
        
        let bestNeighbor = null;
        let bestDistance = Infinity;
        
        // Check all accessible neighbors
        if (!cell.walls.top && y > 0) {
            const dist = distances[y-1][x];
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNeighbor = { x, y: y-1 };
            }
        }
        
        if (!cell.walls.right && x < mazeWidth-1) {
            const dist = distances[y][x+1];
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNeighbor = { x: x+1, y };
            }
        }
        
        if (!cell.walls.bottom && y < mazeHeight-1) {
            const dist = distances[y+1][x];
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNeighbor = { x, y: y+1 };
            }
        }
        
        if (!cell.walls.left && x > 0) {
            const dist = distances[y][x-1];
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNeighbor = { x: x-1, y };
            }
        }
        
        // Move to the best neighbor
        if (bestNeighbor) {
            current = bestNeighbor;
            solutionPath.unshift(current);
        } else {
            break; // No path found
        }
    }
    
    if (solutionLengthText) {
        solutionLengthText.textContent = solutionPath.length;
    }
}

// Find solution path after filling dead ends
function findSolutionPath() {
    // filled dead ends carve path out
    const solvedGrid = Array.from({ length: mazeHeight }, () => Array(mazeWidth).fill(false));

    // Mark all cells in the closed set as filled
    for (const cell of closedSet) {
        if (cell && isInBounds(cell.x, cell.y)) {
            solvedGrid[cell.y][cell.x] = true;
        }
    }

    // Mark entrance and exit as walkable
    if (isInBounds(entranceCell.x, entranceCell.y)) {
        solvedGrid[entranceCell.y][entranceCell.x] = false;
    }
    if (isInBounds(exitCell.x, exitCell.y)) {
        solvedGrid[exitCell.y][exitCell.x] = false;
    }

    // Use BFS to find the path
    const queue = [{
        x: entranceCell.x,
        y: entranceCell.y,
        path: []
    }];
    const visited = new Set();
    visited.add(`${entranceCell.x},${entranceCell.y}`);

    while (queue.length > 0) {
        const { x, y, path } = queue.shift();

        if (x === exitCell.x && y === exitCell.y) {
            solutionPath = [...path, { x, y }];
            if (solutionLengthText) {
                solutionLengthText.textContent = solutionPath.length;
            }
            return;
        }

        if (!isInBounds(x, y)) continue;

        const cell = grid[y][x];
        if (!cell || !cell.walls) continue;

        const directions = [
            { dx: 0, dy: -1, wall: 'top' },
            { dx: 1, dy: 0, wall: 'right' },
            { dx: 0, dy: 1, wall: 'bottom' },
            { dx: -1, dy: 0, wall: 'left' }
        ];

        for (const { dx, dy, wall } of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;

            if (
                !cell.walls[wall] &&
                isInBounds(nx, ny) &&
                !solvedGrid[ny][nx] &&
                !visited.has(key)
            ) {
                queue.push({ x: nx, y: ny, path: [...path, { x, y }] });
                visited.add(key);
            }
        }
    }
}

function isInBounds(x, y) {
    return x >= 0 && x < mazeWidth && y >= 0 && y < mazeHeight;
}


// Perform one algorithm step
function solverStep() {
    let result = false;
    
    switch (solverAlgorithm) {
        case 'astar':
            result = astarStep();
            break;
        case 'dijkstra':
            result = dijkstraStep();
            break;
        case 'greedy':
            result = greedyStep();
            break;
        case 'def':
            result = deadEndFillingStep();
            break;
        case 'floodfill':
            result = floodFillStep();
            break;
    }
    
    return result;
}

// draw grid function to include solver visualization
function drawGridWithSolver() {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw all cells
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            const cell = grid[y][x];
            
            // Determine cell color based on its state
            if (x === entranceCell.x && y === entranceCell.y) {
                ctx.fillStyle = colors.entrance;
            } else if (x === exitCell.x && y === exitCell.y) {
                ctx.fillStyle = colors.exit;
            } else {
                // Check if cell is in solution path
                const inSolution = solutionPath.some(node => node.x === x && node.y === y);
                
                if (inSolution) {
                    ctx.fillStyle = colors.solution;
                }
                // Check if cell is in open set
                else if (openSet.some(node => node.x === x && node.y === y)) {
                    ctx.fillStyle = colors.openSet;
                }
                // Check if cell is in closed set
                else if (closedSet.some(node => node.x === x && node.y === y)) {
                    ctx.fillStyle = colors.closedSet;
                }
                // Otherwise use default cell coloring
                else if (cell.visited) {
                    ctx.fillStyle = colors.visited;
                } else if (cell.inFrontier) {
                    ctx.fillStyle = colors.frontier;
                } else {
                    ctx.fillStyle = colors.background;
                }
            }
            
            // Fill cell
            ctx.fillRect(
                x * cellSize + wallThickness/2, 
                y * cellSize + wallThickness/2, 
                cellSize, 
                cellSize
            );
            
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

// Animation loop for solving
function animateSolver(timestamp) {
    if (!isSolving) return;
    
    // Calculate time difference
    const deltaTime = timestamp - lastSolverFrameTime;
    
    // Process algorithm steps with delay
    if (deltaTime >= solverSpeed.delay) {
        let continueSolving = true;
        
        // Process multiple cells per frame based on speed setting
        for (let i = 0; i < solverSpeed.cellsPerFrame && continueSolving; i++) {
            continueSolving = solverStep();
            
            if (!continueSolving && !solverCompleted) {
                solverCompleted = true;
                isSolving = false;
                if (solveBtn) {
                    solveBtn.textContent = 'Solution Found';
                    solveBtn.disabled = true;
                }
            }
        }
        
        // Update stats UI
        if (cellsProcessedText) {
            cellsProcessedText.textContent = nodesVisited;
        }
        
        // Draw the grid with solution visualization
        drawGridWithSolver();
        
        lastSolverFrameTime = timestamp;
    }
    
    // Calculate processing speed every second
    if (timestamp - lastSolverRateUpdate > 1000) {
        processingNodesRate = solverProcessingCounter;
        solverProcessingCounter = 0;
        if (computationSpeedText) {
            computationSpeedText.textContent = processingNodesRate;
        }
        lastSolverRateUpdate = timestamp;
    }
    
    // Continue animation
    animationFrameId = requestAnimationFrame(animateSolver);
}

// Start/stop the solver
function toggleSolving() {
    console.log("Toggle solving called, current state:", isSolving);
    
    if (isSolving) {
        isSolving = false;
        solveBtn.textContent = 'Continue Solving';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else {
        if (openSet.length === 0) {
            // Initialize based on selected algorithm
            console.log("Initializing solver algorithm:", solverAlgorithm);
            switch (solverAlgorithm) {
                case 'astar':
                    initAStarSolver();
                    break;
                case 'dijkstra':
                    initDijkstraSolver();
                    break;
                case 'greedy':
                    initGreedySolver();
                    break;
                case 'def':
                    initDeadEndFilling();
                    break;
                case 'floodfill':
                    initFloodFill();
                    break;
            }
        }
        
        isSolving = true;
        solveBtn.textContent = 'Pause';
        lastSolverFrameTime = performance.now();
        lastSolverRateUpdate = lastSolverFrameTime;
        animationFrameId = requestAnimationFrame(animateSolver);
    }
}

// Override drawGrid function to include solver visualization
const originalDrawGrid = drawGrid;
drawGrid = function() {
    if (isSolving || solverCompleted) {
        drawGridWithSolver();
    } else {
        originalDrawGrid();
    }
};

// Connect solver reset with maze reset
const originalResetMaze = resetMaze;
resetMaze = function() {
    originalResetMaze();
    resetSolver();
};

// Call initSolver when DOM is loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initSolver, 100); // Small delay to ensure all elements are available
} else {
    document.addEventListener('DOMContentLoaded', initSolver);
}

// If not already initialized, do it now
initSolver();