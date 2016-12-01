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
