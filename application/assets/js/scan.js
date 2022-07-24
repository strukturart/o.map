const qr = ((_) => {
  let video = document.querySelector("video");
  let intv;
  let mediaStream;

  let stop_scan = function (callback) {
    mediaStream.getTracks().map(function (val) {
      val.stop();
    });

    document.getElementById("qr-screen").style.display = "none";

    callback();
  };

  let start_scan = function (callback) {
    document.getElementById("qr-screen").style.display = "block";

    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        {
          audio: false,
          video: {
            width: 200,
            height: 200,
          },
        },
        function (stream) {
          video.srcObject = stream;
          console.log(stream);
          mediaStream = stream;

          video.onloadedmetadata = function (e) {
            video.play();

            var barcodeCanvas = document.createElement("canvas");
            intv = setInterval(() => {
              barcodeCanvas.width = video.videoWidth;
              barcodeCanvas.height = video.videoHeight;
              var barcodeContext = barcodeCanvas.getContext("2d");
              var imageWidth = Math.max(1, Math.floor(video.videoWidth)),
                imageHeight = Math.max(1, Math.floor(video.videoHeight));

              barcodeContext.drawImage(video, 0, 0, imageWidth, imageHeight);

              var imageData = barcodeContext.getImageData(
                0,
                0,
                imageWidth,
                imageHeight
              );
              var idd = imageData.data;

              let code = jsQR(idd, imageWidth, imageHeight);

              if (code) {
                clearInterval(intv);
                callback(code.data);
                stop_scan();
              }
            }, 1000);
          };
        },
        function (err) {
          console.log("The following error occurred: " + err.name);
        }
      );
    } else {
      console.log("getUserMedia not supported");
    }
  };

  return {
    start_scan,
    stop_scan,
  };
})();
