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
var p1Touched = false;
var p2Touched = false;
var colisiontTop = false;
var vitesseChangement;
var ballSize = 15;
var boardWidth = 1100;
var boardHeight = 600;
var ballPosition;
var initTimeBeforeAcc = 500;
var timeBeforeAcceleraction = initTimeBeforeAcc;
var vitesse = { x: 0, y: 0 };
var playersPosition = { j1: { x: 20, y: 250 }, j2: { x: 20, y: 250 } };
var playerWidth = 10;
var playerHeight = 100;
var gameStarted = false;

io.on('connection', client => {
    init(client);
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
        gameStarted = false;
        resetScore();
        ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
        rdyCheckAndStart(client);
        io.emit('rejouer');
    });

    client.on('newBall', () => {
        gameStarted = false;
        ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
        io.emit('waitingPlayersOff');
        rdyCheckAndStart(client);
    });

    client.on('rdyCheck', () => {
        rdyCheckAndStart(client);
    });
});


function rdyCheckAndStart(client) {
    if (!gameStarted) {
        io.emit('rdyCheck', client.player);
        if (client.player === 1) {
            p1.rdy = true;
        } else if (client.player === 2) {
            p2.rdy = true;
        }
        if (p1.rdy && p2.rdy) {
            gameStarted = true;
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
}

function launchGame(client) {
    initVitesse();
    let interval = setInterval(() => {
        ballPosition.x += vitesse.x;
        ballPosition.y += vitesse.y;
        if ((ballPosition.y < 0 || ballPosition.y > boardHeight - ballSize) && !colisiontTop) {
            colisiontTop = true;
            setTimeout(() => {
                colisiontTop = false;
            }, 100);
            collisionTopBottom();
        }
        if (ballPosition.x < (playersPosition.j1.x + playerWidth) || ballPosition.x > boardWidth - ballSize - (playersPosition.j2.x + playerWidth)) {
            if (vitesse.x > 0 && ballPosition.x > 500) { // vers la droite
                if (ballPosition.y >= playersPosition.j2.y && ballPosition.y <= (playersPosition.j2.y + playerHeight)) {
                    collisionRightLeft('droite');
                } else {
                    p1.score++;
                    io.emit('updateScore', { p1: p1.score, p2: p2.score });
                    clearInterval(interval);
                    if (p1.score >= 5) {
                        io.emit('win', 'Joueur 1 a gagné');
                    } else {
                        io.emit('displayNewBall');
                    }
                }
            } else if (vitesse.x < 0 && ballPosition.x <= 500) { // vers la gauche
                if (ballPosition.y >= playersPosition.j1.y && ballPosition.y <= (playersPosition.j1.y + playerHeight)) {
                    collisionRightLeft('gauche');
                } else {
                    p2.score++;
                    io.emit('updateScore', { p1: p1.score, p2: p2.score });
                    clearInterval(interval);
                    if (p2.score >= 5) {
                        io.emit('win', 'Joueur 2 a gagné');
                    } else {
                        io.emit('displayNewBall');
                    }
                }
            }
        }
        io.emit('ballPosition', ballPosition);
        timeBeforeAcceleraction--;
        if (timeBeforeAcceleraction <= 0) {
            if (vitesse.x < 0) {
                vitesse.x--;
            } else {
                vitesse.x++;
            }
            if (vitesse.y < 0) {
                vitesse.y--;
            } else {
                vitesse.y++;
            }
            timeBeforeAcceleraction = initTimeBeforeAcc;
        }
    }, 20);
}

function resetScore() {
    p1.score = 0;
    p2.score = 0;
    io.emit('updateScore', { p1: p1.score, p2: p2.score });
}

function collisionTopBottom() {
    vitesse.y = vitesse.y * (-1);
}

function collisionRightLeft(direction) {
    if (direction === 'gauche') {
        console.log('position touchée j1 ----------------------------------------------------------: ' + (ballPosition.y - playersPosition.j1.y));
        console.log('vitesse x avant : ' + vitesse.x);
        console.log('vitesse y avant : ' + vitesse.y);
    }
    if (direction === 'droite') {
        console.log('position touchée j2 -----------------------------------------------------------: ' + (ballPosition.y - playersPosition.j2.y));
        console.log('vitesse x avant : ' + vitesse.x);
        console.log('vitesse y avant : ' + vitesse.y);
    }
    vitesse.x = vitesse.x * (-1);
    let posTouched;
    if (direction === 'gauche' && vitesse.x > 0 && !p1Touched) {
        p1Touched = true;
        setTimeout(() => {
            p1Touched = false;
        }, 500);
        posTouched = ballPosition.y - playersPosition.j1.y;
        if (vitesse.y < 0) { // balle monte
            console.log('balle monte')
            if (posTouched < 50) {
                vitesseChangement = (((posTouched * 2 - 100) * -1) / 100);
                console.log('pose touche < 50')
                vitesse.y -= vitesseChangement;
                vitesse.x -= vitesseChangement;
            } else {
                vitesseChangement = ((posTouched * 2 - 100) / 100);
                console.log('pose touche > 50')
                vitesse.y += vitesseChangement;
                vitesse.x += vitesseChangement;
            }
        } else { //balle descend
            console.log('balle descend')
            if (posTouched < 50) {
                vitesseChangement = (((posTouched * 2 - 100) * -1) / 100);
                console.log('pose touche < 50')
                vitesse.y -= vitesseChangement;
                vitesse.x += vitesseChangement;
            } else {
                console.log('pose touche > 50')
                vitesseChangement = ((posTouched * 2 - 100) / 100);
                vitesse.y += vitesseChangement;
                vitesse.x -= vitesseChangement;
            }
        }
        if (vitesse.x < 2) {
            console.log('x < 2')
            vitesse.x = Math.random() * (6 - 2) + 2;
            console.log(vitesse.x)
            let newRes = Math.floor(Math.random() * (2 - 1 + 1) + 1);
            vitesse.y = newRes === 1 ? 6 - vitesse.x : vitesse.x - 6;
        }
    } else if (vitesse.x < 0 && direction === 'droite' && !p2Touched) {
        p2Touched = true;
        setTimeout(() => {
            p2Touched = false;
        }, 500);
        posTouched = ballPosition.y - playersPosition.j2.y;
        if (vitesse.y < 0) {//balle monte
            console.log('balle monte')
            if (posTouched < 50) {
                vitesseChangement = (((posTouched * 2 - 100) * -1) / 100);
                console.log('balle < 50')
                vitesse.y -= vitesseChangement;
                vitesse.x += vitesseChangement;
            } else {
                vitesseChangement = ((posTouched * 2 - 100) / 100);
                console.log('balle > 50')
                vitesse.y += vitesseChangement;
                vitesse.x += vitesseChangement;
            }
        } else { //balle descend
            console.log('balle descend')
            if (posTouched < 50) {
                vitesseChangement = (((posTouched * 2 - 100) * -1) / 100);
                console.log('balle < 50')
                vitesse.y -= vitesseChangement;
                vitesse.x -= vitesseChangement;
            } else {
                vitesseChangement = ((posTouched * 2 - 100) / 100);
                console.log('balle > 50')
                vitesse.y += vitesseChangement;
                vitesse.x += vitesseChangement;
            }
        }
        if (vitesse.x > -2) {
            vitesse.x = Math.random() * (6 - 2) + 2;
            let newRes = Math.floor(Math.random() * (2 - 1 + 1) + 1);
            vitesse.y = newRes === 1 ? 6 - vitesse.x : vitesse.x - 6;
        }
    }
    console.log('vitesse change: ' + vitesseChangement)
    console.log('vitesse x après : ' + vitesse.x);
    console.log('vitesse y après : ' + vitesse.y);
}

function init(client) {
    ballPosition = { x: (boardWidth / 2) - (ballSize / 2), y: (boardHeight / 2) - (ballSize / 2) };
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

function initVitesse() {
    let res = Math.floor(Math.random() * (2 - 1 + 1) + 1);
    if (res === 1) {
        vitesse.x = Math.random() * (5 - 1) + 1;
        let newRes = Math.floor(Math.random() * (2 - 1 + 1) + 1);
        vitesse.y = newRes === 1 ? 6 - vitesse.x : vitesse.x - 6;
    } else {
        vitesse.x = Math.random() * (-5 - 1) - 1;
        let newRes = Math.floor(Math.random() * (2 - 1 + 1) + 1);
        vitesse.y = newRes === 1 ? 6 - (vitesse.x * -1) : (vitesse.x * -1) - 6;
    }
}
