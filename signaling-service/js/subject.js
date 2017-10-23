'use strict';

//window.room = prompt("Enter room name:");

var room = 'f';
var clientID = 'subject';
var dataChannel = null;
var pictureChannel = null;
var localConnection = null;
var localStream = null;
var socket = io.connect();
var connectBtn = document.getElementById('connectBtn');

if (room !== '') {
  console.log('Asking to join room ' + room);
  socket.emit('create-or-join', room, clientID);
}


socket.on(`client-${clientID}-inited`, function(){
  console.log(`Joined to room(${room})`);
//   connectBtn.disabled = false;
//   var handleConnect = function(){
//       createConnection();
//       connectBtn.disabled = true;
//       connectBtn.innerText = '连接中';
//       connectBtn.removeEventListener('click', handleConnect);
//   }
//   connectBtn.addEventListener('click', handleConnect);

  createConnection();
})

socket.on('full', function(roomName) {
  if(room === roomName){
    console.log(`Room(${room} is full)`);
  }
})

function snap(e) {
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

function createConnection(){

    var candidateFired = false;
    localConnection = createPeerConnection();
    updateConnState(localConnection.iceConnectionState);
    localConnection.oniceconnectionstatechange = function(e){
        console.log('iceConnection state: %s',localConnection.iceConnectionState);
        updateConnState(localConnection.iceConnectionState);
        if(localConnection.iceConnectionState === 'disconnected'){
            localConnection.close();
        }

        if(localConnection.iceConnectionState === 'connected'){
          connectBtn.innerText = '已连接';
        }
    }
    localConnection.onsignalingstatechange = function(e){
        console.log('signaling state: %s', localConnection.signalingState);
        updateSignalingState(localConnection.signalingState);
    }
    localConnection.onicecandidate = function(event){
        //http://stackoverflow.com/questions/27926984/webrtc-onicecandidate-fires-21-times-is-it-ok
        if(candidateFired) return;
        if(event.candidate){
            console.log(event.candidate.candidate);
            candidateFired = true;
            socket.emit('upload-candidate', room, clientID, event.candidate);
        }
    };
    function initDataChannel() {
        dataChannel = createDataChannel(localConnection, 'dataChannel', function onopen(){
            if(this.readyState === "open") {
                console.log('Local channel is opened');
            }
        }, function onclose(){
            console.log('Local channel is closed');
        });

        dataChannel.onmessage = function(message){
            var data =  JSON.parse(message.data);
            var content = data.content;
            console.log('Received message: ' + content);
            handleMsg(content);
        }
    }

    function initPictureChannel(){
        pictureChannel = createDataChannel(localConnection, 'pictureChannel', function onopen(){
            if(this.readyState === "open") {
                console.log('Local channel is opened');
            }
        }, function onclose(){
            console.log('Local channel is closed');
        });

        var imageData = '';
        pictureChannel.onmessage = function(result){
            imageData += result.data;
            //Paint the whole image data till reach the end '\n'
            if(result.data === '\n'){
                handlePicture(imageData);
                imageData = '';
            }
        }
    }

    initDataChannel();
    //initPictureChannel();

    createOffer(localConnection).then(function(desc){
        localConnection.setLocalDescription(desc).then(
            function() {
                socket.emit('upload-desc', room, clientID, desc);
                console.info('PC1 set local desc successfully.');
            },
            function() {
                console.error('PC1 set local desc failed.');
            }
        );
    })


    var isDescInited = false;
    var isCanInited = false;

    socket.on('answer', function(room){
      var friend = room.find(function(man){
        return man.id != clientID;
      })

      if(friend && friend.desc && !isDescInited){
        isDescInited = true;

        localConnection.setRemoteDescription(friend.desc).then(function(){
            console.log('Set remote desc successfully');
        }, function(err){
          console.error('Set remote desc failed');
          console.error(err);
          friendInited = false;
        })

      }

      if(friend && friend.candidate) {
        isCanInited = true;
        localConnection.addIceCandidate(new RTCIceCandidate(friend.candidate)).then(function(){
          console.log('Set remote candidate successfully');
        }, function(err){
          console.error('Set remote candidate failed');
          console.error(err);
          friendInited = false;
        })
      }
    })

}


function sendPicture(imageElement){
    if(!(imageElement instanceof HTMLElement)){
        throw new Error('Please provide a valid image element');
    }

    /**
     * Make an image that has original size
     */
    var originImage = new Image();
    originImage.src = imageElement.src;
    originImage.onload = function(){

        if(pictureChannel && pictureChannel.readyState === 'open'){
            var canvas = document.createElement('canvas');
            canvas.width = originImage.clientWidth || originImage.width;
            canvas.height = originImage.clientHeight || originImage.height;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(originImage, 0, 0, canvas.width, canvas.height);
            var dataURL = canvas.toDataURL("image/png");

            /**
             * Send mini chunks to avoid channel been closed
             * Thanks to: http://stackoverflow.com/questions/21585681/send-image-data-over-rtc-data-channel
             */
            var last = dataURL.length;
            var per = 1000;
            var pieces = [];
            var total = Math.ceil(last/per);
            for(var i = 0; i < total; i++){
                pieces.push(dataURL.slice(i * per, Math.min(last,(i + 1) * per)));
            }
            for(var j = 0; j < pieces.length; j++){
                pictureChannel.send(pieces[j]);
            }

            pictureChannel.send('\n');
        }

    }
}

function sendMsg(msg){
    if(dataChannel && dataChannel.readyState === 'open'){
        dataChannel.send(JSON.stringify({ type: 'message', content: msg }));
    }
}

function getDataURLfromImage(imageElement){
    var canvas = document.createElement('canvas');
    canvas.width = imageElement.clientWidth || imageElement.width;
    canvas.height = imageElement.clientHeight || imageElement.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    var dataURL = canvas.toDataURL("image/png");
    return dataURL;
}

var msgsBox = document.getElementById('msgs');

function handleMsg(msg){
    var element = document.createElement('h7');
    element.innerHTML = msg;
    msgsBox.appendChild(element);
}

function handlePicture(dataURL){
    var element = document.createElement('img');
    element.src = dataURL;
    element.style.width = '100px';
    msgsBox.appendChild(element);
}

function addToHistory(msg){
    msgsBox.innerHTML = msgsBox.innerHTML + msg;
    msgsBox.appendChild(document.createElement('br'));
}

var inputArea = document.getElementById('input');

var waitToSend = {};
var TYPE_TEXT = 'text';
var TYPE_PICTURE = 'picture';
var sendBtn = document.getElementById('send');
sendBtn.addEventListener('click', function(){
    var innerHTML = inputArea.innerHTML;
    var images = document.querySelectorAll('#input img');
    Array.prototype.forEach.call(images, function(image){
        innerHTML = innerHTML.replace(image.outerHTML, '\n');
        sendPicture(image);
    });
    sendMsg(innerHTML);
    addToHistory(inputArea.innerHTML);
    inputArea.innerHTML = '';
})

var dropbox = inputArea;
var imagePicker = document.getElementById('pick-image');

imagePicker.addEventListener('click', function(e){
    hideForm.image.click();
})

hideForm.image.addEventListener('change', function(e){
    handleFiles(e.target.files);
})

var handleFiles = function(files) {
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fr = new FileReader();
        fr.readAsDataURL(file);

        fr.onload = function(e) {
            var img = document.createElement("img");
            img.src = e.target.result;
            img.style.width = '100px';
            inputArea.appendChild(img);
        }
    }
}

dropbox.addEventListener("dragenter", function(e){
    e.stopPropagation();
    e.preventDefault();
}, false);
dropbox.addEventListener("dragover", function(e){
    e.stopPropagation();
    e.preventDefault();
}, false);
dropbox.addEventListener("drop", function(e){
    e.stopPropagation();
    e.preventDefault();

    handleFiles(e.dataTransfer.files);
}, false);
