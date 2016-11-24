'use strict';

var isInitiator;

window.room = prompt("Enter room name:");

var socket = io.connect();

if (room !== "") {
  console.log('Message from client: Asking to join room ' + room);
  socket.emit('create or join', room);
}

socket.on('created', function(room, clientId) {
  isInitiator = true;
  createConnection();
});

socket.on('full', function(room) {
  console.log('Message from client: Room ' + room + ' is full :^(');
});

socket.on('ipaddr', function(ipaddr) {
  console.log('Message from client: Server IP address is ' + ipaddr);
});

socket.on('joined', function(room, clientId) {
  isInitiator = false;
  createConnection();
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

var sendChannel = null;

function createConnection(){
    var servers = null,
    pcConstraint = null,
    dataConstraint = null,
    localConnection = null,
    dataChannel = null;

    trace('Using SCTP based data channels');
    localConnection = new RTCPeerConnection(servers, pcConstraint);
    localConnection.onicecandidate = function(event){
        if(event.candidate){
            if(isInitiator){
                socket.emit('candidate from creator', event.candidate, room);
                socket.on('about participant', function(data, room){
                    var candidate = data.candidate,
                        desc = data.desc;

                    localConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    localConnection.setRemoteDescription(desc);
                });

            }else{
                socket.emit('candidate from participant', event.candidate, room);
            }
        }
    };


    if(isInitiator){
        localConnection.createOffer().then(function(desc){
            localConnection.setLocalDescription(desc).then(
              function() {
                 socket.emit('desc from creator', desc, room);
                 trace('LocalConnection setLocalDescription complete');
              },
              function() {
                 trace('LocalConnection setLocalDescription failed');
              }
            );
        });
    }else{

        socket.on('about creator', function(data, room){
            var candidate = data.candidate,
                desc = data.desc;

            localConnection.addIceCandidate(new RTCIceCandidate(candidate));
            localConnection.setRemoteDescription(desc);

            localConnection.createAnswer().then(function(desc){
                localConnection.setLocalDescription(desc);
                socket.emit('desc from participant', desc, room);
            });
        });
    }



    trace('Created local peer connection object localConnection');
    dataChannel = localConnection.createDataChannel('dataChannel',
        dataConstraint);
    trace('Created data channel');


}
