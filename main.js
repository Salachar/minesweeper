class Minesweeper {
    constructor () {
        // Board will be intermediate 16x16
        this.board_size = 20;
        this.bomb_chance = 5;
        this.bomb_count = 0;
        this.time = 0;
        this.game_over = false;
        this.timer = null;
        this.board = {};

        this.el_game = document.getElementById('game');
        this.el_menu = document.getElementById('menu');
        this.el_bomb_counter = document.getElementById('bomb_counter');
        this.el_timer_counter = document.getElementById('guess_counter');
        this.el_board = document.getElementById('board');

        this.el_reset_button = document.getElementById('reset_button');
        this.el_smiley = document.getElementById('smiley');

        this.cardinal_mods = [
            {x: 0, y: -1},
            {x: 1, y: 0},
            {x: 0, y: 1},
            {x: -1, y: 0}
        ];

        this.all_mods = [
            {x: 0, y: -1},
            {x: 1, y: -1},
            {x: 1, y: 0},
            {x: 1, y: 1},
            {x: 0, y: 1},
            {x: -1, y: 1},
            {x: -1, y: 0},
            {x: -1, y: -1}
        ];

        this.setupMenu();
        this.initializeBoard();
    }

    setupMenu () {
        this.el_reset_button.addEventListener('click', (e) => {
            this.initializeBoard();
        });
    }

    initializeBoard () {
        this.el_game.style.width = `${this.board_size}rem`;
        this.el_smiley.innerHTML = '&#x263B;';
        this.el_timer_counter.innerHTML = 0;
        this.el_smiley.classList.remove('game_over');

        this.time = 0;
        this.game_over = false;

        clearTimeout(this.timer);
        this.timer = null;

        this.board = {};
        this.el_board.innerHTML = '';
        for (let y = 1; y <= this.board_size; ++y) {
            // Create new html element to represent a row
            let el_new_row = createElement('div', 'tile_row', {
                addTo: this.el_board
            });
            for (let x = 1; x <= this.board_size; ++x) {
                const tile = this.newTile(x, y);
                this.board[tile.key] = tile;
                this.createTileElement(tile, el_new_row);
            }
        }

        this.bomb_count = 0;
        this.el_bomb_counter.innerHTML = this.bomb_count;
    }

    createTileElement (tile, el_parent) {
        ((tile, el_parent) => {
            tile.node = createElement('div', 'tile covered', {
                addTo: el_parent,
                events: {
                    click: (event) => { // Left click
                        if (this.game_over || tile.flagged || event.which !== 1) return;
                        if (!this.timer) this.startTimer();
                        if (tile.is_bomb) {
                            this.showAllBombs();
                        }
                        if (!tile.is_bomb) {
                            this.uncoverTiles(tile).then(() => {
                                this.checkWin();
                            });
                        }
                    },
                    contextmenu: (event) => { // Right click
                        event.preventDefault();
                        if (this.game_over) return;
                        if (tile.flagged) {
                            tile.flagged = false;
                            this.bomb_count += 1;
                            this.el_bomb_counter.innerHTML = this.bomb_count;
                            tile.node.innerHTML = '';
                            tile.node.classList.remove('flag');
                        } else {
                            tile.flagged = true;
                            this.bomb_count -= 1;
                            this.el_bomb_counter.innerHTML = this.bomb_count;
                            tile.node.innerHTML = '&#x2691';
                            tile.node.classList.add('flag');
                        }
                    }
                }
            });
        })(tile, el_parent);
    }

    startTimer () {
        this.timer = setInterval(() => {
            this.time += 1;
            this.el_timer_counter.innerHTML = this.time;
        }, 1000);
    }

    async uncoverTiles (start_tile) {
        let queue = [start_tile];
        while (queue.length) {
            await new Promise((res, rej) => {
                setTimeout(() => {res();}, 5)
            });
            const tile = queue.shift();
            tile.node.classList.remove('covered', 'flag');
            tile.node.classList.add('uncovered');
            tile.uncovered = true;
            // If the tile has bombs around it, it doesnt expand
            const bomb_count = this.getBombCount(tile);
            if (bomb_count > 0) {
                tile.node.innerHTML = bomb_count;
                tile.node.classList.add(`bomb_count_${bomb_count}`);
            } else {
                this.cardinal_mods.forEach((mod) => {
                    const key = `tile_${tile.x + mod.x}_${tile.y + mod.y}`;
                    const adj_tile = this.board[key];
                    if (adj_tile && !adj_tile.marked && !adj_tile.uncovered && !adj_tile.flagged) {
                        adj_tile.marked = true;
                        queue.push(adj_tile);
                    }
                });
            }
        }
    }

    getBombCount (tile) {
        let bomb_count = 0;
        this.all_mods.forEach((mod) => {
            const key = `tile_${tile.x + mod.x}_${tile.y + mod.y}`;
            if ((this.board[key] || {}).is_bomb) {
                bomb_count += 1;
            }
        });
        return bomb_count;
    }

    checkWin () {
        // Check for any not bomb tiles still uncovered
        for (let key in this.board) {
            if (!this.board[key].is_bomb && !this.board[key].uncovered) return;
        }
        this.game_over = true;
        clearTimeout(this.timer);
        this.timer = null;
        for (let key in this.board) {
            const tile = this.board[key];
            if (tile.is_bomb) {
                tile.node.innerHTML = '&#x2691';
                tile.node.classList.add('flag');
            }
        }
    }

    showAllBombs () {
        this.game_over = true;
        clearTimeout(this.timer);
        this.timer = null;
        this.el_smiley.innerHTML = '&#x2620';
        this.el_smiley.classList.add('game_over');
        for (let key in this.board) {
            const tile = this.board[key];
            if (tile.is_bomb) {
                tile.node.classList.remove('covered');
                tile.node.classList.add('uncovered');
                tile.node.classList.add('bomb');
                tile.node.innerHTML = '&#10041;'
            }
        }
    }

    newTile (x, y) {
        const new_tile = {
            key: `tile_${x}_${y}`,
            x: x,
            y: y,
            is_bomb: (getPercentage() <= this.bomb_chance) ? true : false,
            uncovered: false,
            flagged: false,
            marked: false,
        };
        if (new_tile.is_bomb) {
            this.bomb_count += 1;
        }
        return new_tile;
    }
}



/******************************************************************************
    GENERAL HELPER FUNCTIONS
******************************************************************************/

function getPercentage () {
    return Math.floor(Math.random() * 100) + 1;
}

function createElement (type, classes, opts) {
    opts = opts || {};
    let node = document.createElement(type);
    let classes_split = classes.split(' ');
    for (let i = 0; i < classes_split.length; ++i) {
        node.classList.add(classes_split[i]);
    }
    if (opts.attributes) {
        for (let attr in opts.attributes) {
            if (opts.attributes[attr]) {
                node.setAttribute(attr, opts.attributes[attr]);
            }
        }
    }
    if (opts.dataset) {
        for (let data in opts.dataset) {
            if (opts.dataset[data]) {
                node.dataset[data] = opts.dataset[data];
            }
        }
    }
    if (opts.events) {
        for (let event in opts.events) {
            node.addEventListener(event, opts.events[event]);
        }
    }
    if (opts.html) {
        node.innerHTML = opts.html;
    }
    if (opts.addTo) {
        opts.addTo.appendChild(node);
    }
    return node;
}

window.onload = () => {
    new Minesweeper();
}
