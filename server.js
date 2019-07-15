const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');

var app = express();
app.use(express.static('static'));

var server = app.listen(3000, () => {
    console.log('serveur ecoutant sur le port 3000...')
});
var io = socketio(server);

var p1 = null;
var p2 = null;
var ballSize = 15;
var boardWidth = 1100;
var boardHeight = 600;
var ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
var vitesse = { x: 0, y: 0 };

io.on('connection', client => {
    init(client);
    let interval = setInterval(() => {
        ballPosition.x += vitesse.x; //direction aleatoire plus tard
        ballPosition.y += vitesse.y;

        if (ballPosition.y > 0) {
            client.emit('ballPosition', ballPosition);
        } else {
            collisionTopBottom();
        }
        if (ballPosition.y < 600 - ballSize) {
            client.emit('ballPosition', ballPosition);
        } else {
            collisionTopBottom();
        }
    }, 20);

    client.on('movePlayer', position => {
        console.log(position)
    });

    client.on('disconnect', () => {
        if (client.player === 1) {
            p1 = null;
        }
        if (client.player === 2) {
            p2 = null;
        }
    });

});

function collisionTopBottom() {
    vitesse.y = vitesse.y * (-1);
}

function collisionRightLeft() {
    vitesse.x = vitesse.x * (-1);
}

function init(client) {
    vitesse = { x: 1.2, y: -0.8 };
    if (!p1) {
        p1 = { id: client.id, joueur: 1 }
        client.player = 1;
        io.to(client.id).emit('setJoueur', p1);
    } else if (!p2) {
        p2 = { id: client.id, joueur: 2 }
        client.player = 2;
        io.to(client.id).emit('setJoueur', p2);
    } else {
        io.to(client.id).emit('setJoueur', null);
    }
}
