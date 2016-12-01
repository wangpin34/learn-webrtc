'use strict';

var isInitiator;

//window.room = prompt("Enter room name:");

var room = 'f';
var sendChannel = null;
var localConnection = null;
var localStream = null;
var videoDiv = document.querySelector('#videoCanvas');
var buttonsDiv = document.querySelector('#buttons');
var incomingDiv = document.querySelector('#incoming');
var videoElement = document.getElementById('camera');
var photoCanvas = document.getElementById('photo');
var photoCanvasCtx = photoCanvas.getContext('2d');
var photoDataURI = null;
var snapBtn = document.getElementById('snap');
var sendBtn = document.getElementById('send');
var socket = io.connect();

if (room !== "") {
  console.log('Message from client: Asking to join room ' + room);
  socket.emit('create or join', room);
}

socket.on('created', function(room, clientId) {
  isInitiator = true;
  incomingDiv.parentElement.removeChild(incomingDiv);
  startVideo();
});

socket.on('full', function(room) {
  console.log('Message from client: Room ' + room + ' is full :^(');
});

socket.on('ipaddr', function(ipaddr) {
  console.log('Message from client: Server IP address is ' + ipaddr);
});

socket.on('joined', function(room, clientId) {
  isInitiator = false;
  sendBtn.innerText = 'Join';
  videoDiv.parentElement.removeChild(videoDiv);
  buttonsDiv.removeChild(snapBtn);
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

    return new Promise((resolve, reject) => {

    if(localConnection){
        resolve();
    }
    var iceServer = {
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

    trace('Using SCTP based data channels');
    localConnection = new RTCPeerConnection(iceServer);
    localConnection.onicecandidate = function(event){
        console.log('onicecandidate is fired!!!')
        if(event.candidate){
            if(isInitiator){
                socket.emit('candidate from creator', event.candidate, room);
            }else{
                socket.emit('candidate from participant', event.candidate, room);
            }
        }
    };

    if(isInitiator){
        //localConnection.addStream(localStream);
        localConnection.createOffer(offerOptions).then(function(desc){
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

        socket.on('desc from participant', (desc, room) => {
            console.log('Receive desc from participant and then set as RemoteDescription');
            localConnection.setRemoteDescription(desc);
        });

        socket.on('candidate from participant', (candidate, room) =>{
            console.log('Receive candidate from participant')
            localConnection.addIceCandidate(new RTCIceCandidate(candidate));
            //localConnection.addStream(localStream);
            sendChannel = localConnection.createDataChannel('sendDataChannel',
                dataConstraint);

            sendChannel.onopen = function onSendChannelStateChange(){
                 trace('Local channel is opened');
                 resolve();
             };
            sendChannel.onclose = function onSendChannelStateChange(){
                sendBtn.disabled = true;
                trace('Local channel is closed');
            };
        });

    }else{
        localConnection.onaddstream = function(e){
            if(window.URL){
                videoElement.src = window.URL.createObjectURL(e.stream);
            }else{
                videoElement.srcObject = e.stream;
            }
        };

        localConnection.ondatachannel = function receiveChannelCallback(event){
            var channel = event.channel;
            channel.onmessage = function(message){
                incomingDiv.appendChild(drawImageFromDataURI(message.data))
            }

            channel.onclose = function(){
                 trace('Remote channel is closed');
            }
        };

        socket.on('desc from creator', function(desc, room){
            console.log('Receive desc from creator and then set as RemoteDescription ');
            localConnection.setRemoteDescription(desc);
            localConnection.createAnswer().then(function(desc){
                localConnection.setLocalDescription(desc);
                socket.emit('desc from participant', desc, room);
            });
        });
        socket.on('candidate from creator', (candidate, room) => {
            console.log('Receive candidate from creator');
            localConnection.addIceCandidate(new RTCIceCandidate(candidate));
        })
    }

    })
}

const sendImg = () => {
    if(photoDataURI && sendChannel){
        sendChannel.send(photoDataURI);
    }
}

snapBtn.addEventListener('click', snap);
sendBtn.addEventListener('click', () => {
    createConnection().then(sendImg).catch((e) => {
        console.error(e);
    });
});
