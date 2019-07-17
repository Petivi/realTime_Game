const express = require('express');
const socketio = require('socket.io');

var app = express();
app.use(express.static('static'));

// var server = app.listen(3000, '25.64.228.167', () => {
var server = app.listen(3000, '127.0.0.1', () => {
    console.log('serveur ecoutant sur le port 3000...');
});
var io = socketio(server);

var p1 = null;
var p2 = null;
var ballSize = 15;
var boardWidth = 1100;
var boardHeight = 600;
var ballPosition;
var vitesse = { x: 0, y: 0 };
var playersPosition = { j1: { x: 20, y: 250 }, j2: { x: 20, y: 250 } };
var playerWidth = 10;
var playerHeight = 100;

io.on('connection', client => {
    init(client);
    // launchGame(client);
    client.on('movePlayer', position => {
        let posY = position.slice(0, -2);
        if (client.player === 1) {
            playersPosition.j1.y = +posY;
        }
        if (client.player === 2) {
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

    client.on('rejouer', () => {
      resetScore();
      vitesse = { x: 3, y: 3 };
      ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
      rdyCheckAndStart(client);
      io.emit('rejouer');
    });

    client.on('newBall', () => {
      vitesse = { x: 3, y: 3 };
      ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
      io.emit('waitingPlayersOff');
      rdyCheckAndStart(client);
    });

    client.on('rdyCheck', () => {
      rdyCheckAndStart(client);
    });
});


function rdyCheckAndStart(client){
  io.emit('rdyCheck', client.player);
  if(client.player === 1){
    p1.rdy = true;
  }else if (client.player === 2) {
    p2.rdy = true;
  }
  if(p1.rdy && p2.rdy){
    /****************/
    let seconde = 3;
    io.emit('getReady', seconde);
    let getReadyInterval = setInterval(() => {
      seconde--;
      if (seconde > 0) {
        io.emit('getReady', seconde);
      } else {
        clearInterval(getReadyInterval);
        io.emit('startGame');
        launchGame(client);
      }
    }, 1000);
    /**********************/
  }
}

function launchGame(client) {
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
                    p1.score++;
                    io.emit('updateScore', {p1: p1.score, p2: p2.score});
                    clearInterval(interval);
                    if(p1.score >= 5){
                      io.emit('win', 'Joueur 1 a gagné');
                    }else {
                      io.emit('displayNewBall');
                    }
                }
            } else { // vers la gauche
                if (ballPosition.y >= playersPosition.j1.y && ballPosition.y <= (playersPosition.j1.y + playerHeight)) {
                    collisionRightLeft();
                } else {
                    p2.score++;
                    io.emit('updateScore', {p1: p1.score, p2: p2.score});
                    clearInterval(interval);
                    if (p2.score >= 5) {
                      io.emit('win', 'Joueur 2 a gagné');
                    }else {
                      io.emit('displayNewBall');
                    }
                }
            }
        }
        io.emit('ballPosition', ballPosition);
    }, 20);
}

function resetScore(){
  p1.score = 0;
  p2.score = 0;
  io.emit('updateScore', {p1: p1.score, p2: p2.score});
}

function collisionTopBottom() {
    vitesse.y = vitesse.y * (-1);
}

function collisionRightLeft() {
    vitesse.x = vitesse.x * (-1);
}

function init(client) {
    ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
    vitesse = { x: 3, y: 3 };
    if (!p1) {
        p1 = { id: client.id, joueur: 1, rdy: false, score: 0 }
        client.player = 1;
        io.to(client.id).emit('setJoueur', p1);
        io.emit('waitingPlayers');
    } else if (!p2) {
        p2 = { id: client.id, joueur: 2, rdy: false, score: 0 }
        client.player = 2;
        io.to(client.id).emit('setJoueur', p2);
        io.emit('waitingPlayersOff');
    } else {
        io.to(client.id).emit('setJoueur', null);
    }
}
