'use strict';

const os = require('os');
const nodeStatic = require('node-static');
const http = require('http');
const socketIO = require('socket.io');

const fileServer = new(nodeStatic.Server)();
const app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

const rooms = {};

const io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('create-or-join', function(roomName, clientID) {
    let room;
    if(!rooms[roomName]){
      rooms[roomName] = [];
      room = rooms[roomName];
    }else{
      room = rooms[roomName];
    }
    let roomatesNum = room.length;
    console.log(`ClientID : ${clientID}`);
    if(roomatesNum.length > 1){
      socket.emit('full', roomName);
      return;
    }else{
      //Add the client to room
      if(!room.find(function(client){
        return client.id === clientID;
      })){
        room.push({ id: clientID });
        socket.join(roomName);
        console.log(`Init chair in room ${roomName} for ${clientID}`);
        console.log(`Roomats number ${room.length}`);
      }

      io.sockets.in(roomName).emit('inited', clientID);
      if(room.length > 1){
        console.log('Send hoster info to new joiner');
        let hoster = room[0];
        io.sockets.in(roomName).emit('got-hoster-info', hoster);
      }
    }
  });

  //Only fired after join the room
  socket.on('upload-candidate', function(roomName, clientID, candidate){
    let room = rooms[roomName];
    let myself = room.filter(function(client){
        return client.id === clientID;
    })[0];

    myself.candidate = candidate;

    io.sockets.in(roomName).emit('new-roomate', clientID, myself);
  })

  socket.on('upload-desc', function(roomName, clientID, desc){
    let room = rooms[roomName];
    let myself = room.filter(function(client){
        return client.id === clientID;
    })[0];

    myself.desc = desc;
    io.sockets.in(roomName).emit('new-roomate', clientID, myself);
  })

  socket.on('fetch-others-info', function(roomName){
    let clientID = socket.id;
    let room = rooms[roomName];
    let friends = room.filter(function(client){
        return client.id !== clientID;
    });

    io.sockets.in(roomName).emit('fetched-others-info', roomName, friends);
  })

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
