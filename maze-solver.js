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

// Additional colors for solver visualization
colors.openSet = '#e07a5f';      // Warm coral for open set
colors.closedSet = '#3d405b';    // Charcoal navy for closed set
colors.solution = '#ffd166';     // Bright yellow for the solution path

// Node for pathfinding
class Node {
    constructor(x, y, parent = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        
        // A* scores
        this.g = 0; // Cost from start to current node
        this.h = 0; // Heuristic (estimated cost from current to goal)
        this.f = 0; // Total cost (g + h)
    }
    
    // Get position as string for comparison
    toString() {
        return `${this.x},${this.y}`;
    }
}

// Initialize solve button and algorithm selector
function initSolver() {
    console.log("Initializing solver...");
    
    // Get correct UI elements from the DOM
    solveBtn = document.getElementById('solveBtn');
    algorithmSolverSelect = document.getElementById('algorithmSolverSelect');
    solutionLengthText = document.getElementById('solutionLength');
    
    // Make sure the solve button exists and add event listener
    if (solveBtn) {
        solveBtn.addEventListener('click', toggleSolving);
        solveBtn.disabled = !mazeCompleted;
        console.log("Solve button initialized:", solveBtn);
    } else {
        console.error("Solve button not found!");
    }
    
    // Make sure algorithm selector exists and add event listener
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
        
        // Calculate g score (path cost)
        const tentativeG = current.g + 1; // Cost of 1 to move to adjacent cell
        
        // Check if node is already in open set
        const openNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
        
        if (!openNode) {
            // New node, add to open set
            neighbor.g = tentativeG;
            neighbor.f = neighbor.g; // For Dijkstra, f = g (no heuristic)
            openSet.push(neighbor);
        } else if (tentativeG < openNode.g) {
            // Better path found to existing node
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
    }
    
    return result;
}

// Enhanced draw grid function to include solver visualization
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