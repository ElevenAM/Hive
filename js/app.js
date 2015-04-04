// Declare Entities
var gamestate;
var map;
var player;
var allEnemies;
var allItems;
var allAttacks;
var levelStartTime;
var levelFinishTime;

// General Utility Functions

/*
 * Function to check if a number falls between two numbers.
 * Takes in value to check, min value, max value and returns boolean
 */
var inRange = function (value, min, max) {
    if (value <= max && value >= min) {
        return true;
    }
    return false;
};

/*
 * Function to calculate random integer between two numbers.
 */
var randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

/*
 * Function that randomly chooses and returns an element from an array.
 */
var choice = function (array) {
    return array[Math.floor(Math.random() * array.length)];
};

/*
 * Function that removes an element from an array by value. If there are
 * multiple matching elements, the first one will be removed.
 */
var removeElement = function (element, array) {
    var index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
};

/*
 * Pauses the game and brings up a dialog box. Resumes the game when the
 * dialog box is closed.
 */
var pauseAlert = function (text) {
    gamestate.paused = true;
    bootbox.alert(text, function () {
        gamestate.paused = false
    });
};

/*
 * Function that creates a weighted list of elements. Takes in elements and assigned
 * weights. Different weights will change the probability that certain elements
 * are chosen.
 */
var generateWeightedList = function (list, weight) {
    var weightedList = [];
    for (var i = 0; i < weight.length; i++) {
        var multiples = weight[i] * 100;
        for (var j = 0; j < multiples; j++) {
            weightedList.push(list[i]);
        }
    }
    return weightedList;
};


// Constructors

/*
 * An Object hosting properties relevant to the game
 */
var GameState = function () {
    this.paused = false;
    this.level = 1;
    this.speed = 1;
    this.bullets = 0;
};

/*
 * An Object to construct the most basic enemy/ bug. Will be used as the base class for
 * subclasses of enemies. Object includes random start point generation and random speed
 * generation.
 */
var Enemy = function () {
    this.width = 90;
    this.height = 80;
    this.maxSpeed = 200;
    this.minSpeed = 50;
    this.xStartOptions = [];
    this.yStartOptions = [];
    for (var i = -3; i < 5; i++) {
        this.xStartOptions.push(i * X_STEP);
    }
    for (var j = 1; j < 5; j++) {
        this.yStartOptions.push(j * Y_STEP);
    }
    this.startX();
    this.startY();
    this.setSpeed();
    this.sprite = 'images/enemy-bug.png';
};

/*
 * Function used in Engine to update enemy positions based on speed/ dt.
 * Accounts for enemies that go beyond the right side of the screen
 */
Enemy.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
    if (this.x > X_RIGHT) {
        this.x = -3 * X_STEP;
        this.startY();
    }
};

/*
 * Draws enemy's sprite on screen.
 */
Enemy.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
};

/*
 * Position of enemy's left edge. Used for collision purposes
 */
Enemy.prototype.left = function () {
    return this.x;
};

/*
 * Position of enemy's right edge. Used for collision purposes
 */
Enemy.prototype.right = function () {
    return this.x + this.width;
};

/*
 * Position of enemy's top edge. Used for collision purposes
 */
Enemy.prototype.top = function () {
    return this.y;
};

/*
 * Position of enemy's bottom edge. Used for collision purposes
 */
Enemy.prototype.bottom = function () {
    return this.y + this.height;
};

/*
 * Function to randomly choose an enemy's starting X-coordinates based on possible choices
 */
Enemy.prototype.startX = function () {
    this.x = choice(this.xStartOptions);
    return this;
};

/*
 * Function to randomly choose an enemy's starting Y-coordinates based on possible choices
 */
Enemy.prototype.startY = function () {
    this.y = choice(this.yStartOptions);
    return this;
};

/*
 * Sets enemy speed to random integer between enemy's minimum and maximum speeds.
 */
Enemy.prototype.setSpeed = function () {
    this.speed = randInt(this.minSpeed, this.maxSpeed);
    return this;
};

// Enemy Subclasses

/*
 * An enemy that randomly increases speed for short bursts.
 */
var Charger = function () {
    Enemy.call(this);
    this.sprite = 'images/charger.png';
    this.charging();
};

