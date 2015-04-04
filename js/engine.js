// Constants
var X_LEFT = 0,
    X_RIGHT = 707,
    Y_TOP = 0,
    Y_BOTTOM = 498,
    X_STEP = 101,
    Y_STEP = 83,
    X_CANVAS = 707,
    Y_CANVAS = 606,
    DARK_LEVELS = 14;

//Sets up the canvas for the game to work within
var Engine = (function (global) {
    var doc = global.document,
    canvas = doc.createElement('canvas'),
    ctx = canvas.getContext('2d'),
    win = global.window,
    patterns = {},
    lastTime;

    canvas.width = X_CANVAS;
    canvas.height = Y_CANVAS;
    doc.body.appendChild(canvas);

    /*
     * Main game loop. Gets current time, updates entity positions, renders map
     * and entities, then repeats.
     */
    function main() {
        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;
        update(dt);
        render();
        lastTime = now;
        win.requestAnimationFrame(main);
    }


    /*
     * Uses bootbox library to open intial dialog/ instruction boxes. Sets up the game and
     * calls the main function to begin the game.
     */
    function init() {
        bootbox.alert(openingMessage, function () {
            bootbox.alert(instructionMessage, function () {
                setupNewGame();
                lastTime = Date.now();
                main();
            });
        });
    }


    /*
     * Function that updates the state of the game. Checks on positions of all
     * entities (enemies, attacks, items), collisions and level completion
     */
    function update(dt) {
        updateEntities(dt);
        checkAllCollisions();
        collectItems();
        checkLevelCompletion();
    }

    /*
     * Function that updates the position of each enemy and attack,
     * checks if items have been collected
     * and if attacks have stopped moving.
     * Removes items and attacks that are no longer needed
     */
    function updateEntities(dt) {
        allEnemies.forEach(function (enemy) {
            enemy.update(dt);
        });
        allItems.forEach(function (item) {
            if (item.destroyed) {
                removeElement(item, allItems);
            }
        });
        allAttacks.forEach(function (attack) {
            attack.update(dt);
            if (attack.speed === 0) {
                removeElement(attack, allAttacks);
            }
        });
    }



    /*
     * Determines if the player reached the map's end point for that level.
     */
    function checkLevelCompletion() {
        if (player.x === map.end.x && player.y === map.end.y) {
            setupNewLevel();
        }
    }

    /**
     * Draws the brackground, map, player, all enemies, all items, all attacks,
     * the lives and number of bullets
     */
    function render() {
        renderBackground();
        renderMap();
        renderEntities();
        renderLives();
        renderBullets();
        }

    /*
     * Draws a white rectangle as the background for the game map.
     */
    function renderBackground() {
        ctx.fillStyle = 'white';
        ctx.fillRect(-20, -20, 1000, 1000);
    }

    /*
     * Draws all map tiles and map objects (start point, end point/door, rocks)
     * on the screen.
     */
    function renderMap() {
        map.tiles.forEach(function (tile) {
            tile.render();
        });
        map.start.render();
        map.end.render();
        map.rocks.forEach(function (rock) {
            rock.render();
        });
    }

    /*
     * Draws the player, all enemies, all items, and all attacks on the screen.
     */
    function renderEntities() {
        allItems.forEach(function (item) {
            item.render();
        });
        allAttacks.forEach(function (attack) {
            attack.render();
        });
        allEnemies.forEach(function (enemy) {
            enemy.render();
        });
        player.render();
    }

    /*
     * Draws hearts in the top left corner of the screen based on the number
     * of lives the player has.
     */
    function renderLives() {
        var heartX = 0;
        var life = player.lives;
        for (var i = 0; i < life; i++) {
            ctx.drawImage(Resources.get('images/Heart-small.png'), heartX, -10);
            heartX += 50;
        }
    }

    /*
     * Draws/writes the current number of bullets in the top right corner of the screen.
     */
    function renderBullets() {
        ctx.font = "20px 'Press Start 2P'";
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText('Bullets: ' + gamestate.bullets, 400, 40);
    }


    /*
     * Checks if enemies have hit players, if attacks have hit enemies, and if
     * the player is on water.  Resets game, level, or kills enemies depending
     * on game conditions.
     */
    function checkAllCollisions() {
        allEnemies.forEach(function (enemy) {
            // If player collides with enemy and they're invincible or
            // udacious (cheats) then kill the enemy.  Otherwise reset
            // the game or level depending on if the player has lives left.
            if (checkCollision(player, enemy)) {
                //out of lives = reset the game
                if (player.lives - 1 === 0) {
                    resetGame();
                //got lives? reset just the level
                } else {
                    resetLevel();
                }
            }
            // If an enemy collides with an attack, kill it and remove the bullet
            allAttacks.forEach(function (attack) {
                if (checkCollision(enemy, attack)) {
                    removeElement(enemy, allEnemies);
                    removeElement(attack, allAttacks);
                }
            });
        });
        // If player is on a water tile, reset the game or level depending on
        // if the player has lives left.
        map.tiles.forEach(function (tile) {
            if (tile instanceof Water && player.x === tile.x &&
                player.y === tile.y) {
                if (player.lives - 1 === 0) {
                    resetGame();
                } else {
                    resetLevel();
                }
            }
        });
    }

    /*
     * Helper function for checkAllCollisions. Checks if one entity's left edge
     * or right edge is between the other entity's left and right edge.
     * Returns true if edges overlap. Returns false otehrwise
     */
    function checkCollision(entity1, entity2) {
        if (inRange(entity1.right(), entity2.left(), entity2.right()) ||
            inRange(entity1.left(), entity2.left(), entity2.right())) {
            if (inRange(entity1.top(), entity2.top(), entity2.bottom()) ||
                inRange(entity1.bottom(), entity2.top(), entity2.bottom())) {
                return true;
            }
        }
        return false;
    }

    /*
     * Gives value to major game variables and sets the clock to start
     * calculating level completion time.
     */
    function setupNewGame() {
        levelStartTime = Date.now();
        gamestate = new GameState();
        map = createMap();
        player = new Player();
        allEnemies = createEnemies();
        allItems = createItems();
        allAttacks = [];
    }

    /*
     * Sets up a new level with a new map, new enemies, new items and
     * new start/ end points
     */
    function setupNewLevel() {
        gamestate.level += 1;
        $("#level").html(gamestate.level);
        // Start the clock for this level.
        levelStartTime = Date.now();
        // Once the player gets to the dark levels (20+) start increasing
        // the game speed with each level, but maximum game speed is 2.5.
        if (gamestate.level > DARK_LEVELS && gamestate.speed < 1.5) {
            gamestate.speed += 0.05;
        }
        map = createMap();
        // Set player x and y-coordinates.
        player.startX().startY();
        allEnemies = createEnemies();
        allItems = createItems();
        allAttacks = [];
        player.hasKey = false;
    }

    /**
     * This function displays a message telling the player they lost, displays
     * their score and level achieved, and prompts them to start again.
     */
    function resetGame() {
        $('#page-header').html('Hive');
        var levelAchieved = gamestate.level;
        gamestate = new GameState();
        map = createMap();
        player = new Player();
        // Move player off the screen so they can't move while the dialog box
        // is up.
        player.x = -100;
        player.y = -100;
        gamestate.paused = true;
        bootbox.alert(gameOverMessage, function () {
            // When the dialog box is closed, start a new game.
            player.startX().startY();
            allEnemies = createEnemies();
            allItems = createItems();
            $("#level").html(gamestate.level);
            gamestate.paused = false;
        });
        // Show the final level achieved in the game over dialog box.
        $('#finalLevel').html(levelAchieved);
    }

    /*
     * The player loses a life, a dialog box letting the player know they lost
     * a life pops up, and the player and enemy positions are reset.
     */
    function resetLevel() {
        player.lives -= 1;
        pauseAlert(deathMessage);
        player.startX().startY();
        allEnemies.forEach(function (enemy) {
            enemy.startX().startY().setSpeed();
            // If the enemy is a backtracker, when the level resets, it may be
            // moving to the left and its sprite will be flipped.  This is why
            // we need to set it back to the original sprite.
            if (enemy instanceof Backtracker) {
                enemy.sprite = 'images/backtracker.png';
            }
        });
    }

    /*
     * Similar to checkAllCollisions, but checks if the player has landed on
     * an item.  Different items have different effects when picked up.
     */
    function collectItems() {
        allItems.forEach(function (item) {
            if (player.x === item.x && player.y === item.y) {

                if (item instanceof Key) {
                    // Allows for movement onto door
                    player.hasKey = true;
                } else if (item instanceof Heart &&
                    // Increases lives on pickup assuming player has less than 5 lives
                    player.lives < player.maxLives) {
                    player.lives++;
                } else if (item instanceof Gem) {
                    // Add a bullets when picked up
                    gamestate.bullets += 1;
                }
                // Removes picked up items from the game
                removeElement(item, allItems);
            }
        });
    }

    /*
     * Function to create the game map.  Randomly assigns map start and end
     * point.  Randomly assigns rock locations if the level is high enough.
     */
    function createMap() {
        var map = {
            // The "background" for the map.  An array containing MapTile
            // instances.
            'tiles': [],
            // Where the player starts on the map.
            'start': null,
            // Where the player needs to go with the key to get to the next
            // level.
            'end': null,
            // An array containing all the Rock instances on the map.
            'rocks': []
        };
        // Choose random x-position for start and end points.  (Can't be
        // left or right-most tile)
        var mapStart = randInt(1, 4) * X_STEP;
        var mapEnd = randInt(1, 4) * X_STEP;
        map.start = new StartPoint(mapStart, 5 * Y_STEP);
        map.end = new Door(mapEnd, Y_TOP);
        for (var j = 0; j < Y_BOTTOM; j += Y_STEP) {
            for (var i = 0; i < X_RIGHT; i += X_STEP) {
                // Top row is walls except for end point
                if (j === 0) {
                    if (i === mapEnd) {
                        map.tiles.push(new Stone(i, j));
                    } else {
                        map.tiles.push(new Wall(i, j));
                    }
                    // Center of map does not change.
                } else if (j === Y_STEP || j === 4 * Y_STEP) {
                    map.tiles.push(new Grass(i, j));
                } else if (j === 2 * Y_STEP || j === 3 * Y_STEP) {
                    map.tiles.push(new Stone(i, j));
                } else if (j === 5 * Y_STEP) {
                    // Bottom row is made of water except for start point.
                    if (i === mapStart) {
                        map.tiles.push(new Stone(i, j));
                    } else {
                        map.tiles.push(new Water(i, j));
                    }
                }

            }
        }
        //Rocks begin appearing at level 10
        if (gamestate.level > 9) {
            var rockNumber = randInt(1, 3);
            var allRockCoords = [];
            map.tiles.forEach(function (tile) {
                // Don't put rocks on water, or in the same column as the
                // start or end point.
                if ((!(tile instanceof Water || tile instanceof Wall)) && tile.x !== map.start.x &&
                    tile.x !== map.end.x) {
                    allRockCoords.push([tile.x, tile.y]);
                }
            });
            for (var x = 0; x < rockNumber; x++) {
                var rockCoords = choice(allRockCoords);
                map.rocks.push(new Rock(rockCoords[0], rockCoords[1]));
                removeElement(rockCoords, allRockCoords);
            }
        }
        return map;
    }

    /**
     * Function to create enemies for a level.  Number and type of enemies will
     * vary by the current level.
     */
    function createEnemies() {
        // Array where all enemies will be stored.
        var enemies = [];
        var enemyObject = calcEnemyWeights();
        var enemyNames = Object.keys(enemyObject);
        var enemyWeights = [];
        enemyNames.forEach(function (enemy) {
            enemyWeights.push(enemyObject[enemy]);
        });
        // A list containing multiple copies of each enemy name
        // based on the values in enemyWeights.
        var weightedEnemyList = generateWeightedList(enemyNames, enemyWeights);
        var newEnemy;
        var newSelection;
        var enemyCount = 2 + Math.abs(Math.floor(gamestate.level / 5));
        if (gamestate.level > 25) {
            enemyCount = 8;
        }
        for (var i = 0; i < enemyCount; i++) {
            // Pick a random enemy name from the weighted list and add the
            // corresponding enemy object to the enemies array.
            newSelection = choice(weightedEnemyList);
            if (newSelection === 'enemy') {
                newEnemy = new Enemy();
            } else if (newSelection === 'charger') {
                newEnemy = new Charger();
            } else if (newSelection === 'backtracker') {
                newEnemy = new Backtracker();
            } else if (newSelection === 'sidestepper') {
                newEnemy = new Sidestepper();
            } else if (newSelection === 'slowpoke') {
                newEnemy = new Slowpoke();
            } else {
                newEnemy = new Centipede();
            }
            enemies.push(newEnemy);
        }
        return enemies;
    }

    /**
     * Helper function for createEnemies function. Determines the chance
     * each type of enemy will show up based on the current level.
     */
    function calcEnemyWeights() {
        var enemyWeights = {
            'enemy': 1,
            'charger': 0,
            'backtracker': 0,
            'sidestepper': 0,
            'slowpoke': 0,
            'centipede': 0
        };
        if (gamestate.level > 5) {
            for (var i = 0; i < gamestate.level - 2; i++) {
                if (enemyWeights.enemy > 0) {
                    enemyWeights.enemy -= 0.05;
                    enemyWeights.charger += 0.01;
                    enemyWeights.backtracker += 0.01;
                    enemyWeights.sidestepper += 0.01;
                    enemyWeights.slowpoke += 0.01;
                    enemyWeights.centipede += 0.01;
                }
            }
        }
        return enemyWeights;
    }

    /**
     * Creates and randomly assigns valid coordinates to all items needed
     * for a level.
     */
    function createItems() {
        var items = [];
        // Array that will store all possible locations an item could be placed.
        var itemCoords = [];
        var nearRock;
        // Loop through all map tiles and filter out ones that items shouldn't
        // be placed on.
        map.tiles.forEach(function (tile) {
            nearRock = false;
            // Don't put items on water or the map start or end point.
            if ((!(tile instanceof Water || tile instanceof Wall)) && (tile.x !== map.start.x ||
                tile.y !== map.start.y) && (tile.x !== map.end.x ||
                tile.y !== map.end.y)) {
                map.rocks.forEach(function (rock) {
                    if (tile.x <= rock.x + X_STEP &&
                        tile.x >= rock.x - X_STEP) {
                        if (tile.y <= rock.y + Y_STEP &&
                            tile.y >= rock.y - Y_STEP) {
                            nearRock = true;
                        }
                    }
                });
                if (!nearRock) {
                    // It's ok for an item to be placed here.  Add coordinates
                    // to itemCoords array.
                    itemCoords.push([tile.x, tile.y]);
                }
            }
        });

        var keyCoords = choice(itemCoords);
        // Remove key coordinates so other items can't occupy same space.
        removeElement(keyCoords, itemCoords);
        var key = new Key(keyCoords[0], keyCoords[1]);
        items.push(key);

        var gemCoords = choice(itemCoords);
        // Remove gem coordinates so other items can't occupy same space.
        removeElement(gemCoords, itemCoords);
        var gem = new Gem(gemCoords[0], gemCoords[1]);
        items.push(gem);

        if (gamestate.level % 5 === 0) {
            if (Math.random() > 0.5) {
                var heartCoords = choice(itemCoords);
                // Remove heart coordinates so other items can't occupy same
                // space.
                removeElement(heartCoords, itemCoords);
                var heart = new Heart(heartCoords[0], heartCoords[1]);
                items.push(heart);
            }
        }
        return items;
    }


    // Load all sprites needed for the game.
    Resources.load([
        'images/chest.png',
        'images/Wall.png',
        'images/circle.png',
        'images/stone-block.png',
        'images/dark-stone-block.png',
        'images/water-block.png',
        'images/lava-block.png',
        'images/grass-block.png',
        'images/dead-grass-block.png',
        'images/enemy-bug.png',
        'images/char-boy.png',
        'images/Heart.png',
        'images/charger.png',
        'images/charger-charging.png',
        'images/sidestepper.png',
        'images/backtracker.png',
        'images/backtracker-reverse.png',
        'images/slowpoke.png',
        'images/centipede.png',
        'images/Heart.png',
        'images/Heart-small.png',
        'images/Rock.png',
        'images/Key.png',
        'images/Key-Small.png',
        'images/Door.png',
        'images/Selector.png',
        'images/nothing.png',
    ]);
    Resources.onReady(init);

//Pushes ctx and canvas to the global scope for use in app.js
    global.ctx = ctx;
    global.canvas = canvas;
})(this);
