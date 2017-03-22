'use strict';
var room = 'f';
var socket = io.connect();
var localConnection = null;
var trail = document.querySelector('#trail');

if (room !== "") {
  clientLog('Asking to join room ' + room);
  socket.emit('join', room);
}

socket.on('joined', function(room, clientId) {
  createConnection();
});

socket.on('full', function(room) {
  clientLog('Message from client: Room ' + room + ' is full :^(');
});

function handleMsg(msg){
    var element = document.createElement('h7');
    element.innerHTML = msg;
    trail.appendChild(element);
}

function handlePicture(dataURL){
    var element = document.createElement('img');
    element.src = dataURL;
    trail.appendChild(element);
}

const createConnection = () => {
    var servers = {
            "iceServers": [{
                "url": "stun:stun.l.google.com:19302"
            }]
        },
        pcConstraint = null,
        dataConstraint = null;

    localConnection = createPeerConnection();
    localConnection.onopen = function(e){
        clientLog('peerconnection is opened.');
    }
    localConnection.onicecandidate = function(event){
        clientLog('onicecandidate is fired!!!');
        if(event.candidate){
            socket.emit('candidate from participant', event.candidate, room);
        }
    };

    localConnection.ondatachannel = function receiveChannelCallback(event){
        clientLog('Get a channel from remote');
        var channel = event.channel;
        var label = channel.label;

        if(label === 'sendPictureChannel'){
            var imageData = '';
            channel.onmessage = function(result){
                imageData += result.data;
                //Paint the whole image data till reach the end '\n'
                if(result.data === '\n'){
                    handlePicture(imageData);
                    imageData = ''; 
                }
            }
        }

        if(label === 'sendMsgChannel'){
            channel.onmessage = function(result){
                handleMsg(result.data);
            }
        }

        channel.onclose = function(){
             clientLog('Remote channel is closed');
        }
    };

    socket.on('desc from creator', function(desc, room){
        clientLog('Receive desc from creator');
        localConnection.setRemoteDescription(desc);
        localConnection.createAnswer().then(function(desc){
            localConnection.setLocalDescription(desc);
            socket.emit('desc from participant', desc, room);
        });
    });
    socket.on('candidate from creator', (candidate, room) => {
        clientLog('Receive candidate from creator');
        localConnection.addIceCandidate(new RTCIceCandidate(candidate));
    })
}