Charger.prototype = Object.create(Enemy.prototype);
Charger.prototype.constructor = Charger;

/*
 * Method setting an interval for this enemy to check if it will charge or not.
 * If this enemy charges, its speed increases to 700 for half a second
 * before returning to its original speed.
 */
Charger.prototype.charging = function () {
    // self is used so access this inside the setInterval function.
    var self = this;
    var originalSpeed = self.speed;
    var chargingInterval = randInt(2000, 5000);
    setInterval(function () {
        var willCharge = Math.random();
        if (willCharge > 0.5) {
            self.speed = 700;
            setTimeout(function () {
                self.speed = originalSpeed;
                self.sprite = 'images/charger.png';
            }, 500);
        }
    }, chargingInterval)
};

/*
 * Enemy that will randomly move one step up or down on Y axis.
 */
var Sidestepper = function () {
    Enemy.call(this);
    this.sideStepSpeed = 0;
    this.newY = this.y;
    this.sprite = 'images/sidestepper.png';
    this.sidestep();
};
Sidestepper.prototype = Object.create(Enemy.prototype);
Sidestepper.prototype.constructor = Sidestepper;

/*
 * Modified enemy update method to compensate for Sidestepper ability to move
 * on the Y axis if it has a non-zero value for its sideStepSpeed property and it hasn't
 * reached its new row yet.
 */
Sidestepper.prototype.update = function (dt) {
    Enemy.prototype.update.call(this, dt);
    if (!gamestate.paused) {
        this.y += dt * this.sideStepSpeed * gamestate.speed;
        // If this sidestepper has reached or passed its target row,
        // set it's y-position to the target row and stop its y-movement.
        if (this.sideStepSpeed > 0 && this.y > this.newY || this.sideStepSpeed < 0 && this.y < this.newY) {
            this.y = this.newY;
            this.sideStepSpeed = 0;
        }
    }
};

/*
 * Method setting an interval to check to see if Sidestepper it will "Sidestep" based on a
 * random number generator.  If this enemy will step, another check will be made
 * to determine the direction (up or down).
 */
Sidestepper.prototype.sidestep = function () {
    // self is used to access this inside the setInterval function.
    var self = this;
    var steppingInterval = randInt(1000, 3000);
    var newY;
    setInterval(function () {
        var willStep = Math.random();
        if (willStep > 0.3 && self.sideStepSpeed === 0) {
            var upOrDown = Math.random();
            // Prevents enemy from moving into bottom row (start row)
            if (upOrDown >= 0.5 && self.y < Y_BOTTOM - 2 * Y_STEP) {
                self.newY = self.y + Y_STEP;
                self.sideStepSpeed = 100;
            // Prevents enemy from moving into topmost row (end row)
            } else if (upOrDown < 0.5 && self.y > Y_TOP + Y_STEP) {
                self.newY = self.y - Y_STEP;
                self.sideStepSpeed = -100;
            }
        }
    }, steppingInterval)
};

/*
 * An enemy that turns around when it gets past the edge of the screen.
 * It will also randomly turn around sometimes.
 */
var Backtracker = function () {
    Enemy.call(this);
    this.sprite = 'images/backtracker.png';
    this.backtrack();
};
Backtracker.prototype = Object.create(Enemy.prototype);
Backtracker.prototype.constructor = Backtracker;

/*
 * Updates x position of enemy based on its speed and dt if the game
 * isn't paused. Changes direction if the end of a screen is reached
 */
Backtracker.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
    if (this.left() > X_RIGHT + 2 * X_STEP && this.speed > 0) {
        // Multiply speed by negative one to turn around.
        this.speed *= -1;
        this.sprite = 'images/backtracker-reverse.png';
    }
    if (this.right() < X_LEFT - 2 * X_STEP && this.speed < 0) {
        // Multiply speed by negative one to turn around.
        this.speed *= -1;
        this.sprite = 'images/backtracker.png';
    }
};

/*
 * Method to check if Backtracker enemy will change directions or not. Also makes sure
 * that Backtracker is using the correct sprite for its direction
 */
