const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');

var app = express();
app.use(express.static('static'));

var server = app.listen(3000, () => {
    console.log('serveur ecoutant sur le port 3000...')
});
var io = socketio(server);


var boardWidth = 1100;
var boardHeight = 600;
var ballPosition = { 'x': boardWidth / 2, 'y': boardHeight / 2 };

io.on('connection', client => {
    client.emit('ballPosition', ballPosition);





});
