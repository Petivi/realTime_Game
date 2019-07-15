const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');

var app = express();

var server = app.listen(3000, () => {
    console.log('serveur ecoutant sur le port 3000...')
});
var io = socketio(server);