Backtracker.prototype.backtrack = function () {
    // self is used to access this inside the setInterval function.
    var self = this;
    var backtrackInterval = randInt(5000, 10000);
    setInterval(function () {
        var willBacktrack = Math.random();
        if (willBacktrack > 0.2) {
            self.speed *= -1;
            if (self.speed > 0) {
                self.sprite = 'images/backtracker.png';
            } else {
                self.sprite = 'images/backtracker-reverse.png';
            }
        }
    }, backtrackInterval);
};

/**
 * A really slow enemy
 */
var Slowpoke = function () {
    Enemy.call(this);
    this.sprite = 'images/slowpoke.png';
    this.minSpeed = 15;
    this.maxSpeed = 25;
    this.setSpeed();
};

Slowpoke.prototype = Object.create(Enemy.prototype);
Slowpoke.prototype.constructor = Slowpoke;

/**
 * A long enemy.
 */
var Centipede = function () {
    Enemy.call(this);
    this.sprite = 'images/centipede.png';
    this.width = 270;
};

Centipede.prototype = Object.create(Enemy.prototype);
Centipede.prototype.constructor = Centipede;


/**
 * Player Class Constructor
 */
var Player = function () {
    this.width = 60;
    this.height = 80;
    this.maxLives = 5;
    this.lives = 3;
    this.hasKey = false;
    this.startX();
    this.startY();
    this.sprite = 'images/char-boy.png';
};


/**
 * Method to draw player on the screen.
 */
Player.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
    if (this.hasKey) {
        ctx.drawImage(Resources.get('images/Key-Small.png'),
        this.x + 15, this.y + 70);
        }
    };


/**
 * Sets player's x-coordinate to x-position of map start point.
 */
Player.prototype.startX = function () {
    this.x = map.start.x;
    return this;
};

/**
 * Sets player's y-coordinate to y-position of map start point.
 */
Player.prototype.startY = function () {
    this.y = map.start.y;
    return this;
};

/**
 * Position of player's left edge. Used for collision purposes
 */
Player.prototype.left = function () {
    return this.x + 20;
};

/**
 *Position of player's right edge. Used for collision purposes
 */
Player.prototype.right = function () {
    return this.x + this.width;
};

/**
 * Position of player's top edge. Used for collision purposes
 */
Player.prototype.top = function () {
    return this.y;
};

/**
 * Position of player's bottom edge. Used for collision purposes
 */
Player.prototype.bottom = function () {
    return this.y + this.height;
};

/**
 * Method to change the position of the player based on the user's keyboard
 * input. Takes in keystroke event and creates a new X or Y position based on the input
 */
Player.prototype.move = function (direction) {
    // Set new coordinates equal to current coordinates.
    var newX = this.x;
    var newY = this.y;
    // Update coordinates based on keystroke.
    if (direction === 'left') {
        newX = this.x - X_STEP;
    }
    if (direction === 'right') {
        newX = this.x + X_STEP;
    }
    if (direction === 'up') {
        newY = this.y - Y_STEP;
    }
    if (direction === 'down') {
        newY = this.y + Y_STEP;
    }
    var onMap = false;
    map.tiles.forEach(function (tile) {
        // Make sure the new coordinates are still on the map.
        // Don't move the player if coordinates don't exist.
        if (newX === tile.x && newY === tile.y) {
            onMap = true;
        }
    });
    if (onMap) {
        // Don't move the player if the new coordinates are at the end point
        // and the player doesn't have the key.
        if (newX === map.end.x && newY === map.end.y && !this.hasKey) {
            return;
        }
        var hitRock = false;
        map.rocks.forEach(function (rock) {
            // Don't move the player if the new coordinates are the same
            // as the coordinates of a rock.
            if (newX === rock.x && newY === rock.y) {
                hitRock = true;
            }
        });
        var hitWall = false;
        map.tiles.forEach(function (tile) {
            // Don't move the player if the new coordinates are the same
            // as the coordinates of a wall.
            if (tile instanceof Wall && newX === tile.x && newY === tile.y){
                hitWall = true;
            }
        })
        // If all these tests have been passed, move the player.
        if (!hitRock && !hitWall) {
            this.x = newX;
            this.y = newY;
        }
    }
};


