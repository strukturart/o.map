const settings = ((_) => {
  let save_settings = function () {
    localStorageWriteRead("owm-key", document.getElementById("owm-key").value);
    localStorageWriteRead(
      "cache-time",
      document.getElementById("cache-time").value
    );
    localStorageWriteRead(
      "cache-zoom",
      document.getElementById("cache-zoom").value
    );
    localStorageWriteRead(
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
    document.getElementById("cache-time").value = setting.cache_time
    document.getElementById("cache-zoom").value = setting.cache_zoom
    document.getElementById("export-path").value = setting.export_path
    if (setting.tracking_screenlock)
      document.getElementById("screenlock-ckb").checked = true;
  };

  return {
    load_settings,
    save_settings,
    save_chk,
  };
})();
