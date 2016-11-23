document.addEventListener('DOMContentLoaded', function(){
    var localVideoElement = document.getElementById('localVideo');
    var pc1 = new RTCPeerConnection();
    pc1.onicecandidate = function(e) {
      onIceCandidate(pc1, e);
    };
    function onIceCandidate(pc, event) {
      if (event.candidate) {
        getOtherPc(pc).addIceCandidate(
          new RTCIceCandidate(event.candidate)
        ).then(
          function() {
            onAddIceCandidateSuccess(pc);
          },
          function(err) {
            onAddIceCandidateError(pc, err);
          }
        );
        trace(getName(pc) + ' ICE candidate: \n' + event.candidate.candidate);
      }
    }
    getUserMedia({ video: true, audio: false}, function(stream){
        if(window.URL){
            localVideoElement.src = window.URL.createObjectURL(stream);
        }else{
            localVideoElement.srcObject = stream;
        }
        pc1.addStream(stream);
    }, function(error){
        console.error(error);
    })
})