/**
 * A method to let the user manipulate the player using the keyboard.  Different
 * keys activate different player actions.
 */
Player.prototype.handleInput = function (input) {
    if (!gamestate.paused) {
            if (input === 'left' || 'right' || 'up' || 'down') {
                this.move(input);
            }
            if (input === 'p') {
                pauseAlert(pauseMessage);
            }
            //Allows the player to shoot to either the right or left assuming that he has
            // bullets
            if (gamestate.bullets > 0) {
                if (input === 'a' || input === 'd') {
                    allAttacks.push(new Pewpew(input));
                    gamestate.bullets -= 1;
                }
            }
    }
};

/**
 * Items for the player to collect!  This class is not used but is the base
 * for all item subclasses.
 */
var Item = function (x, y) {
    this.x = x;
    this.y = y;
    this.renderOffsetY = -20;
    // If an item's destroyed property is true, it will be removed from
    // allItems array during the update function.
    this.destroyed = false;
};

/**
 * Draws item's sprite on screen.
 */
Item.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);;
};


/**
 * Heart item which will give an extra life.
 */
var Heart = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/Heart.png';
};

Heart.prototype = Object.create(Item.prototype);
Heart.prototype.constructor = Heart;

/**
 * Key item which changes hasKey property to true, allowing the player to pass the door
 * to the next level
 */
var Key = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/Key.png';
};

Key.prototype = Object.create(Item.prototype);
Key.prototype.constructor = Key;

/**
 *Chest item which will increase the number of bullets the player has by 1
 */
var Gem = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/chest.png';
    this.fading = false;
    this.disappear();
};

Gem.prototype = Object.create(Item.prototype);
Gem.prototype.constructor = Gem;

/**
 * Draws Chest's sprite on screen.  Opacity is reduced if ammo's fading property
 * is set to true.
 */
Gem.prototype.render = function () {
    if (this.fading) {
        ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);
    ctx.globalAlpha = 1;
};

/**
 * Starts two timers.  After first timer ends, the chest will fade.  After the
 * second the chest will be destroyed (removed from allItems).
 */
Gem.prototype.disappear = function () {
    var thisGem = this;
    var fadeTime = 2500;
    var destroyTime = fadeTime + 1500;
    setTimeout(function () {
        thisGem.fading = true;
    }, fadeTime);
    setTimeout(function () {
        thisGem.destroyed = true;
    }, destroyTime);
};

/*
 * Base Tile constructor to be used for all MapTile subclasses. Hosts X and Y coordinates
 * for the tiles
 */
var MapTile = function (x, y) {
    this.x = x;
    this.y = y;
};

/**
 * Draws MapTile sprite on the screen.
 */
MapTile.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

/**
 * A tile with a grass sprite.
 */
var Grass = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/grass-block.png';
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/dead-grass-block.png';
    }
};

Grass.prototype = Object.create(MapTile.prototype);
Grass.prototype.constructor = Grass;

/**
 * A tile with a stone sprite.
 */
var Stone = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/stone-block.png';
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/dark-stone-block.png';
    }
};

Stone.prototype = Object.create(MapTile.prototype);
Stone.prototype.constructor = Stone;

/**
 * A tile with a water sprite.
 */
var Water = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/water-block.png';
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/lava-block.png';
    }
};

Water.prototype = Object.create(MapTile.prototype);
Water.prototype.constructor = Water;

/**
 * Objects or important points placed on the map, that can't be collected
 * like items.
 */
var MapObject = function (x, y) {
    this.x = x;
    this.y = y;
};

/**
 * Draws map object on the screen.
 */
MapObject.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
};

/**
 * A map object that determines where the player starts on the map.
 */
var StartPoint = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/nothing.png';
};

StartPoint.prototype = Object.create(MapObject.prototype);
StartPoint.prototype.constructor = StartPoint;

/**
 * The door or end point on a map.  The player needs a key to move through it.
 */
var Door = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Door.png';
};

Door.prototype = Object.create(MapObject.prototype);
Door.prototype.constructor = Door;

/**
 * A rock that blocks the way.  Players can't move on tiles that have a rock
 * on them.
 */
var Rock = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Rock.png';
};

