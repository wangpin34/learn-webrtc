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
  } else if (numClients === 10) {
      let roomMeta = rooms[room];
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
      if(roomMeta){
          roomMeta.participant = {};
          if(roomMeta.creator){
              if(roomMeta.creator.desc){
                  io.sockets.in(room).emit('desc from creator', rooms[room].creator.desc, room);
              }
              if(roomMeta.creator.candidate){
                  io.sockets.in(room).emit('candidate from creator', rooms[room].creator.candidate, room);
              }
          }
      }
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('create', function(room){
      log('Received request to create room ' + room);
      rooms[room] = { creator: {}};
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room, JSON.stringify(rooms[room]));
      socket.emit('created', room, socket.id);
  });

  socket.on('join', function(room){
      var numClients = io.sockets.sockets.length;
      log('Room ' + room + ' now has ' + numClients + ' client(s)');
      if (numClients <= 10) {
          let roomMeta = rooms[room];
          log('Client ID ' + socket.id + ' joined room ' + room);
          io.sockets.in(room).emit('join', room);
          socket.join(room);
          socket.emit('joined', room, socket.id);
          io.sockets.in(room).emit('ready');
          if(roomMeta){
              roomMeta.participant = {};
              if(roomMeta.creator){
                  console.log(JSON.stringify(roomMeta.creator, null, 4));
                  if(roomMeta.creator.desc){
                      io.sockets.in(room).emit('desc from creator', rooms[room].creator.desc, room);
                  }
                  if(roomMeta.creator.candidate){
                      io.sockets.in(room).emit('candidate from creator', rooms[room].creator.candidate, room);
                  }
              }
          }
      }else{
          socket.emit('full', room);
      }
  })

  socket.on('candidate from creator', function(candidate, room){
      //log('Receive candidate of creator:' + JSON.stringify(candidate, null, 4) + ' room ' + room);
      rooms[room].creator.candidate = candidate;
  });

  socket.on('desc from creator', function(desc, room){
      //log('Receive desc of creator:\n' + JSON.stringify(desc, null, 4) + ' room ' + room);
      rooms[room].creator.desc = desc;
  })

  socket.on('candidate from participant', function(candidate, room){
      rooms[room].participant.candidate = candidate;
      //log('Receive candidate of participant:n' + candidate + ' room ' + room);
      io.sockets.in(room).emit('candidate from participant', candidate, room);
  });

  socket.on('desc from participant', function(desc, room){
      rooms[room].participant.desc = desc;
      //log('Receive desc of participant:' + desc + ' room ' + room)
      io.sockets.in(room).emit('desc from participant', desc, room);
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
