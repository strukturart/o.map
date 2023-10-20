const helper = (() => {
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  let isOnline = function () {
    var xhttp = new XMLHttpRequest({
      mozSystem: true,
    });

    xhttp.open("GET", "https://google.com?" + new Date().getTime(), true);
    xhttp.timeout = 2500;
    xhttp.responseType = "document";
    xhttp.send();

    xhttp.onload = function () {
      if (
        xhttp.readyState === xhttp.DONE &&
        xhttp.status >= 200 &&
        xhttp.status < 304
      ) {
        return true;
      }

      if (xhttp.readyState === xhttp.DONE && xhttp.status != 200) {
        return false;
      }
    };

    xhhtp.onerror = function () {
      console.log("you are offline");
      return false;
    };
  };

  let getManifest = function (callback) {
    if (navigator.mozApps) {
      let self = navigator.mozApps.getSelf();
      self.onsuccess = function () {
        callback(self.result);
      };
      self.onerror = function () {
        let t = document.getElementById("kaios-ads");
        t.remove();
        return false;
      };
    }

    if ("b2g" in navigator) {
      fetch("/manifest.webmanifest")
        .then((r) => r.json())
        .then((r) => callback(r.b2g_features));
    }
  };

  let queue = [];
  let timeout;
  let toaster = function (text, time) {
    queue.push({ text: text, time: time });
    if (queue.length === 1) {
      toast_q(text, time);
    }
  };

  let add_script = function (script) {
    document.body.appendChild(document.createElement("script")).src = script;
  };

  let toast_q = function (text, time) {
    var x = document.querySelector("div#toast");
    x.innerHTML = queue[0].text;

    x.style.transform = "translate(0px, 0px)";

    timeout = setTimeout(function () {
      timeout = null;
      x.style.transform = "translate(0px, -100px)";
      queue = queue.slice(1);
      if (queue.length > 0) {
        setTimeout(() => {
          toast_q(text, time);
        }, 1000);
      }
    }, time);
  };

  //side toaster

  let queue_st = [];
  let ttimeout;
  let side_toaster = function (text, time) {
    queue_st.push({ text: text, time: time });
    if (queue_st.length === 1) {
      toast_qq(text, time);
    }
  };

  let toast_qq = function (text, time) {
    var x = document.querySelector("div#side-toast");
    x.innerHTML = queue_st[0].text;

    x.style.transform = "translate(0vh, 0px)";

    timeout = setTimeout(function () {
      ttimeout = null;
      x.style.transform = "translate(-100vh,0px)";
      queue_st = queue.slice(1);
      if (queue_st.length > 0) {
        setTimeout(() => {
          toast_qq(text, time);
        }, 1000);
      }
    }, time);
  };

  //get location by ip
  let geoip = function (callback, key) {
    const url = "https://api.ipbase.com/v2/info?apikey=" + key;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";
    xhr.send();
    xhr.error = function (err) {
      helper.side_toaster(err, 3000);
    };

    xhr.onload = function () {
      let responseObj = xhr.response;
      let latlng = [
        responseObj.data.location.latitude,
        responseObj.data.location.longitude,
      ];
      callback(latlng);
    };
  };

  //delete file
  let deleteFile = function (filename) {
    let sdcard = "";

    try {
      sdcard = navigator.getDeviceStorage("sdcard");
    } catch (e) {}

    if ("b2g" in navigator) {
      try {
        sdcard = navigator.b2g.getDeviceStorage("sdcard");
      } catch (e) {}
    }

    let requestDel = sdcard.delete(filename);

    requestDel.onsuccess = function () {
      helper.side_toaster("File successfully deleted", 2000);

      document.querySelector("[data-filepath='" + filename + "']").remove();
    };

    requestDel.onerror = function () {
      console.log("error");
      helper.toaster("Unable to delete the file: " + this.error);
    };
  };

  //search file
  let search_file = (name, callback) => {
    try {
      let finder = new Applait.Finder({
        type: "sdcard",
        debugMode: false,
      });
      finder.search(name);

      finder.on("searchComplete", function (needle, filematchcount) {});
      finder.on("fileFound", function (file, fileinfo, storageName) {
        callback(file);
      });
    } catch (e) {}

    if ("b2g" in navigator) {
      try {
        var sdcard = navigator.b2g.getDeviceStorage("sdcard");
        var iterable = sdcard.enumerate();
        var iterFiles = iterable.values();
        function next(_files) {
          _files
            .next()
            .then((file) => {
              if (!file.done) {
                if (file.value.name.includes(name)) {
                  let sdcard = navigator.b2g.getDeviceStorage("sdcard");
                  let request = sdcard.get(file.value.name);
                  request.onsuccess = function () {
                    callback(this.result);
                  };
                  request.onerror = function (e) {
                    helper.side_toaster(e + "error", 3000);
                  };
                }
                next(_files);
              }
            })
            .catch(() => {
              next(_files);
            });
        }
        next(iterFiles);
      } catch (e) {
        console.log(e);
      }
    }
  };
  let list_files = (filetype, callback) => {
    if ("b2g" in navigator) {
      try {
        var sdcard = navigator.b2g.getDeviceStorage("sdcard");

        var iterable = sdcard.enumerate();
        var iterFiles = iterable.values();
        function next(_files) {
          _files
            .next()
            .then((file) => {
              if (!file.done) {
                let n = file.value.name.split(".");
                let file_type = n[n.length - 1];

                if (file_type == filetype) {
                  callback(file.value.name);
                }
                next(_files);
              }
            })
            .catch(() => {
              next(_files);
            });
        }
        next(iterFiles);
      } catch (e) {
        console.log(e);
      }
    }
  };

  //delete file
  let renameFile = function (filename, new_filename) {
    let sdcard = "";

    try {
      sdcard = navigator.getDeviceStorage("sdcard");
    } catch (e) {}

    if ("b2g" in navigator) {
      try {
        sdcard = navigator.b2g.getDeviceStorage("sdcard");
      } catch (e) {}
    }

    let request = sdcard.get(filename);

    request.onsuccess = function () {
      let data = this.result;

      let file_extension = data.name.split(".");
      file_extension = file_extension[file_extension.length - 1];

      let filepath = data.name.split("/").slice(0, -1).join("/") + "/";

      let requestAdd = sdcard.addNamed(
        data,
        filepath + new_filename + "." + file_extension
      );
      requestAdd.onsuccess = function () {
        var request_del = sdcard.delete(data.name);

        request_del.onsuccess = function () {
          // success copy and delete

          document.querySelector(
            "[data-filepath='" + filename + "']"
          ).innerText = new_filename + "." + file_extension;

          document.querySelector("[data-filepath='" + filename + "']").focus();

          helper.side_toaster("successfully renamed", 3000);
        };

        request_del.onerror = function () {
          // success copy not delete
          toaster("Unable to write the file", 3000);
        };
      };
      requestAdd.onerror = function () {
        toaster("Unable to write the file", 3000);
      };
    };

    request.onerror = function () {
      toaster("Unable to write the file", 3000);
    };
  };

  let downloadFile = function (filename, data, callback) {
    let sdcard = "";

    try {
      sdcard = navigator.getDeviceStorage("sdcard");
    } catch (e) {}

    if ("b2g" in navigator) {
      try {
        sdcard = navigator.b2g.getDeviceStorage("sdcard");
      } catch (e) {}
    }

    var filedata = new Blob([data]);

    var request = sdcard.addNamed(filedata, filename);
    request.onsuccess = function () {
      callback(filename, request.result);
    };

    request.onerror = function () {
      helper.side_toaster("Unable to download the file", 2000);
    };
  };

  function calculateDatabaseSizeInMB(db) {
    return db
      .allDocs({ include_docs: true })
      .then(function (result) {
        var totalSizeBytes = 0;

        result.rows.forEach(function (row) {
          var doc = row.doc;

          // Check if the document has attachments
          if (doc._attachments) {
            for (var attachmentName in doc._attachments) {
              if (doc._attachments.hasOwnProperty(attachmentName)) {
                var attachment = doc._attachments[attachmentName];
                totalSizeBytes += attachment.length;
              }
            }
          }
        });

        // Convert total size to megabytes
        var totalSizeMB = totalSizeBytes / (1024 * 1024);
        return totalSizeMB;
      })
      .catch(function (error) {
        console.error("Error calculating database size:", error);
        throw error;
      });
  }

  //bottom bar
  function bottom_bar(left, center, right) {
    document.querySelector("div#bottom-bar div#button-left").textContent = left;
    document.querySelector("div#bottom-bar div#button-center").textContent =
      center;
    document.querySelector("div#bottom-bar div#button-right").textContent =
      right;

    if (left == "" && center == "" && right == "") {
      document.querySelector("div#bottom-bar").style.display = "none";
    } else {
      document.querySelector("div#bottom-bar").style.display = "block";
    }
  }

  //top bar
  function top_bar(left, center, right) {
    document.querySelector("div#top-bar div.button-left").textContent = left;
    document.querySelector("div#top-bar div.button-center").textContent =
      center;
    document.querySelector("div#top-bar div.button-right").textContent = right;

    if (left == "" && center == "" && right == "") {
      document.querySelector("div#top-bar").style.display = "none";
    } else {
      document.querySelector("div#top-bar").style.display = "block";
    }
  }

  function screenWakeLock(param, lock_type) {
    let lock;
    if (window.navigator.requestWakeLock == "is not a function") return false;
    if (param == "lock") {
      lock = window.navigator.requestWakeLock(lock_type);
      return false;
    }

    if (param == "unlock") {
      if (lock.topic == lock_type) {
        lock.unlock();
      }
    }
  }

  // Usage:

  return {
    bottom_bar,
    top_bar,
    screenWakeLock,
    calculateDatabaseSizeInMB,
    getManifest,
    toaster,
    add_script,
    deleteFile,
    isOnline,
    geoip,
    side_toaster,
    renameFile,
    downloadFile,
    search_file,
    list_files,
  };
})();
