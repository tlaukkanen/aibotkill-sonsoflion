#!/usr/bin/env node
var WebSocketClient = require('websocket').client;
var Game = require('./game.js');
var config = require('./config.json');

var client = new WebSocketClient();
var game;

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        //console.log('Received: ' + JSON.stringify(message));
        if (message.type === 'utf8') {
            if(message.utf8Data!=undefined && message.utf8Data.length>0) {
                var data = JSON.parse(message.utf8Data);
                console.log('received ' + data.type);
                if (data.type === 'gameState') {
                    game.handleGameState(data);
                } else if (data.type === 'gameEnd') {
                    game = null;
                } else if (data.type === 'reply') {
                    console.log('Received: ' + JSON.stringify(message));
                    if(game===undefined) {
                        var info = {botId: data.id};
                        game = new Game(info, sendAction);
                    }
                }
            }
        }
    });
    var sendJoinRequest = function() {
        if (connection.connected) {
			// Send start command
            var teamRequest = { teamId: config.teamId }
            console.log("Sending join request");
            connection.sendUTF(JSON.stringify(teamRequest));
        }
    }
    var sendAction = function(action) {
        if (connection.connected) {
            console.log("Sending action ");
            connection.sendUTF(JSON.stringify(action));
        }
    }

    sendJoinRequest();
});

client.connect(config.server, '');