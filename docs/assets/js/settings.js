const settings = ((_) => {
  let save_settings = function () {
    localStorage.setItem("owm-key", document.getElementById("owm-key").value);
    localStorage.setItem(
      "cache-time",
      document.getElementById("cache-time").value
    );
    localStorage.setItem(
      "cache-zoom",
      document.getElementById("cache-zoom").value
    );
    localStorage.setItem(
      "export-path",
      document.getElementById("export-path").value
    );

    helper.toaster("saved successfully", 2000);
  };

  let save_chk = function () {
    let p = document.getElementById("screenlock-ckb");
    p.checked = !p.checked;
    if (p.checked) {
      localStorage.setItem("tracking_screenlock", "true");
    } else {
      localStorage.setItem("tracking_screenlock", "false");
    }
  };

  let load_settings = function () {
    document.getElementById("owm-key").value = setting.openweather_api;
    document.getElementById("cache-time").value = setting.cache_time;
    document.getElementById("cache-zoom").value = setting.cache_zoom;
    document.getElementById("export-path").value = setting.export_path;
    if (setting.tracking_screenlock)
      document.getElementById("screenlock-ckb").checked = true;
  };

  let load_settings_from_file = function () {
    helper.toaster("search setting file", 2000);
    //search gpx
    let load_file = new Applait.Finder({
      type: "sdcard",
      debugMode: true,
    });

    load_file.search("omap_settings.json");
    load_file.on("searchComplete", function (needle, filematchcount) {});
    load_file.on("error", function (message, err) {
      helper.toaster("file not found", 2000);
    });

    load_file.on("fileFound", function (file, fileinfo, storageName) {
      let reader = new FileReader();

      reader.readAsText(file);

      reader.onload = function () {
        let data = JSON.parse(reader.result);

        setting = data[0];

        load_settings();

        helper.toaster(
          "the settings were loaded from the file, if you want to use them permanently don't forget to save.",
          3000
        );
      };

      reader.onerror = function () {
        console.log(reader.error);
      };
    });
  };

  let export_settings = function () {
    var sdcard = navigator.getDeviceStorage("sdcard");

    var request_del = sdcard.delete("omap_settings.json");
    request_del.onsuccess = function () {};
    setTimeout(function () {
      let data = JSON.stringify(setting);
      var file = new Blob(["[" + data + "]"], {
        type: "application/json",
      });

      var request = sdcard.addNamed(file, "omap_settings.json");

      request.onsuccess = function () {
        var name = this.result;
        helper.toaster("settings exported, omap_settings.json", 5000);
      };

      request.onerror = function () {
        helper.toaster("Unable to write the file", 2000);
      };
    }, 2000);
  };

  return {
    load_settings,
    save_settings,
    save_chk,
    export_settings,
    load_settings_from_file,
  };
})();