Rock.prototype = Object.create(MapObject.prototype);
Rock.prototype.constructor = Rock;

/*
 * A wall tile that exists to prevent movement to the topmost row
*/
var Wall = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Wall.png'
}

Wall.prototype = Object.create(MapObject.prototype);
Wall.prototype.constructor = Wall;


// Prevent arrow keys from scrolling window so game screen will not move
// on user input.
window.addEventListener("keydown", function (e) {
    if ([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function (e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        80: 'p',
        67: 'c',
        65: 'a',
        68: 'd',
        81: 'q',
        69: 'e'
    };
    player.handleInput(allowedKeys[e.keyCode]);
});



/*
 * An attack class that will destroy enemies when they collide.
 * Attacks will originate at the coordinates of the player.
*/

var Attack = function () {
    this.x = player.x;
    this.y = player.y;
    this.width = 20;
    this.height = 80;
    this.renderOffsetY = 80
};

/*
 * Updates x-position of attack based on its speed and dt if the game
 * isn't paused.  If the attack moves past either edge of the screen
 * its speed will be reduced to zero and will be removed from the game.
 */

Attack.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
    if (this.x > X_RIGHT || this.x < X_LEFT - X_STEP) {
        this.speed = 0;
    }
};

/*
 * Draws attacks sprite on screen.
 */

Attack.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);
};

/*
 * @return {number} Position of attacks left edge.
 */
Attack.prototype.left = function () {
    return this.x;
};

/*
 * @return {number} Position of attacks right edge.
 */
Attack.prototype.right = function () {
    return this.x + this.width;
};

/*
 * @return {number} Position of attacks top edge.
*/
Attack.prototype.top = function () {
    return this.y;
};

/*
 * @return {number} Position of attacks bottom edge.
 */
Attack.prototype.bottom = function () {
    return this.y + this.height;
};

/*
Bullet constructor
*/

var Pewpew = function (input) {
    Attack.call(this);
    if (input === 'a') {
        this.speed = -300;
        this.sprite = 'images/circle.png';
    } else if (input === 'd') {
        this.speed = 300;
        this.sprite = 'images/circle.png';
    }
};

Pewpew.prototype = Object.create(Attack.prototype);
Pewpew.prototype.constructor = Pewpew;

// Game Dialog/Messages
var deathMessage = "<h>You got caught!</h> <img src='images/caught.jpg' alt='caught'>";

var gameOverMessage = "<h2><p>You died</p><br><h5 " +
    "style='text-style:underline'>Your Stats</h5><p style=" +
    "'text-align:center'>Level: <span id='finalLevel'></span>";

var openingMessage = "<h2>Welcome, Gladiator, to Bug Arena!</h2><div class='text-left'>" +
    "<img src='images/notsure.jpg' alt='chest' height = 160 width = 120>" +
    "<p>Two years ago, oxygen began spewing from the Arctic</p>" +
    "<p>At first, all we noticed was increased fuel efficiency and better growing plants</p>" +
    "<p>Then... we got bigger bugs</p>" +
    "<img src='images/enemy-bug.png' alt='bug'>" +
    "<p>Well for a death row inmate like you, all you need to know is that our sponsors love watching people like you squirm </p>" +
    "<p>Squirm? Get it? Bugs?</p>" +
    "<p> Rules are simple.</p>  <p> 1. Grab the key.</p> <p>2. Don't get caught.</p> <p> 3. Escape!</p> <br>" +
    "<p>To keep things interesting, you get a gun but no bullets!</p>" +
    "<p> You might find some in the chests <img src='images/chest.png' alt='chest'></p></div>";

var instructionMessage = "<h2>Controls</h2><hr><div " +
    "class='text-left'><p>Move with your arrow keys</p>" +
    "<img src='images/arrow_keys.png' alt='Arrow Keys'>" +
    "<p>Shoot with A and D </p>" +
    "<p>Press <strong>P</strong> to pause the game and <strong>Enter</strong> to " +
    "resume play.</p> <p>Don't get caught by the bugs or fall in the water</p></div>";

var pauseMessage = "<h2>Game Paused</h2><hr><p>" +
    "Press <strong>Enter</strong> to resume.</p>";


