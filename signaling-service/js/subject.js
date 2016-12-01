'use strict';

//window.room = prompt("Enter room name:");

var room = 'f';
var sendChannel = null;
var localConnection = null;
var localStream = null;
var videoDiv = document.querySelector('#videoCanvas');
var buttonsDiv = document.querySelector('#buttons');
var videoElement = document.getElementById('camera');
var photoCanvas = document.getElementById('photo');
var photoCanvasCtx = photoCanvas.getContext('2d');
var photoDataURI = null;
var snapBtn = document.getElementById('snap');
var sendBtn = document.getElementById('send');
var socket = io.connect();

if (room !== "") {
  clientLog('Message from client: Asking to join room ' + room);
  socket.emit('create', room);
}

socket.on('created', function(room, clientId) {
  startVideo();
  createConnection();
});

socket.on('ipaddr', function(ipaddr) {
  clientLog('Message from client: Server IP address is ' + ipaddr);
});

socket.on('log', function(array) {
  array = array.map(function(ele){
      if(typeof ele === 'object'){
          return JSON.stringify(ele, null, 4);
      }
      return ele;
  })
  console.log.apply(console, array);
});

const startVideo = () => {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    })
    .then(stream => {
        if(window.URL){
            videoElement.src = window.URL.createObjectURL(stream);
        }else{
            videoElement.srcObject = stream;
        }
        localStream = stream;
        return stream;
    })
}

const snap = (e) => {
    photoCanvas.width = videoElement.clientWidth;
    photoCanvas.height = videoElement.clientHeight;
    photoCanvasCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    photoDataURI = photoCanvas.toDataURL('image/jpeg');
}

const createConnection = () => {

    var servers = {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }]
    },
    pcConstraint = null,
    dataConstraint = null,
    offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    };

    clientLog('Using SCTP based data channels');
    localConnection = new RTCPeerConnection(servers, pcConstraint);
    localConnection.onicecandidate = function(event){
        clientLog('onicecandidate is fired!!!')
        if(event.candidate){
            socket.emit('candidate from creator', event.candidate, room);
        }
    };

    const createChannel = () => {
        clientLog('Start create data channel');
        sendChannel = localConnection.createDataChannel('sendDataChannel', dataConstraint);
        sendChannel.onopen = function onSendChannelStateChange(){
             if (sendChannel.readyState === "open") {
                clientLog('Local channel is opened');
              }
         };
        sendChannel.onclose = function onSendChannelStateChange(){
            clientLog('Local channel is closed');
        };
    }

    createChannel();

    localConnection.createOffer(offerOptions).then(function(desc){
        localConnection.setLocalDescription(desc).then(
          function() {
             socket.emit('desc from creator', desc, room);
             clientLog('LocalConnection setLocalDescription complete');
          },
          function() {
             clientLog('LocalConnection setLocalDescription failed');
          }
        );
    });



    socket.on('desc from participant', (desc, room) => {
        clientLog('Receive desc from participant and then set as RemoteDescription');
        localConnection.setRemoteDescription(desc).then(() => {
            clientLog('Set remote desc successfully');
        }, (err) => {
            clientLog(err, 'error');
        });
    });

    socket.on('candidate from participant', (candidate, room) =>{
        clientLog('Receive candidate from participant')
        localConnection.addIceCandidate(new RTCIceCandidate(candidate))
                        .then(() => {
                            clientLog('Add candidate successfully');
                        }, err => {
                            clientLog(err, 'error');
                        });

    });

}

const sendImg = () => {
    if(photoDataURI && sendChannel && sendChannel.readyState === 'open'){
        sendChannel.send(photoDataURI);
    }
}

snapBtn.addEventListener('click', snap);
sendBtn.addEventListener('click', sendImg);
