/*

The MIT License (MIT)

Copyright (c) 2014 André Fiedler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

function start_scan(callback) {
  document.getElementById("qr-screen").hidden = false;
  var video = document.querySelector("#video"),
    canvas = document.createElement("canvas");

  var ctx = canvas.getContext("2d"),
    streaming = false,
    startTime = 0,
    workerCount = 0,
    decodeWorker = null,
    clickEventName = document.ontouchdown ? "touchdown" : "mousedown";
  navigator.getMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  video.addEventListener(
    "play",
    function (ev) {
      if (!streaming) {
        // resizing image for slow devices
        canvas.width = 480;
        canvas.height = Math.ceil(
          (480 / video.clientWidth) * video.clientHeight
        );

        streaming = true;
      }
    },
    false
  );

  navigator.getMedia(
    {
      video: true,
      audio: false,
    },
    function (stream) {
      if (navigator.mozGetUserMedia) {
        video.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      }

      video.play();

      DecodeBar();
    },
    function (err) {
      console.log("An error occured! " + err);
    }
  );

  function receiveMessage(e) {
    workerCount--;

    if (e.data.success === true && e.data.result.length > 0) {
      StopDecoding();

      var result = e.data.result[0].pop();
      document.getElementById("qr-screen").hidden = true;
      callback(result);
    } else {
      DecodeBar();
    }
  }

  // Set the name of the hidden property and the change event for visibility
  var hidden, visibilityChange;
  if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
  } else if (typeof document.mozHidden !== "undefined") {
    hidden = "mozHidden";
    visibilityChange = "mozvisibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  }

  // If the page is hidden, pause the decoder worker;
  // if the page is shown, play the decoder worker
  function handleVisibilityChange() {
    if (document[hidden]) {
      //console.log('hidden');
      StopDecoding();
    } else {
      //console.log('shown');
      DecodeBar();
    }
  }

  document.addEventListener(visibilityChange, handleVisibilityChange, false);

  window.onfocus = function () {
    //console.log('focus');
    DecodeBar();
  };

  // Firefox Bug 879717 - drawImage on MediaStream assigned to <video> stopped working again
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=879717
  function drawVideo() {
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      decodeWorker.postMessage({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
      });
    } catch (e) {
      if (e.name === "NS_ERROR_NOT_AVAILABLE") {
        setTimeout(drawVideo, 0);
      } else {
        throw e;
      }
    }
  }

  document.getElementById("startDecoding").addEventListener(
    clickEventName,
    function () {
      DecodeBar();
    },
    false
  );

  function DecodeBar() {
    if (workerCount === 0) {
      if (decodeWorker === null) {
        decodeWorker = new Worker("assets/exclude-js/decoder.js");
        decodeWorker.onmessage = receiveMessage;
      }
      workerCount++;
      document.getElementById("startDecoding").hidden = true;
      drawVideo();
    }
  }

  function StopDecoding() {
    workerCount = 0;
    document.getElementById("startDecoding").hidden = false;
    if (decodeWorker === null) return;
    decodeWorker.terminate();
    decodeWorker = null;
  }
}
