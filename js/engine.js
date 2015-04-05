// Constants. Set in Engine.js because this is called by index.html first
var X_LEFT = 0,
    X_RIGHT = 707,
    Y_TOP = 0,
    Y_BOTTOM = 498,
    X_STEP = 101,
    Y_STEP = 83,
    X_CANVAS = 707,
    Y_CANVAS = 606,
    DARK_LEVELS = 14;

//Game Engine involved in initial set up
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

    function mainGameLoop() {
        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;
        update(dt);
        render();
        lastTime = now;
        win.requestAnimationFrame(mainGameLoop);
    }

    function init() {
        //Uses bootbox library to open initial dialogue/ instruction boxes
        bootbox.alert(openingMessage, function () {
            bootbox.alert(instructionMessage, function () {
                //Sets up and begins game
                setupNewGame();
                lastTime = Date.now();
                mainGameLoop();
            });
        });
    }


//Updates Game state to reflect game actions (player and nonplayer)
    function update(dt) {
        updateEntities(dt);
        checkAllCollisions();
        collectItems();
        checkLevelCompletion();
    }

//Update methods are located in app.js. Generally includes updating movement and existence
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

    function checkLevelCompletion() {
        if (player.x === map.end.x && player.y === map.end.y) {
            setupNewLevel();
        }
    }

//Draws what needs to be drawn
    function render() {
        renderBackground();
        renderMap();
        renderEntities();
        renderLives();
        renderBullets();
        }

    function renderBackground() {
        ctx.fillStyle = 'white';
        ctx.fillRect(-20, -20, 1000, 1000);
    }

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

//Life counter
    function renderLives() {
        var heartX = 0;
        var life = player.lives;
        for (var i = 0; i < life; i++) {
            ctx.drawImage(Resources.get('images/Heart-small.png'), heartX, -10);
            heartX += 50;
        }
    }

//Ammo counter
    function renderBullets() {
        ctx.font = "20px 'Press Start 2P'";
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText('Bullets: ' + gamestate.bullets, 400, 40);
    }


    function checkAllCollisions() {
        allEnemies.forEach(function (enemy) {
            if (checkCollision(player, enemy)) {
                //Reset game if player doesn't have lives
                if (player.lives - 1 === 0) {
                    resetGame();
                //Reset level if player has lives
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
        // Kills player on water tile
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

//Checks edge overlap to determine collision status for checkAllCollisions function above
    function checkCollision(entity1, entity2) {
        if (isBetween(entity1.rightEdge(), entity2.leftEdge(), entity2.rightEdge()) ||
            isBetween(entity1.leftEdge(), entity2.leftEdge(), entity2.rightEdge())) {
            if (isBetween(entity1.topEdge(), entity2.topEdge(), entity2.bottomEdge()) ||
                isBetween(entity1.bottomEdge(), entity2.topEdge(), entity2.bottomEdge())) {
                return true;
            }
        }
        return false;
    }

    function setupNewGame() {
        levelStartTime = Date.now();
        gamestate = new GameState();
        map = createMap();
        player = new Player();
        allEnemies = createEnemies();
        allItems = createItems();
        allAttacks = [];
    }

    function setupNewLevel() {
        gamestate.level += 1;
        $("#level").html(gamestate.level);
        levelStartTime = Date.now();
        // Once the player gets to the dark levels (20+) start increasing
        // the game speed with each level, but maximum game speed is 2.5.
        if (gamestate.level > DARK_LEVELS && gamestate.speed < 1.5) {
            gamestate.speed += 0.05;
        }
        map = createMap();
        player.startX().startY();
        allEnemies = createEnemies();
        allItems = createItems();
        allAttacks = [];
        player.hasKey = false;
    }

//Ends Game and displays final death prompt with level achieved
    function resetGame() {
        $('#page-header').html('Hive');
        var levelAchieved = gamestate.level;
        gamestate = new GameState();
        map = createMap();
        player = new Player();
        // Move player off the screen so they can't move while the dialog box is up.
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

//Removes a life and resets enemy/ player locations
    function resetLevel() {
        player.lives -= 1;
        pauseAlert(deathMessage);
        player.startX().startY();
        allEnemies.forEach(function (enemy) {
            enemy.startX().startY().setSpeed();
            // If the enemy is a backtracker, when the level resets, it may be
            // moving to the left and its sprite will be flipped. This is why
            // we need to set it back to the original sprite.
            if (enemy instanceof Backtracker) {
                enemy.sprite = 'images/backtracker.png';
            }
        });
    }


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


    function createMap() {
        var map = {
            // Array containing MapTile instances
            'tiles': [],
            // Player start
            'start': null,
            // Door: Player goal
            'end': null,
            'rocks': []
        };
        // Choose random x-position for start and end points. (Can't be
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
                    // Center of map containing grass and stones
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
                // Don't put rocks on water, or in the same row as the
                // start or end point.
                if ((!(tile instanceof Water || tile instanceof Wall)) && tile.x !== map.start.x &&
                    tile.x !== map.end.x) {
                    allRockCoords.push([tile.x, tile.y]);
                }
            });
            for (var x = 0; x < rockNumber; x++) {
                var rockCoords = randChoice(allRockCoords);
                map.rocks.push(new Rock(rockCoords[0], rockCoords[1]));
                removeElement(rockCoords, allRockCoords);
            }
        }
        return map;
    }

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
            newSelection = randChoice(weightedEnemyList);
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


// Determines the chance each type of enemy will show up based on the current level.
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
                    // Add coordinates to itemCoords array.
                    itemCoords.push([tile.x, tile.y]);
                }
            }
        });

        var keyCoords = randChoice(itemCoords);
        // Remove key coordinates so other items can't occupy same space.
        removeElement(keyCoords, itemCoords);
        var key = new Key(keyCoords[0], keyCoords[1]);
        items.push(key);

        var gemCoords = randChoice(itemCoords);
        // Remove gem coordinates so other items can't occupy same space.
        removeElement(gemCoords, itemCoords);
        var gem = new Gem(gemCoords[0], gemCoords[1]);
        items.push(gem);

        if (gamestate.level % 5 === 0) {
            if (Math.random() > 0.5) {
                var heartCoords = randChoice(itemCoords);
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
