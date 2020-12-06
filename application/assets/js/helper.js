"use strict";

function notify(param_title, param_text, param_silent) {
  var options = {
    body: param_text,
    silent: true,
  };
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    var notification = new Notification(param_title, options);
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var notification = new Notification(param_title, options);
      }
    });
  }
}

function toaster(text, time) {
  $("div#toast").html("<div>" + text + "</div>");

  $("div#toast").animate({ top: "0px" }, 1000, "linear", function () {
    $("div#toast").delay(3000).animate({ top: "-360px" }, time);
  });
}

let wp;

function user_input(param, file_name) {
  if (param == "open") {
    $("div#user-input").animate({ bottom: "0px" }, 1000, "linear");
    $("div#user-input input").focus();
    $("div#user-input input").val(file_name);
    //wp = windowOpen;
    windowOpen = "user-input";
  }
  if (param == "close") {
    $("div#user-input").animate({ bottom: "-1000px" }, 1000, "linear");
    $("div#user-input input").blur();
    windowOpen = "map";

    //windowOpen = wp;
  }

  if (param == "return") {
    let input_value = $("div#user-input input").val();
    $("div#user-input").animate({ bottom: "-1000px" }, 1000, "linear");
    $("div#user-input input").blur();
    //windowOpen = wp;
    return input_value;
  }
}

function localStorageWriteRead(item, value) {
  if (item != "" && value != "") {
    localStorage.setItem(item, value);
  }

  return localStorage.getItem(item);
}

//delete file
function deleteFile(storage, path, notification) {
  let sdcard = navigator.getDeviceStorages("sdcard");

  let requestDel = sdcard[storage].delete(path);

  requestDel.onsuccess = function () {
    if (notification == "notification") {
      toaster(
        'File "' + name + '" successfully deleted frome the sdcard storage area'
      );
    }
  };

  requestDel.onerror = function () {
    toaster("Unable to delete the file: " + this.error);
  };
}

//bottom bar
function bottom_bar(left, center, right) {
  $("div#bottom-bar div#button-left").text(left);
  $("div#bottom-bar div#button-center").text(center);
  $("div#bottom-bar div#button-right").text(right);
}

function screenWakeLock(param1) {
  let lock;
  if (param1 == "lock") {
    lock = window.navigator.requestWakeLock("screen");
  }

  if (param1 == "unlock") {
    if (lock.topic == "screen") {
      lock.unlock();
    }
  }
}
