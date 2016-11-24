'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var rooms = {};

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var numClients = io.sockets.sockets.length;

    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 1) {
      rooms[room] = { creator: {}};
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room, JSON.stringify(rooms[room]));
      socket.emit('created', room, socket.id);
  } else if (numClients === 2) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
      io.sockets.in(room).emit('about creator', rooms[room].creator, room);
      rooms[room].participant = {};
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('candidate from creator', function(candidate, room){
      log('Receive candidate of creator:n' + candidate + ' room ' + room);
      rooms[room].creator.candidate = candidate;
  });

  socket.on('desc from creator', function(desc, room){
      log('Receive desc of creator:\n' + desc + ' room ' + room);
      rooms[room].creator.desc = desc;
  })

  socket.on('candidate from participant', function(candidate, room){
      rooms[room].participant.candidate = candidate;
      log('Receive candidate of participant:n' + candidate + ' room ' + room);
      if(rooms[room].participant.candidate &&　rooms[room].participant.desc){
          io.sockets.in(room).emit('about participant', rooms[room].participant, room);
      }
  });

  socket.on('desc from participant', function(candidate, room){
      rooms[room].participant.desc = desc;
      log('Receive candidate of participant:n' + candidate + ' room ' + room);
      if(rooms[room].participant.candidate &&　rooms[room].participant.desc){
          io.sockets.in(room).emit('about participant', rooms[room].participant, room);
      }
  });


  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
