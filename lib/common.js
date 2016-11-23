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
