'use strict';

//window.room = prompt("Enter room name:");

var room = 'f';
var sendChannel = null;
var sendPictureChannel = null;
var localConnection = null;
var localStream = null;
var videoDiv = document.querySelector('#videoCanvas');
var buttonsDiv = document.querySelector('#buttons');
var videoElement = document.getElementById('camera');
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

function startVideo() {
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
    var canvas = document.createElement('canvas');
    canvas.width = videoElement.clientWidth;
    canvas.height = videoElement.clientHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    var dataURL = canvas.toDataURL('image/png');

    var targetImage = document.querySelector('img[name=captured]');
    targetImage.width = videoElement.clientWidth;
    targetImage.height = videoElement.clientHeight;
    targetImage.src = dataURL;
}

const createConnection = () => {

    var candidateFired = false;
    localConnection = createPeerConnection();
    localConnection.oniceconnectionstatechange = function(e){
        console.log('iceConnection state: %s',localConnection.iceConnectionState);
        if(localConnection.iceConnectionState === 'disconnected'){
            localConnection.close();
            createConnection();
        }
    }
    localConnection.onsignalingstatechange = function(e){
        console.log('signaling state: %s',localConnection.iceConnectionState);
    }
    localConnection.onicecandidate = function(event){
        //http://stackoverflow.com/questions/27926984/webrtc-onicecandidate-fires-21-times-is-it-ok
        if(candidateFired) return;
        if(event.candidate && isInnerCandidate(event.candidate.candidate)){
            console.log(event.candidate.candidate);
            candidateFired = true;
            socket.emit('candidate from creator', event.candidate, room);
        }
    };
    function initDataChannel() {
        sendChannel = createDataChannel(localConnection, 'sendMsgChannel', function onopen(){
            if(this.readyState === "open") {
                clientLog('Local channel is opened');
            }
        }, function onclose(){
            clientLog('Local channel is closed');
        });
    }

    function initPictureChannel(){
        sendPictureChannel = createDataChannel(localConnection, 'sendPictureChannel', function onopen(){
            if(this.readyState === "open") {
                clientLog('Local channel is opened');
            }
        }, function onclose(){
            clientLog('Local channel is closed');
        });
    }

    initDataChannel();
    initPictureChannel();
    
    //The offer should be created after init data channel, or data channel will not be opened. ???
    createOffer(localConnection).then(function(desc){
        localConnection.setLocalDescription(desc).then(
            function() {
                socket.emit('desc from creator', desc, room);
                clientLog('LocalConnection setLocalDescription complete');
            },
            function() {
                clientLog('LocalConnection setLocalDescription failed');
            }
        );
    })

    socket.on('desc from participant', (desc, room) => {
        clientLog('Receive desc from participant and then set as RemoteDescription');
        localConnection.setRemoteDescription(desc).then(() => {
            clientLog('Set remote desc successfully');
        }, (err) => {
            clientLog(err, 'error');
        });
    });

    socket.on('candidate from participant', (candidate, room) => {
        clientLog('Receive candidate from participant')
        localConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
                clientLog('Add candidate successfully');
            }, err => {
                clientLog(err, 'error');
            });
    });

}


function sendPicture(imageElement){
    if(!(imageElement instanceof HTMLElement)){
        throw new Error('Please provide a valid image element');
    }
    if(sendPictureChannel && sendPictureChannel.readyState === 'open'){
        var canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(imageElement, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        sendPictureChannel.send(dataURL);
        sendPictureChannel.send('\n');
    }
}

function sendMsg(msg){
    if(sendChannel && sendChannel.readyState === 'open'){
        sendChannel.send(JSON.stringify({ type: 'message', content: msg }));
    }
}

snapBtn.addEventListener('click', snap);
sendBtn.addEventListener('click', function(){
    sendPicture(document.querySelector('img[name=captured]'));
});
document.getElementById('sendPicture').addEventListener('click', function(){
    var chatbox = document.querySelector('#chatbox');
    sendMsg(chatbox.value);
    chatbox.value = '';
});
