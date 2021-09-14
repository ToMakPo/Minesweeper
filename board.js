const board = $('#board')
const rowsInput = $('#rows-input')
const colsInput = $('#columns-input')
const bombsInput = $('#bombs-input')
const counter = $('#counter')
const startButton = $('#start-button')
const messageBox = $('<div id="message-box">')
    .append($('<div>').append($('<h1>'), $('<span>'), $('<b>✖</b>')))

let grid = []
let cells = []
let bombs = []
let flags = []
let rowCount = rowsInput.val() * 1
let colCount = colsInput.val() * 1
let bombCount = bombsInput.val() * 1
let remaining = bombCount

let gameState = false
let activeGame = false

setMaxBombs()

const icons = {
    flag: '🚩',
    bomb: '💣'
}

const longClick = 250
let clickTimer = null
let clicked = false
let cb = null
function startClick(callback, cell) {
    clicked = true
    cb = callback
    clickTimer = setTimeout(() => {
        clicked = false
        callback()
    }, longClick)
}
function endClick() {
    clicked = false
    cb = null
    clearTimeout(clickTimer)
}

const Cell = function(rowNumber, colNumber) {
    this.rowNumber = rowNumber
    this.colNumber = colNumber
    this.isBomb = false
    this.neighbours = []
    this.count = 0
    this.displayed = false
    this.flagged = false
    this.exploded = false

    this.element = $(`<div id='cell-r${rowNumber}-c${colNumber}' class='cell'>`)
        .append($('<span>'))
    this.element
            .on('mousedown', () => { startClick(() => this.flag(), this) })
            .on('mouseup', () => {
                if (clicked) {
                    endClick()
                    this.select()
                }
            })
            .on('mouseout', () => { if (clicked) endClick() })
            .on('touchstart', () => { startClick(() => this.flag(), this) })
            .on('touchend', () => {
                if (clicked) {
                    endClick()
                    this.select()
                }
            })
}

Cell.prototype.checkNeighbours = function() {
    let displayed = 0
    let flagged = 0

    for (let n of this.neighbours) {
        if (n.displayed) displayed++
        if (n.flagged) flagged++
    }
}

Cell.prototype.select = function() {
    if (!gameState || this.flagged || this.displayed) return
    this.displayed = true

    if (this.isBomb) {
        console.info('BOOM!');
        endGame(this)
    } else {
        this.element.attr('data-selected', true)

        if (!activeGame) {
            placeBombs(this)
            activeGame = true
        }
    
        if (this.count == 0) {
            this.setText('')
            for (let n of this.neighbours) {
                n.select()
            }
        } else {
            this.element.attr('data-selected', true)
            this.setText(this.count)
        }

        checkIfWon()
    }
}

Cell.prototype.flag = function() {
    if (!gameState || !activeGame || this.displayed) return

    this.flagged = !this.flagged

    if (this.flagged) {
        if (remaining > 0) {
            this.setText(icons.flag)
            this.element.attr('data-flagged', true)
            flags.push(this)
        } else {
            this.flagged = false
        }
    } else {
        this.setText('')
        this.element.attr('data-flagged', false)
        flags.splice(flags.indexOf(this), 1)
    }

    updateCounter()

    checkIfWon()
}

Cell.prototype.setText = function(text) {
    this.element.children('span').text(text)
}

Cell.prototype.checkProbability = function() {
    if (!this.displayed || this.flagged || (this.displayed && this.count == 0)) this.probability = 0
    else {
        let displayed = 0
        let flagged = 0

        for (let n of this.neighbours) {
            if (n.displayed) displayed++
            if (n.flagged) flagged++
        }

        const unchecked = this.neighbours.length - (displayed + flagged)

        this.probability = (this.count - flagged) / unchecked
    }
}

function checkSizeInput(event) {
    const value = event.target.value * 1
    const min = event.target.min * 1
    const max = event.target.max * 1

    if (value < min) event.target.value = min
    if (value > max) event.target.value = max

    setMaxBombs()
}

function checkIfWon() {
    won = false

    let allFlags = true
    let allSelected = true

    for (let cell of cells) {
        if ((cell.flagged && !cell.isBomb)
        || (!cell.flagged && cell.isBomb)) {
            allFlags = false
        }
        if (!cell.displayed && !cell.isBomb)
            allSelected = false
        
        if (!allFlags && !allSelected) break
    }

    if (allFlags || allSelected) {
        winGame()
        return true
    } else {
        return false
    }
}

function updateCounter() {
    remaining = bombCount - flags.length
    counter.text(remaining)
}

function showProbabilities() {
    for (let c of cells) {
        c.checkProbability()
    }

    for (let c of cells) {
        if (!c.displayed && !c.flagged) {
            let probability = 0

            for (let n of c.neighbours) {
                if (n.probability > probability)
                    probability = n.probability
            }
                    
            if (probability > 0) {
                c.setText((probability * 100).toFixed(0))
            }
        }
    }
}

