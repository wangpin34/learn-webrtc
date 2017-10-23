/*
 * Handle message
 */ 
function handleMsg(message) {
  
}

function updateConnState(state) {
  document.getElementById('conn-state').innerHTML = state;
}

function updateSignalingState(state) {
  document.getElementById('signaling-state').innerHTML = state;
}

function updateDataChannelState(state) {
  document.getElementById('data-channel-state').innerHTML = state;
}