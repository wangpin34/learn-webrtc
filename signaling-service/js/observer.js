'use strict';
var room = 'f';
var clientID = 'observer';
var socket = io.connect();
var localConnection = null;
var trail = document.querySelector('#trail');

if (room !== "") {
  clientLog('Asking to join room ' + room);
  socket.emit('create-or-join', room, clientID);
}

socket.on('inited', function(room, clientId){
  console.log('Joined to room');
  createConnection();
})

socket.on('full', function(room){
  clientLog('Message from client: Room ' + room + ' is full :^(');
})

var dataChannel = null;
var pictureChannel = null;

function createConnection(){

    localConnection = createPeerConnection();
    localConnection.onopen = function(e){
        clientLog('peerconnection is opened.');
    }
    localConnection.oniceconnectionstatechange = function(e){
        console.log('iceConnection state: %s',localConnection.iceConnectionState);
        if(localConnection.iceConnectionState === 'disconnected'){
            localConnection.close();
            createConnection();
        }
    }
    localConnection.onicecandidate = function(event){
        clientLog('onicecandidate is fired!!!');
        if(event.candidate){
            socket.emit('upload-candidate', room, clientID, event.candidate);
        }
    };

    localConnection.ondatachannel = function receiveChannelCallback(event){
        clientLog('Get a channel from remote');
        var channel = event.channel;
        var label = channel.label;

        if(label === 'pictureChannel'){
            pictureChannel = channel;
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

        if(label === 'dataChannel'){
            dataChannel = channel;
            channel.onmessage = function(result){
                handleMsg(result.data);
            }
        }

        channel.onclose = function(){
             clientLog('Remote channel is closed');
        }
    };

    socket.on('got-hoster-info', function(hoster){
      console.log('Received hoster info');
      localConnection.setRemoteDescription(hoster.desc);
      localConnection.createAnswer().then(function(desc){
          localConnection.setLocalDescription(desc);
          socket.emit('upload-desc', room, clientID, desc);
      });
      localConnection.addIceCandidate(new RTCIceCandidate(hoster.candidate));
    })

    socket.on('desc from creator', function(desc, room){
        localConnection.setRemoteDescription(desc);
        localConnection.createAnswer().then(function(desc){
            localConnection.setLocalDescription(desc);
            socket.emit('upload-desc', room, clientID, desc);
        });
    });
    socket.on('candidate from creator', (candidate, room) => {
        localConnection.addIceCandidate(new RTCIceCandidate(candidate));
    })
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
