const express = require('express');
const socketio = require('socket.io');

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
var playersPosition = { j1: { x: 20, y: 250 }, j2: { x: 20, y: 250 } };
var playerWidth = 10;
var playerHeight = 100;

io.on('connection', client => {
    init(client);
    let interval = setInterval(() => {
        ballPosition.x += vitesse.x;
        ballPosition.y += vitesse.y;
        if (ballPosition.y < 0 || ballPosition.y > boardHeight - ballSize) {
            collisionTopBottom();
        }
        if (ballPosition.x < (playersPosition.j1.x + playerWidth) || ballPosition.x > boardWidth - ballSize - (playersPosition.j2.x + playerWidth)) {
            if (vitesse.x > 0) { // vers la droite
                if (ballPosition.y >= playersPosition.j2.y && ballPosition.y <= (playersPosition.j2.y + playerHeight)) {
                    collisionRightLeft();
                } else {
                    vitesse.x = 0;
                    vitesse.y = 0;
                }
            } else { // vers la gauche
                if (ballPosition.y >= playersPosition.j1.y && ballPosition.y <= (playersPosition.j1.y + playerHeight)) {
                    collisionRightLeft();
                } else {
                    vitesse.x = 0;
                    vitesse.y = 0;
                }
            }
        }
        client.emit('ballPosition', ballPosition);
    }, 20);

    client.on('movePlayer', position => {
        let posY = position.slice(0, -2);
        if (client.joueur === 1) {
            playersPosition.j1.y = +posY;
        }
        if (client.joueur === 2) {
            playersPosition.j2.y = +posY;
        }
        client.broadcast.emit('newOpponentPosition', position);
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
    vitesse = { x: 2, y: 2 };
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
