module.exports = function Game(info, sendAction)
{
    var Victor = require('victor');

    var botId = info.botId;
    console.log("Game initialized with botId " + botId);

    var currentGameId = "";
    var lastPosition = {};
    var lastVelocity = {};
    var tiles = [];
    var gameArea;
    var enemies = [];
    var steps = 0;
    var areaWidth = 0;
    var areaHeight = 0;
    var start = true;
    var myself;

    var randomMovementSteps = 0;
    var shouldWeMove = 10;

    /*
     {"type":"gameState",
     "timeLeft":10,
     "id":"bc30b02d-ab95-4aa4-aa00-5d612f87bb27",
     "startTime":"0001-01-01T00:00:00Z",
     "timeLimit":10000000000,
     "state":"new",
     "gameArea":[0,0],
     "mode":"",
     "environment":"",
     "tiles":null,
     "players":[{"radius":1,
     "position":{"x":0,"y":0},
     "velocity":{"x":0,"y":0},
     "id":"216a1ad7-888c-411a-bf1a-1379c90b6fa3",
     "botId":"xxx"
     ,"name":"","team":0,
     "lookingAt":{"x":0,"y":0},
     "hitpoints":100,
     "damageMade":0,
     "killed":null,
     "lastFired":"0001-01-01T00:00:00Z",
     "linkdead":false,
     "action":{"type":"","direction":null}},
     {"radius":1,"position":{"x":0,"y":0},"velocity":{"x":0,"y":0},"id":"3bd395b4-e5c2-4929-a6d5-659cb6cec88c","botId":"yyy","name":"","team":0,"lookingAt":{"x":0,"y":0},"hitpoints":100,"damageMade":0,"killed":null,"lastFired":"0001-01-01T00:00:00Z","linkdead":false,"action":{"type":"","direction":null}}],"bullets":null,"collisions":null,"startingPositions":null}
     */
	this.handleGameState = function (state) {
        console.log("GameState: " + JSON.stringify(state));
        if(state.state==="end") {
            // Game over - wait for new one
            start = true;
            return;
        }
        if (state.id!=currentGameId) {
            currentGameId = state.id;
            // Game started (or changed to new game)
            // Do your reset stuff here
            if (state.tiles!==undefined) {
                tiles = state.tiles;
            }
            gameArea = state.gameArea;
            areaWidth = state.gameArea[0];
            areaHeight = state.gameArea[1];
        }

        enemies = [];
        for (var playerIndex in state.players) {
            var player = state.players[playerIndex];
            if (player.botId === botId) {
                //console.log("Found myself");
                // This is ME - I'm self-aware now - don't hurt humans
                lastPosition = player.position;
                lastVelocity = player.velocity;
                myself = player;
            } else {
                // Enemies
                enemies.push(player);
            }
        }

        var bestEnemy = whoIsBestEnemy();

        // Start moving first thing in new game
        if(start) {
            start = false;
            var dir = resolveNewDirection(bestEnemy);
            var action = {type: "move", direction: dir};
            console.log("move action: " + JSON.stringify(action));
            sendAction(action);
            return;
        }

        // If bot is stuck then start moving
        var blockedVector = checkIfBlocked();
        if(blockedVector!=undefined && randomMovementSteps%3==0) {
            var action = {type: "move", direction: blockedVector};
            console.log("move action: " + JSON.stringify(action));
            sendAction(action);
            return;
        }

        if(randomMovementSteps>shouldWeMove) {
            if (tiles!==undefined) {
                var dir = resolveNewDirection(bestEnemy);
                var action = {type: "move", direction: dir};
                console.log("move action: " + JSON.stringify(action));
                sendAction(action);
            }
            randomMovementSteps = 0;
            shouldWeMove = Math.floor(Math.random()*15+10);
        } else {
            if(bestEnemy!==undefined) {
                var enemyVector = getEnemyVector(bestEnemy);
                var distanceToEnemy = enemyVector.length();
                var shootAdvFactor = distanceToEnemy / 5.0;

                var dx = bestEnemy.position.x + (bestEnemy.velocity.x * shootAdvFactor) - lastPosition.x;
                var dy = bestEnemy.position.y + (bestEnemy.velocity.y * shootAdvFactor) - lastPosition.y;

                var shootVector = new Victor(dx,dy);
                var shootDir = shootVector.norm();
                var action = {type: "shoot", direction: shootDir};
                console.log("shoot action: " + JSON.stringify(action));
                sendAction(action);
            }
        }
        randomMovementSteps++;
	}

    function checkIfBlocked() {
        var newPos = new Victor(myself.position.x + myself.velocity.x, myself.position.y + myself.velocity.y);
        var tile = getTile(newPos);
        if(tile>0) {
            var escapeVector = new Victor(myself.velocity.x, myself.velocity.y);
            return escapeVector.rotateDeg(160 + Math.random()*40.0);
        }
        return undefined;
    }

    function getEnemyVector(enemy) {
        var dx = lastPosition.x - enemy.position.x;
        var dy = lastPosition.y - enemy.position.y;
        var enemyVector = new Victor(dx, dy);
        return enemyVector;
    }

    function whoIsBestEnemy() {
        var best = 99999;
        var badGuy = undefined;
        for(var e in enemies) {
            var enemy = enemies[e];
            if(enemy.hitpoints>0 && enemy.team!=myself.team) {

                var tilesBetween = howManyBlocksInBetween(enemy);

                if(tilesBetween<2) {
                    var enemyVector = getEnemyVector(enemy);
                    var distance = enemyVector.length()
                    if (distance < best) {
                        badGuy = enemy;
                        best = distance;
                    }
                }
            }
        }
        return badGuy;
    }

    function getLastTilePosition() {
        var ix = Math.floor(lastPosition.x);
        var iy = Math.floor(lastPosition.y);
        var tileIndex = ix + iy * areaWidth;
        return tileIndex;
    }

    function getTile(pos) {
        var x = Math.floor(pos.x);
        var y = Math.floor(pos.y);
        return tiles[x+y*areaWidth];
    }

    // Define how many blocks there are between our bot and enemy
    function howManyBlocksInBetween(target) {
        var ix = Math.floor(target.position.x);
        var iy = Math.floor(target.position.y);

        var myX = Math.floor(lastPosition.x);
        var myY = Math.floor(lastPosition.y);
        var tmpVec = new Victor(myX, myY);

        var checkVec = new Victor((ix - myX), (iy - myY));
        checkVec = checkVec.normalize();
        tmpVec = tmpVec.add(checkVec);
        var blocks = 0;
        for(var i = 0; i<10; i++){
            var tile = getTile(tmpVec);
            tmpVec = tmpVec.add(checkVec);
            if(tile>0) {
                blocks++;
            }
        }
        return blocks;
    }

    function getVectorBetweenMeAndEnemy(enemy) {
        var dx = lastPosition.x - enemy.position.x;
        var dy = lastPosition.y - enemy.position.y;
        return new Victor(dx, dy);
    }

    // Where should our bot move today
    function resolveNewDirection(enemy) {
        if(enemy!=undefined) {
            // Strafe against worst enemy
            var myVec = new Victor(myself.position.x, myself.position.y);
            var vector = getVectorBetweenMeAndEnemy(enemy);
            var escapeVec = vector.rotateByDeg(75+Math.random()*40);
            escapeVec = myVec.add( escapeVec.normalize() );
            if(getTile(escapeVec)>0) {
                escapeVec = vector.rotateByDeg(-75-Math.random()*40);
                escapeVec = myVec.add( escapeVec.normalize() );
                if(getTile(escapeVec)>0) {
                    escapeVec = vector.rotateByDeg(Math.random()*360.0);
                }
            }
            return escapeVec.normalize();
        }

        if(lastPosition!=undefined && tiles!=undefined) {
            var tile = getLastTilePosition();
            var xFactor = 1.0;
            if(tiles[tile-1]===0) {
                xFactor = 3.0;
            } else if(tiles[tile+1]===0) {
                xFactor = 1.0;
            } else {
                xFactor = 0.0;
            }
            if(lastPosition!=undefined && lastPosition.x>areaWidth/2) {

                if(tile>0) {
                    if(tiles[tile-1]===0) {
                        xFactor = 3.0;
                    } else if(tiles[tile+1]===0) {
                        xFactor = 1.0;
                    } else {
                        xFactor = 0.0;
                    }
                }
            }
            var yFactor = 1.0;
            if(tiles[tile-areaWidth]===0) {
                yFactor = 3.0;
            } else if(tiles[tile+areaWidth]===0) {
                yFactor = 1.0;
            } else {
                yFactor = 0.0;
            }
            if(lastPosition!=undefined && lastPosition.y>areaHeight/2) {
                if(tiles[tile-areaWidth]===0) {
                    yFactor = 3.0;
                } else if(tiles[tile+areaWidth]===0) {
                    yFactor = 1.0;
                } else {
                    yFactor = 0.0;
                }
            }
            var randX = Math.random()*4 - xFactor;
            var randY = Math.random()*4 - yFactor;
            return new Victor(randX, randY);
        } else {
            return new Victor(Math.random()*2.0-1, Math.random()*2.0-1);
        }
    }

}