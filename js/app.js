// Declare Entities
var gamestate;
var map;
var player;
var allEnemies;
var allItems;
var allAttacks;
var levelStartTime;
var levelFinishTime;

// General Utility Functions for later use

var isBetween = function (value, min, max) {
    if (value <= max && value >= min) {
        return true;
    }
    return false;
};

var randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

var randChoice = function (array) {
    return array[Math.floor(Math.random() * array.length)];
};

//Removes first element from array in case of multiple matches
var removeElement = function (element, array) {
    var index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
};

var pauseAlert = function (text) {
    gamestate.paused = true;
    bootbox.alert(text, function () {
        gamestate.paused = false;
    });
};

/*
 * Weighted List that holds both elements and respective weights to adjust the probability
 * of certain elements being chosen. Higher weight = higher chance
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

var GameState = function () {
    this.paused = false;
    this.level = 1;
    this.speed = 1;
    this.bullets = 0;
};


//Base class for all enemies
var Enemy = function () {
    this.width = 90;
    this.height = 80;
    this.maxSpeed = 200;
    this.minSpeed = 50;
    this.xStartOptions = [];
    this.yStartOptions = [];
//Determines Enemy start location
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

Enemy.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
    if (this.x > X_RIGHT) {
        this.x = -3 * X_STEP;
        this.startY();
    }
};

Enemy.prototype.startX = function () {
    this.x = randChoice(this.xStartOptions);
    return this;
};

Enemy.prototype.startY = function () {
    this.y = randChoice(this.yStartOptions);
    return this;
};

Enemy.prototype.setSpeed = function () {
    this.speed = randInt(this.minSpeed, this.maxSpeed);
    return this;
};

Enemy.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
};

Enemy.prototype.leftEdge = function () {
    return this.x;
};

Enemy.prototype.rightEdge = function () {
    return this.x + this.width;
};

Enemy.prototype.topEdge = function () {
    return this.y;
};

Enemy.prototype.bottomEdge = function () {
    return this.y + this.height;
};

// Enemy Subclasses

//Charger subclass will "charge" on occasion to increase its speed
var Charger = function () {
    Enemy.call(this);
    this.sprite = 'images/charger.png';
    this.charging();
};

Charger.prototype = Object.create(Enemy.prototype);
Charger.prototype.constructor = Charger;

Charger.prototype.charging = function () {
    // self is used so access this inside the setInterval function.
    var self = this;
    var originalSpeed = self.speed;
    var chargingInterval = randInt(2000, 5000);
//Checks to see if Charger will charge or not and returns Charger to normal after a charge
    setInterval(function () {
        var willCharge = Math.random();
        if (willCharge > 0.5) {
            self.sprite = 'images/charger-charging.png'
            self.speed = 700;
            setTimeout(function () {
                self.speed = originalSpeed;
                self.sprite = 'images/charger.png';
            }, 500);
        }
    }, chargingInterval);
};

//Enemy that will randomly sidestep up or down the Y axis.
var Sidestepper = function () {
    Enemy.call(this);
    this.sideStepSpeed = 0;
    this.newY = this.y;
    this.sprite = 'images/sidestepper.png';
    this.sidestep();
};
Sidestepper.prototype = Object.create(Enemy.prototype);
Sidestepper.prototype.constructor = Sidestepper;

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
    }, steppingInterval);
};

Sidestepper.prototype.update = function (dt) {
    Enemy.prototype.update.call(this, dt);
    if (!gamestate.paused) {
        this.y += dt * this.sideStepSpeed * gamestate.speed;
        // Updates Y axis position if sidestepping and bug hasn't reached new row yet
        if (this.sideStepSpeed > 0 && this.y > this.newY || this.sideStepSpeed < 0 && this.y < this.newY) {
            this.y = this.newY;
            this.sideStepSpeed = 0;
        }
    }
};

// Enemy that changes directions either at the end of the map or at random intervals
var Backtracker = function () {
    Enemy.call(this);
    this.sprite = 'images/backtracker.png';
    this.backtrack();
};
Backtracker.prototype = Object.create(Enemy.prototype);
Backtracker.prototype.constructor = Backtracker;

Backtracker.prototype.backtrack = function () {
    // self is used to access this inside the setInterval function.
    var self = this;
    var backtrackInterval = randInt(5000, 10000);
//Randomly chooses to swap directions and makes sure correct sprite is being used
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

Backtracker.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
    if (this.leftEdge() > X_RIGHT + 2 * X_STEP && this.speed > 0) {
        // Multiply speed by negative one to turn around.
        this.speed *= -1;
        this.sprite = 'images/backtracker-reverse.png';
    }
    if (this.rightEdge() < X_LEFT - 2 * X_STEP && this.speed < 0) {
        // Multiply speed by negative one to turn around.
        this.speed *= -1;
        this.sprite = 'images/backtracker.png';
    }
};

//Enemy that is really slow
var Slowpoke = function () {
    Enemy.call(this);
    this.sprite = 'images/slowpoke.png';
    this.minSpeed = 15;
    this.maxSpeed = 25;
    this.setSpeed();
};

Slowpoke.prototype = Object.create(Enemy.prototype);
Slowpoke.prototype.constructor = Slowpoke;

//Enemy that is really long
var Centipede = function () {
    Enemy.call(this);
    this.sprite = 'images/centipede.png';
    this.width = 270;
};

Centipede.prototype = Object.create(Enemy.prototype);
Centipede.prototype.constructor = Centipede;


// Player
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

Player.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
    if (this.hasKey) {
        ctx.drawImage(Resources.get('images/Key-Small.png'),
        this.x + 15, this.y + 70);
        }
    };

Player.prototype.startX = function () {
    this.x = map.start.x;
    return this;
};

Player.prototype.startY = function () {
    this.y = map.start.y;
    return this;
};

Player.prototype.leftEdge = function () {
    return this.x + 20;
};

Player.prototype.rightEdge = function () {
    return this.x + this.width;
};

Player.prototype.topEdge = function () {
    return this.y;
};

Player.prototype.bottomEdge = function () {
    return this.y + this.height;
};

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
        // Blocks door entry if player doesn't have the key
        if (newX === map.end.x && newY === map.end.y && !this.hasKey) {
            return;
        }
        var hitRock = false;
        map.rocks.forEach(function (rock) {
            // Blocks movement onto rocks
            if (newX === rock.x && newY === rock.y) {
                hitRock = true;
            }
        });
        var hitWall = false;
        map.tiles.forEach(function (tile) {
            // Blocks movement into walls
            if (tile instanceof Wall && newX === tile.x && newY === tile.y){
                hitWall = true;
            }
        });
        // Moves player assuming valid new location
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

//Item Base Class
var Item = function (x, y) {
    this.x = x;
    this.y = y;
    this.renderOffsetY = -20;
    this.destroyed = false;
};

Item.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);
};

//Gives extra life on pickup
var Heart = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/Heart.png';
};

Heart.prototype = Object.create(Item.prototype);
Heart.prototype.constructor = Heart;

//Allows passage onto next level
var Key = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/Key.png';
};

Key.prototype = Object.create(Item.prototype);
Key.prototype.constructor = Key;

//Contains a bullet for the player's gun
var Gem = function (x, y) {
    Item.call(this, x, y);
    this.sprite = 'images/chest.png';
    this.fading = false;
    this.disappear();
};

Gem.prototype = Object.create(Item.prototype);
Gem.prototype.constructor = Gem;

Gem.prototype.render = function () {
    if (this.fading) {
        ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);
    ctx.globalAlpha = 1;
};

Gem.prototype.disappear = function () {
    var thisGem = this;
    var fadeTime = 2500;
    var destroyTime = fadeTime + 1500;
//Gives the chest opacity to signify imminent disappearance
    setTimeout(function () {
        thisGem.fading = true;
    }, fadeTime);
//Destroys chest when time runs out
    setTimeout(function () {
        thisGem.destroyed = true;
    }, destroyTime);
};

//Base Tile Constructor
var MapTile = function (x, y) {
    this.x = x;
    this.y = y;
};

MapTile.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

//Grass Tile
var Grass = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/grass-block.png';
//Different sprite on dark levels.
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/dead-grass-block.png';
    }
};

Grass.prototype = Object.create(MapTile.prototype);
Grass.prototype.constructor = Grass;

//Stone Tile
var Stone = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/stone-block.png';
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/dark-stone-block.png';
    }
};

Stone.prototype = Object.create(MapTile.prototype);
Stone.prototype.constructor = Stone;

//Water Tile
var Water = function (x, y) {
    MapTile.call(this, x, y);
    this.sprite = 'images/water-block.png';
    if (gamestate.level > DARK_LEVELS) {
        this.sprite = 'images/lava-block.png';
    }
};

Water.prototype = Object.create(MapTile.prototype);
Water.prototype.constructor = Water;

//Objects to placed on the map
var MapObject = function (x, y) {
    this.x = x;
    this.y = y;
};

MapObject.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - 20);
};

//Player Start point
var StartPoint = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/nothing.png';
};

StartPoint.prototype = Object.create(MapObject.prototype);
StartPoint.prototype.constructor = StartPoint;

//Player End point
var Door = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Door.png';
};

Door.prototype = Object.create(MapObject.prototype);
Door.prototype.constructor = Door;

//Rock Obstacle
var Rock = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Rock.png';
};

Rock.prototype = Object.create(MapObject.prototype);
Rock.prototype.constructor = Rock;

//Wall Obstacle
var Wall = function (x, y) {
    MapObject.call(this, x, y);
    this.sprite = 'images/Wall.png';
};

Wall.prototype = Object.create(MapObject.prototype);
Wall.prototype.constructor = Wall;


// Prevent arrow keys from scrolling window so game screen will not move on user input.
window.addEventListener("keydown", function (e) {
    if ([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

// This listens for key presses and sends the keys to your Player.handleInput() method.
document.addEventListener('keyup', function (e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        80: 'p',
        65: 'a',
        68: 'd',
    };
    player.handleInput(allowedKeys[e.keyCode]);
});

//Attack Base Class
var Attack = function () {
    this.x = player.x;
    this.y = player.y;
    this.width = 20;
    this.height = 80;
    this.renderOffsetY = 80;
};

Attack.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y +
        this.renderOffsetY);
};

Attack.prototype.update = function (dt) {
    if (!gamestate.paused) {
        this.x += dt * this.speed * gamestate.speed;
    }
//Sets speed to zero when attack reaches screen edge so that the game knows to remove it
    if (this.x > X_RIGHT || this.x < X_LEFT - X_STEP) {
        this.speed = 0;
    }
};

//Bullet Attack
var Pewpew = function (input) {
    Attack.call(this);
//Left attack
    if (input === 'a') {
        this.speed = -300;
        this.sprite = 'images/circle.png';
//Right attack
    } else if (input === 'd') {
        this.speed = 300;
        this.sprite = 'images/circle.png';
    }
};

Pewpew.prototype = Object.create(Attack.prototype);
Pewpew.prototype.constructor = Pewpew;

Attack.prototype.leftEdge = function () {
    return this.x;
};

Attack.prototype.rightEdge = function () {
    return this.x + this.width;
};

Attack.prototype.topEdge = function () {
    return this.y;
};

Attack.prototype.bottomEdge = function () {
    return this.y + this.height;
};

// Game Dialog/Messages

var deathMessage = "<h>You got caught!</h> <img src='images/caught.jpg' alt='caught'>";

var gameOverMessage = "<h2><p>You died</p><br><h5 " +
    "style='text-style:underline'>Your Stats</h5><p style=" +
    "'text-align:center'>Level: <span id='finalLevel'></span>";

var openingMessage = "<h2>Welcome, Gladiator, to Bug Arena!</h2><div class='text-left'>" +
    "<img src='images/bugman.jpg' alt='chest' height = 160 width = 120>" +
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
