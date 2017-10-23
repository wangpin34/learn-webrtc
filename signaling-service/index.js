'use strict';
const os = require('os');
const nodeStatic = require('node-static');
const http = require('http');
const socketIO = require('socket.io');

const PORT = 8080;
const rooms = {};
const maxMember = 2;

const fileServer = new(nodeStatic.Server)();
const app = http.createServer((req, res) => {
  fileServer.serve(req, res);
}).listen(PORT);

const io = socketIO.listen(app);

//Emit room change event 
const updateRoom = (roomName, value) => {
  rooms[roomName] = value;
  console.log(`Emit room(${roomName}) change event`)
  io.sockets.in(roomName).emit('room-change', value);  
}

io.sockets.on('connection', socket => {

  const log = () => {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('create-or-join', (roomName, clientID) => {

    console.log(`Income ClientID : ${clientID}`);
    
    let room;

    //Create room if non-exists
    if(!rooms[roomName]){
      console.log(`Trying to create a new room ${roomName}`);
      room = rooms[roomName] = [];
    }else{
      room = rooms[roomName];
    }

    //Support two users in a room
    if(room.length > maxMember){
      console.log(`${roomName} is full`);
      socket.emit('room-full', roomName);
      return;
    }

    //Add client to room if he/she is not in room(For refresh, it's may be already in room)
    if(!room.find(client => client.id === clientID)){
      console.log('Trying to add client to room');
      let client = { id: clientID };
      room.push(client);
      updateRoom(roomName, room);
      console.log(`Init chair in room ${roomName} for ${clientID}`);
      console.log(`Roomats number ${room.length}`);
    }else{
      console.log(`Client(${clientID}) is already in room(${roomName})`);
    }

    socket.join(roomName);
    //Emit event that inited
    io.sockets.in(roomName).emit(`client-${clientID}-inited`, clientID);
    io.sockets.in(roomName).emit('room-change', room);  

    console.log(room.map(r => {
      return { id: r.id };
    }));

  });

  //Only fired after join the room
  socket.on('upload-candidate', (roomName, clientID, candidate) => {
    console.log(`Receive candidate info into room(${roomName}) from client(${clientID})`);
    let room =  rooms[roomName];
    let myself = room.find((client) => {
        return client.id === clientID;
    });

    myself.candidate = candidate;

    updateRoom(roomName, room);

  })

  socket.on('upload-desc', (roomName, clientID, desc) => {
    console.log(`Receive desc info into room(${roomName}) from client(${clientID})`);
    let room = rooms[roomName];
    let myself = room.find((client) => {
        return client.id === clientID;
    });

    myself.desc = desc;

    updateRoom(roomName, room);
  })

  socket.on('upload-answer', (roomName, clientID, desc) => {
    console.log(`Receive answer into room(${roomName}) from client(${clientID})`);
    let room = rooms[roomName];
    let myself = room.find((client) => {
        return client.id === clientID;
    });

    myself.desc = desc;

    io.sockets.in(roomName).emit(`answer`, room);
  })

})
