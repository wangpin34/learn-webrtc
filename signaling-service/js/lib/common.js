navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

function drawImgToCanvas(imgElement, canvasElement){
    canvasElement.width = imgElement.width;
    canvasElement.height = imgElement.height;
    canvasElement.getContext('2d').drawImage(imgElement,0,0);
}

function drawImgUrlToCanvas(imgUrl, canvasElement){
    //You don't need to add image to document actually
    var img = new Image();
    img.src = imgUrl;
    img.alt = 'alt text';
    img.onload = function(){
        drawImgToCanvas(img, canvasElement);
    }
}

function getUserMedia(constaints, onSuccess, onError) {
    navigator.getUserMedia(constaints, onSuccess, onError);
}

function trace(arg) {
  var now = (window.performance.now() / 1000).toFixed(3);
  console.log(now + ': ', arg);
}

function drawImageFromDataURI(dataURI){
    if(!dataURI){
        throw 'dataURI is undefined'
    }
    var img = document.createElement('img');
    img.src = dataURI;
    return img;
}

const clientLog = (msg, type = '') => {
    switch(type){
        case 'log': console.log('Message from client: %s', msg); break;
        case 'warn': console.warn('Message from client: %s', msg); break;
        case 'error': console.error('Message from client: %s', msg); break;
        default: console.info('Message from client: %s', msg);
    }
}

function isInnerCandidate(candidate){
  var innerIP = /192.[\d]+.[\d]+.[\d]+/ig;
  return  innerIP.test(candidate);
}

function createPeerConnection(){
    var servers = {
            "iceServers": [{
                "url": "stun:stun.l.google.com:19302"
            }]
        };
    var pcConstraint = null;
    return new RTCPeerConnection(servers, pcConstraint);
}

function createDataChannel(peerConnection, type, onopen, onclose){
  if(!(peerConnection instanceof RTCPeerConnection)){
      throw new Error('PeerConnection is not valid');
  }
  var dataConstraint = null;
  var dataChannel = peerConnection.createDataChannel(type, dataConstraint);
  dataChannel.onopen = onopen;
  dataChannel.onclose = onclose;
  return dataChannel;
}

function createOffer(peerConnection, enableAudio, enableVideo){
  if(!(peerConnection instanceof RTCPeerConnection)){
      throw new Error('PeerConnection is not valid');
  }
  var options = {
      offerToReceiveAudio: typeof enableAudio === 'undefined' ? 1 : enableAudio,
      offerToReceiveVideo: typeof enableVideo === 'undefined' ? 1 : enableVideo
  };
  return peerConnection.createOffer(options);
}

function createAnswer(peerConnection){
  if(!(peerConnection instanceof RTCPeerConnection)){
      throw new Error('PeerConnection is not valid');
  }
  return peerConnection.createAnswer();
}
