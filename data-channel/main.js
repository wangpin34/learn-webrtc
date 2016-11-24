var startButton = document.getElementById('startButton');
var sendButton = document.getElementById('sendButton');
var closeButton = document.getElementById('closeButton');
var dataChannelSend = document.getElementById('dataChannelSend');
var dataChannelReceive = document.getElementById('dataChannelReceive');

sendButton.disabled = true;
closeButton.disabled = true;

function createConnection() {
  dataChannelSend.placeholder = '';
  var servers = null;
  pcConstraint = null;
  dataConstraint = null;
  trace('Using SCTP based data channels');
  // For SCTP, reliable and ordered delivery is true by default.
  // Add localConnection to global scope to make it visible
  // from the browser console.
  window.localConnection = localConnection =
      new RTCPeerConnection(servers, pcConstraint);
  trace('Created local peer connection object localConnection');

  sendChannel = localConnection.createDataChannel('sendDataChannel',
      dataConstraint);
  trace('Created send data channel');

  localConnection.onicecandidate = iceCallback1;
  sendChannel.onopen = function onSendChannelStateChange(){
      sendButton.disabled = false;
      dataChannelSend.disabled = false;
      dataChannelReceive.disabled = true;
       trace('Local channel is opened');
   };
  sendChannel.onclose = function onSendChannelStateChange(){
      dataChannelSend.disabled = true;
      dataChannelReceive.disabled = false;
      trace('Local channel is closed');
   };

  // Add remoteConnection to global scope to make it visible
  // from the browser console.
  window.remoteConnection = remoteConnection =
      new RTCPeerConnection(servers, pcConstraint);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = function receiveChannelCallback(event){
      var channel = event.channel;
      channel.onmessage = function(message){
          var data = message.data;
          dataChannelReceive.value = data;
      }

      channel.onclose = function(){
           trace('Remote channel is closed');
      }
  };

  // remoteChannel = remoteConnection.createDataChannel('receiveDataChannel', dataConstraint)
  // remoteChannel.onmessage = function(data){
  //     debugger
  // }

  localConnection.createOffer().then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
  startButton.disabled = true;
  closeButton.disabled = false;
}

function iceCallback1(event){
    if(event.candidate){
        remoteConnection.addIceCandidate(new RTCIceCandidate(event.candidate))
            .then(function(){
                trace(getName(localConnection) + ' addIceCandidate success');
            })
    }
}

function iceCallback2(event){
    if(event.candidate){
        localConnection.addIceCandidate(new RTCIceCandidate(event.candidate))
            .then(function(){
                trace(getName(remoteConnection) + ' addIceCandidate success');
            })
    }
}

function gotDescription1(desc) {
  trace('Offer from localConnection\n' + desc.sdp);
  trace('localConnection setLocalDescription start');
  localConnection.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(localConnection);
    },
    onSetSessionDescriptionError
  );
  trace('remoteConnection setRemoteDescription start');
  remoteConnection.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(remoteConnection);
    },
    onSetSessionDescriptionError
  );
  trace('remoteConnection createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  remoteConnection.createAnswer().then(
    onCreateAnswerSuccess,
    onCreateSessionDescriptionError
  );
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from remoteConnection:\n' + desc.sdp);
  trace('remoteConnection setLocalDescription start');
  remoteConnection.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(remoteConnection);
    },
    onSetSessionDescriptionError
  );
  trace('localConnection setRemoteDescription start');
  localConnection.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(localConnection);
    },
    onSetSessionDescriptionError
  );
}

function onAddIceCandidateSuccess(pc) {
  trace(getName(pc) + ' addIceCandidate success');
}

function onSetLocalSuccess(pc) {
  trace(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  trace(getName(pc) + ' setRemoteDescription complete');
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function getName(pc) {
  return (pc === localConnection) ? 'localConnection' : 'remoteConnection';
}

function sendData() {
  var data = dataChannelSend.value;
  sendChannel.send(data);
  trace('Sent Data: ' + data);
}

function close(){
    sendChannel.close();
    startButton.disabled = false;
    sendButton.disabled = true;
    closeButton.disabled = true;
}

startButton.addEventListener('click', createConnection);
sendButton.addEventListener('click', sendData)
closeButton.addEventListener('click', close)