function setMaxBombs() {
    const maxBombs = Math.floor(rowsInput.val() * colsInput.val() * 0.25)
    bombsInput.attr('max', maxBombs)
    if (bombsInput.val() > maxBombs)
        bombsInput.val(maxBombs)
}

function displayMessage(title, message) {
    messageBox.children('div').children('h1').text(title)
    messageBox.children('div').children('span').text(message)
    messageBox.show()
}

function hideMessage() {
    messageBox.hide()
    messageBox.children('div').children('h1').text('')
    messageBox.children('div').children('span').text('')
}

function placeBombs(startingCell) {
    bombs = []

    const addBomb = () => {
        const r = Math.floor(Math.random() * rowCount)
        const c = Math.floor(Math.random() * colCount)

        const cell = grid[r][c]

        const inStartingArea = 
            r >= startingCell.rowNumber - 1 &&
            r <= startingCell.rowNumber + 1 &&
            c >= startingCell.colNumber - 1 &&
            c <= startingCell.colNumber + 1

        if (cell.isBomb || inStartingArea) {
            addBomb()
        } else {
            cell.isBomb = true
            bombs.push(cell)
        }
    }

    for (let b = 0; b < bombCount; b++) addBomb()

    for (let cell of cells) {
        cell.count = cell.isBomb * 1

        for (let n of cell.neighbours) {
            if (n.isBomb) cell.count++
        }
    }
}

function newGame() {
    console.info('New Game!');

    rowCount = rowsInput.val() * 1
    colCount = colsInput.val() * 1
    bombCount = bombsInput.val() * 1

    lastRow = rowCount - 1
    lastCol = colCount - 1

    grid = []
    cells = []
    flags = []

    updateCounter()

    const table = $('<div class="table">')
    table.append(messageBox)
    board.html(table)

    hideMessage()

    for (let r = 0; r < rowCount; r++) {
        const row = []
        const tr = $('<div class="row">')
        
        for (let c = 0; c < colCount; c++) {
            const cell = new Cell(r, c)
            row.push(cell)
            cells.push(cell)

            tr.append(cell.element)
        }

        grid.push(row)

        table.append(tr)
    }

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
            const cell = grid[r][c]
        
            const push = (r, c) => cell.neighbours.push(grid[r][c])
        
            cell.neighbours = []
        
            if (r == 0 && c == 0) {
                push(0, 1)
                push(1, 1)
                push(1, 0)
            } else
            if (r == 0 && c == lastCol) {
                push(0, c - 1)
                push(1, c - 1)
                push(1, c)
            } else
            if (r == lastRow && c == 0) {
                push(r, 1)
                push(r - 1, 1)
                push(r - 1, 0)
            } else
            if (r == lastRow && c == lastCol) {
                push(r, c - 1)
                push(r - 1, c - 1)
                push(r - 1, c)
            } else
            if (r == 0) {
                push(0, c -1)
                push(1, c - 1)
                push(1, c)
                push(1, c + 1)
                push(0, c + 1)
            } else
            if (r == lastRow) {
                push(r, c -1)
                push(r - 1, c - 1)
                push(r - 1, c)
                push(r - 1, c + 1)
                push(r, c + 1)
            } else
            if (c == 0) {
                push(r - 1, 0)
                push(r - 1, 1)
                push(r, 1)
                push(r + 1, 1)
                push(r + 1, 0)
            } else
            if (c == lastCol) {
                push(r - 1, c)
                push(r - 1, c - 1)
                push(r, c - 1)
                push(r + 1, c - 1)
                push(r + 1, c)
            } else {
                push(r - 1, c - 1)
                push(r - 1, c)
                push(r - 1, c + 1)
                push(r, c - 1)
                push(r, c + 1)
                push(r + 1, c - 1)
                push(r + 1, c)
                push(r + 1, c + 1)
            }
        }
    }

    gameState = true
    activeGame = false
}

function endGame(explodedCell) {
    explodedCell.element.attr('data-exploded', true)
    
    for (let b of bombs) {
        b.setText(icons.bomb)
    }

    displayMessage('GAME OVER!!!', 'You have lost the game.')
    console.info('GAME OVER!!!');

    gameState = false
    activeGame = false
}

function winGame() {
    displayMessage('WINNER!!!', 'You have won the game.')
    console.info('WINNER!!!');

    for (let b of bombs) {
        b.setText(icons.flag)
        b.element.attr('data-flagged', true)
    }

    updateCounter()

    gameState = false
    activeGame = false
}

rowsInput.on('change', checkSizeInput)
colsInput.on('change', checkSizeInput)
bombsInput.on('change', checkSizeInput)
messageBox.children('div').children('b').on('click', hideMessage)

startButton.on('click', newGame)

newGame()