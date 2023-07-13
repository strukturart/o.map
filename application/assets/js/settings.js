const settings = ((_) => {
  let save_settings = function () {
    localStorage.setItem("owm-key", document.getElementById("owm-key").value);
    localStorage.setItem(
      "ipbase-key",
      document.getElementById("ipbase-key").value
    );

    localStorage.setItem(
      "routing_profil",
      document.getElementById("routing-profil").value
    );

    localStorage.setItem("ors-key", document.getElementById("ors-key").value);

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

    localStorage.setItem("osm-tag", document.getElementById("osm-tag").value);

    helper.side_toaster("saved successfully", 2000);
    maps.addMap(
      localStorage.getItem("last_map"),
      localStorage.getItem("last_map_attribution"),
      localStorage.getItem("last_map_max_zoom"),
      localStorage.getItem("last_map_type")
    );

    load_settings();
  };

  let save_chk = function (id, localstorage_name) {
    let p = document.getElementById(id);
    p.checked = !p.checked;
    if (p.checked) {
      localStorage.setItem(localstorage_name, "true");
      setting[localstorage_name] = true;
    } else {
      localStorage.setItem(localstorage_name, "false");
      setting[localstorage_name] = false;
    }

    //change label text
    let d = document.querySelector("label[for='measurement-ckb']");
    setting.measurement ? (d.innerText = "metric") : (d.innerText = "imperial");
    document.getElementById(id).parentElement.focus();
  };

  let load_settings = function () {
    setting = {
      export_path: !localStorage.getItem("export-path")
        ? ""
        : localStorage.getItem("export-path") + "/",
      osm_tag: localStorage.getItem("osm-tag"),

      cache_time: localStorage["cache-time"] || "10",
      cache_zoom: localStorage["cache-zoom"] || "12",
      openweather_api: localStorage.getItem("owm-key"),
      ipbase_api: localStorage.getItem("ipbase-key")
        ? localStorage.getItem("ipbase-key")
        : "",
      ors_api: localStorage.getItem("ors-key"),
      routing_profil: localStorage.getItem("routing_profil")
        ? localStorage.getItem("routing_profil")
        : "foot-hiking",

      useOnlyCache:
        localStorage.getItem("useOnlyCache") != null
          ? JSON.parse(localStorage.getItem("useOnlyCache"))
          : true,

      crosshair:
        localStorage.getItem("crosshair") != null
          ? JSON.parse(localStorage.getItem("crosshair"))
          : true,
      scale:
        localStorage.getItem("scale") != null
          ? JSON.parse(localStorage.getItem("scale"))
          : true,

      routing_notification:
        localStorage.getItem("routing_notification") != null
          ? JSON.parse(localStorage.getItem("routing_notification"))
          : true,
      tracking_screenlock:
        localStorage.getItem("tracking_screenlock") != null
          ? JSON.parse(localStorage.getItem("tracking_screenlock"))
          : true,

      measurement:
        localStorage.getItem("measurement") != null
          ? JSON.parse(localStorage.getItem("measurement"))
          : true,

      tips_view:
        localStorage.getItem("tips_view") != null
          ? JSON.parse(localStorage.getItem("tips_view"))
          : true,
    };

    setting.tracking_screenlock
      ? (document.getElementById("screenlock-ckb").checked = true)
      : (document.getElementById("screenlock-ckb").checked = false);
    setting.crosshair
      ? (document.getElementById("crosshair-ckb").checked = true)
      : (document.getElementById("crosshair-ckb").checked = false);

    setting.routing_notification
      ? (document.getElementById("routing-notification-ckb").checked = true)
      : (document.getElementById("routing-notification-ckb").checked = false);

    setting.useOnlyCache
      ? (document.getElementById("useOnlyCache-ckb").checked = true)
      : (document.getElementById("useOnlyCache-ckb").checked = false);

    setting.scale
      ? (document.getElementById("scale-ckb").checked = true)
      : (document.getElementById("scale-ckb").checked = false);

    setting.measurement
      ? (document.getElementById("measurement-ckb").checked = true)
      : (document.getElementById("measurement-ckb").checked = false);

    setting.tips_view
      ? (document.getElementById("tips-ckb").checked = true)
      : (document.getElementById("tips-ckb").checked = false);

    //show / hidde crosshair
    setting.crosshair
      ? (document.getElementById("cross").style.visibility = "visible")
      : (document.getElementById("cross").style.visibility = "hidden");

    setting.measurement == true
      ? (general.measurement_unit = "km")
      : (general.measurement_unit = "mil");

    if (setting.measurement) {
      document.querySelector("label[for='measurement-ckb']").innerText =
        "metric";
    } else {
      document.querySelector("label[for='measurement-ckb']").innerText =
        "imperial";
    }

    //set values in setting page

    document.getElementById("owm-key").value = setting.openweather_api;
    document.getElementById("ipbase-key").value = setting.ipbase_api;
    document.getElementById("ors-key").value = setting.ors_api;
    document.getElementById("routing-profil").value = setting.routing_profil;

    document.getElementById("cache-time").value = setting.cache_time;
    document.getElementById("cache-zoom").value = setting.cache_zoom;
    document.getElementById("export-path").value = setting.export_path;
    document.getElementById("osm-tag").value = setting.osm_tag;

    ///show / hidde scale

    if (scale != undefined) scale.remove();

    if (setting.measurement) {
      scale = L.control.scale({
        position: "topright",
        metric: true,
        imperial: false,
      });
    } else {
      scale = L.control.scale({
        position: "topright",
        metric: false,
        imperial: true,
      });
    }

    setting.scale ? scale.addTo(map) : scale.remove();
  };

  let load_settings_from_file = function () {
    helper.toaster("search setting file", 2000);
    try {
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

          setTimeout(() => {
            document.getElementById("owm-key").value = setting.openweather_api;
            document.getElementById("ipbase-key").value = setting.ipbase_api;
            document.getElementById("ors-key").value = setting.ors_api;
            document.getElementById("routing-profil").value =
              setting.routing_profil;

            document.getElementById("cache-time").value = setting.cache_time;
            document.getElementById("cache-zoom").value = setting.cache_zoom;
            document.getElementById("export-path").value = setting.export_path;
            document.getElementById("osm-tag").value = setting.osm_tag;

            helper.toaster(
              "the settings were loaded from the file, if you want to use them permanently don't forget to save.",
              3000
            );
          }, 1500);
        };

        reader.onerror = function () {
          console.log(reader.error);
        };
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
                if (file.value.name.includes("omap_settings.json")) {
                  let reader = new FileReader();

                  reader.onload = function () {
                    let data = JSON.parse(reader.result);

                    setting = data[0];

                    setTimeout(() => {
                      document.getElementById("owm-key").value =
                        setting.openweather_api;
                      document.getElementById("ipbase-key").value =
                        setting.ipbase_api;
                      document.getElementById("ors-key").value =
                        setting.ors_api;
                      document.getElementById("routing-profil").value =
                        setting.routing_profil;

                      document.getElementById("cache-time").value =
                        setting.cache_time;
                      document.getElementById("cache-zoom").value =
                        setting.cache_zoom;
                      document.getElementById("export-path").value =
                        setting.export_path;
                      document.getElementById("osm-tag").value =
                        setting.osm_tag;

                      helper.toaster(
                        "the settings were loaded from the file, if you want to use them permanently don't forget to save.",
                        3000
                      );
                    }, 1500);
                  };

                  reader.onerror = function () {
                    alert(reader.error);
                  };

                  reader.readAsText(file.value);
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

  let export_settings = function () {
    try {
      var sdcard = navigator.getDeviceStorage("sdcard");
      var request_del = sdcard.delete("omap_settings.json");
      request_del.onsuccess = function () {
        let data = JSON.stringify(setting);
        var file = new Blob(["[" + data + "]"], {
          type: "application/json",
        });

        var request = sdcard.addNamed(file, "omap_settings.json");

        request.onsuccess = function () {
          helper.toaster("settings exported, omap_settings.json", 5000);
        };

        request.onerror = function () {
          helper.toaster("Unable to write the file", 2000);
        };
      };
    } catch (e) {}
    if ("b2g" in navigator) {
      try {
        var sdcard = navigator.b2g.getDeviceStorage("sdcard");
        var request_del = sdcard.delete("omap_settings.json");
        request_del.onsuccess = function () {
          let data = JSON.stringify(setting);
          var file = new Blob(["[" + data + "]"], {
            type: "application/json",
          });

          var request = sdcard.addNamed(file, "omap_settings.json");

          request.onsuccess = function () {
            helper.toaster("settings exported, omap_settings.json", 5000);
          };

          request.onerror = function () {
            toaster("Unable to write the file", 2000);
          };
        };
        request_del.onerror = function () {
          toaster("Unable to write the file", 2000);
        };
      } catch (e) {
        alert(e);
      }
    }
  };

  return {
    load_settings,
    save_settings,
    save_chk,
    export_settings,
    load_settings_from_file,
  };
})();
