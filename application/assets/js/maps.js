////////////////////
////MAPS////////////
///////////////////
const maps = (() => {
  ///MARKER ICON
  const follow_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "follow-marker",
    html: '<div class="ringring"></div><div class="follow"></div>',
  });

  const tracking_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "tracking-marker",
    html: '<div class="ringring"></div><div class="tracking"></div>',
  });

  const default_icon = L.icon({
    iconUrl: "assets/css/images/marker-icon.png",
    iconSize: [25, 40],
    iconAnchor: [15, 40],
  });

  const select_icon = L.icon({
    iconUrl: "assets/css/images/marker-icon.png",
    iconSize: [25, 40],
    iconAnchor: [15, 40],
    className: "marker-1",
  });

  const goal_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "goal-marker",
    html: '<div class="ringring"></div><div class="goal"></div>',
  });

  const default_overpass_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "climbing-marker",
    html: '<div></div><div class="climbing"></div>',
  });

  const water_icon = L.divIcon({
    iconSize: [40, 40],
    iconAnchor: [30, 40],
    className: "water-marker",
    html: '<div></div><div class="water"></div>',
  });

  const start_icon = L.icon({
    iconUrl: "assets/css/images/start.png",
    iconSize: [35, 40],
    iconAnchor: [15, 40],
    className: "start-marker",
  });

  const end_icon = L.icon({
    iconUrl: "assets/css/images/end.png",
    iconSize: [35, 40],
    iconAnchor: [15, 40],
    className: "end-marker",
  });

  const public_transport = L.divIcon({
    iconSize: [20, 20],
    iconAnchor: [30, 40],
    className: "climbing-marker",
    html: '<div></div><div class="public_transport"></div>',
  });

  //caching settings from settings panel
  let caching_time = "";

  if (localStorage.getItem("cache-time") != null) {
    caching_time = Number(localStorage.getItem("cache-time")) * 86400000;
  } else {
    caching_time = 86400000;
  }
  if (localStorage.getItem("cache-zoom") != null) {
    zoom_depth = localStorage.getItem("cache-zoom");
  } else {
    zoom_depth = 12;
  }

  let caching_tiles = function () {
    // if (status.caching_tiles_started) return false;
    let swLat = map.getBounds()._southWest.lat;
    let swLng = map.getBounds()._southWest.lng;
    let neLat = map.getBounds()._northEast.lat;
    let neLng = map.getBounds()._northEast.lng;

    var bbox = L.latLngBounds(L.latLng(swLat, swLng), L.latLng(neLat, neLng));
    tilesLayer.seed(bbox, 0, zoom_depth);

    helper.top_bar("", "downloading", "");

    // Display seed progress on console
    tilesLayer.on("seedprogress", function (seedData) {
      status.caching_tiles_started = true;
      var percent =
        100 -
        Math.floor((seedData.remainingLength / seedData.queueLength) * 100);
      console.log("Seeding " + percent + "% done");
      if (percent > 90) status.caching_tiles_started = false;
      document.querySelector("div#top-bar div.button-center").innerText =
        percent + "%";
    });
    tilesLayer.on("seedend", function (seedData) {
      document.querySelector("div#top-bar div.button-center").innerText =
        "Downloads finished";
      status.caching_tiles_started = false;
      setTimeout(() => {
        helper.top_bar("", "", "");
      }, 2000);
    });

    tilesLayer.on("error", function (seedData) {
      status.caching_tiles_started = false;

      document.querySelector("div#top-bar div.button-center").innerText =
        seedData;
    });

    tilesLayer.on("seedstart", function (seedData) {
      document.querySelector("div#top-bar div.button-center").innerText =
        seedData;
    });
  };

  let delete_cache = function () {
    tilesLayer._db
      .destroy()
      .then(function (response) {
        helper.side_toaster("map cache deleted", 3000);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  let export_db_callback = (f, a) => {
    alert(f, a);
  };

  let export_db = function () {
    let db = tilesLayer._db;

    // Fetch all documents in the database
    db.allDocs({ include_docs: true, attachments: true }, (error, doc) => {
      if (error) console.error(error);
      else {
        let data = JSON.stringify(doc.rows.map(({ doc }) => doc));
        helper.downloadFile("omap_map_export.json", data, export_db_callback);
      }
    });
  };

  let import_db = () => {
    let file_reader = (r) => {
      let reader = new FileReader();

      reader.onerror = function (event) {
        console.log("can't read file");
        reader.abort();
      };

      reader.onloadend = function (event) {
        let k = JSON.parse(reader.result);
        let db = tilesLayer._db;

        db.bulkDocs(
          k,
          { include_docs: true, attachments: true, conflicts: true },
          (...args) => console.log("DONE", args)
        )
          .then((responses) => {
            console.log("Documents inserted:", responses);
          })
          .catch((error) => {
            console.error("Error inserting documents:", error);
          });
      };

      reader.readAsText(r);
    };

    let cb = (r) => {
      let sdcard = "";

      try {
        sdcard = navigator.getDeviceStorage("sdcard");
      } catch (e) {}

      if ("b2g" in navigator) {
        try {
          sdcard = navigator.b2g.getDeviceStorage("sdcard");
        } catch (e) {}
      }

      let request = sdcard.get(r.name);

      request.onsuccess = function () {
        let data = this.result;

        file_reader(data);
      };

      request.onerror = function (error) {
        console.log(error);
      };
    };
    helper.search_file("omap_map_export.json", cb);
  };

  let overlayer = "";

  let addMap = function (url, attribution, max_zoom, type, marker) {
    if (attribution == null) attribution = "";
    if (max_zoom == null) max_zoom = 17;
    //remove layer
    if (url == "") {
      if (map.hasLayer(tilesLayer)) {
        map.removeLayer(tilesLayer);
        document.activeElement.classList.remove("active-layer");

        document.activeElement.style.background = "black";
        document.activeElement.style.color = "white";
        general.last_map_url = "";
        localStorage.setItem("last_map_type", "");
        localStorage.setItem("last_map_attribution", "");
        localStorage.setItem("last_map_max_zoom", "");
        localStorage.setItem("last_map_url", "");

        helper.side_toaster("layer removed", 3000);
      }
      return false;
    }
    let useOnlyCache = false;
    if (localStorage.getItem("useOnlyCache") != null) {
      if (localStorage.getItem("useOnlyCache") == "true") {
        setTimeout(() => {
          helper.side_toaster("load only cached map data", 5000);
        }, 10000);
        useOnlyCache = true;
      } else {
        useOnlyCache = false;
      }
    }

    localStorage.setItem("last_map_type", type);
    general.last_map_type = type;

    localStorage.setItem("last_map_max_zoom", max_zoom);
    general.last_map_max_zoom = max_zoom;

    localStorage.setItem("last_map_attribution", attribution);
    general.last_map_attribution = attribution;

    //map
    if (type == "map") {
      if (map.hasLayer(tilesLayer)) {
        map.removeLayer(tilesLayer);
      }

      tilesLayer = L.tileLayer(url, {
        useCache: true,
        saveToCache: true,
        crossOrigin: true,
        cacheMaxAge: caching_time,
        useOnlyCache: useOnlyCache,
        maxZoom: max_zoom,
        attribution: attribution,
        format: "image/png",
        transparent: true,
      });

      map.addLayer(tilesLayer);
      localStorage.setItem("last_map_url", url);
      general.last_map_url = url;

      tilesLayer.on("tileerror", function (error, tile) {
        helper.side_toaster("error at loading map", 3000);
        try {
          url = url.replace("{z}", "1");
          url = url.replace("{y}", "1");
          url = url.replace("{x}", "1");
        } catch (e) {}
      });

      tilesLayer.on("tileloadstart", function (event) {});

      document.querySelector(".leaflet-control-attribution").style.display =
        "block";
      if (window.innerWidth < 600) {
        setTimeout(function () {
          document.querySelector(".leaflet-control-attribution").style.display =
            "none";
        }, 10000);
      }
    }
    //overlayer

    if (type == "overlayer") {
      if (map.hasLayer(overlayer)) {
        general.active_layer.splice(general.active_layer.indexOf(url), 1);
        map.removeLayer(overlayer);
        document.activeElement.classList.remove("active-layer");
        document.activeElement.style.background = "black";
        document.activeElement.style.color = "white";
        return false;
      }
      general.active_layer.push(url);

      overlayer = L.tileLayer(url);
      map.addLayer(overlayer);
    }

    if (type == "layer") {
      if (map.hasLayer(overlayer)) {
        general.active_layer.splice(general.active_layer.indexOf(url), 1);
        map.removeLayer(overlayer);
        document.activeElement.classList.remove("active-layer");
        document.activeElement.style.background = "black";
        document.activeElement.style.color = "white";
        return false;
      } else {
        general.active_layer.push(url);

        overlayer = L.tileLayer(url);
        map.addLayer(overlayer);
      }
    }
    //overpass

    if (type == "overpass") {
      //reset

      if (marker == "" || marker == null) marker = "default_overpass_icon";
      if (general.active_layer.includes(url)) {
        //remove
        overpass.call(map, url, marker);
        general.active_layer.splice(general.active_layer.indexOf(url), 1);
        document.activeElement.classList.remove("active-layer");
        document.activeElement.style.background = "black";
        document.activeElement.style.color = "white";
      } else {
        overpass.call(map, url, marker);
        general.active_layer.push(url);

        document.activeElement.classList.add("active-layer");
        document.activeElement.style.background = "white";
        document.activeElement.style.color = "black";
      }
    }
  };

  map.on("layeradd", function (event) {
    if (map.hasLayer(overlayer)) {
      overlayer.bringToFront();
      return false;
    }
  });

  let formDat = function (timestamp) {
    (date = new Date(timestamp * 1000)),
      (datevalues = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: String(date.getMinutes()).padStart(2, "0"),
        sec: date.getSeconds(),
      });

    return datevalues;
  };

  let k;
  let weather_layer,
    weather_layer0,
    weather_layer1,
    weather_layer2,
    weather_layer3;

  function weather_map() {
    let weather_url;
    if (general.active_layer.includes("weather")) {
      general.active_layer.splice(general.active_layer.indexOf("weather"), 1);

      helper.top_bar("", "", "");
      map.removeLayer(weather_layer);
      map.removeLayer(weather_layer0);
      map.removeLayer(weather_layer1);
      map.removeLayer(weather_layer2);
      map.removeLayer(weather_layer3);
      clearInterval(k);
      map.attributionControl.setPrefix("");
      helper.side_toaster("layer removed", 2000);
      return false;
    } else {
      fetch("https://api.rainviewer.com/public/maps.json")
        .then(function (response) {
          general.active_layer.push("weather");
          map.attributionControl.setPrefix(
            "<a href='https://www.rainviewer.com/terms.html'>waether data collected by rainviewer.com</a>"
          );
          return response.json();
        })
        .then(function (data) {
          weather_url =
            "https://tilecache.rainviewer.com/v2/radar/" +
            data[data.length - 5] +
            "/256/{z}/{x}/{y}/2/1_1.png";
          weather_layer = L.tileLayer(weather_url);

          weather_url0 =
            "https://tilecache.rainviewer.com/v2/radar/" +
            data[data.length - 4] +
            "/256/{z}/{x}/{y}/2/1_1.png";
          weather_layer0 = L.tileLayer(weather_url0);

          weather_url1 =
            "https://tilecache.rainviewer.com/v2/radar/" +
            data[data.length - 3] +
            "/256/{z}/{x}/{y}/2/1_1.png";
          weather_layer1 = L.tileLayer(weather_url1);

          weather_url2 =
            "https://tilecache.rainviewer.com/v2/radar/" +
            data[data.length - 2] +
            "/256/{z}/{x}/{y}/2/1_1.png";
          weather_layer2 = L.tileLayer(weather_url2);

          weather_url3 =
            "https://tilecache.rainviewer.com/v2/radar/" +
            data[data.length - 1] +
            "/256/{z}/{x}/{y}/2/1_1.png";
          weather_layer3 = L.tileLayer(weather_url3);

          map.addLayer(weather_layer);
          map.addLayer(weather_layer0);
          map.addLayer(weather_layer1);
          map.addLayer(weather_layer2);
          map.addLayer(weather_layer3);

          let i = -1;
          k = setInterval(() => {
            i++;

            if (i == 0) {
              map.addLayer(weather_layer);
              map.removeLayer(weather_layer0);
              map.removeLayer(weather_layer1);
              map.removeLayer(weather_layer2);
              map.removeLayer(weather_layer3);
              let t = formDat(data[data.length - 5]);
              helper.top_bar(
                "",
                t.year +
                  "." +
                  t.month +
                  "." +
                  t.day +
                  ", " +
                  t.hour +
                  ":" +
                  t.minute,
                ""
              );
            }

            if (i == 1) {
              map.removeLayer(weather_layer);
              map.addLayer(weather_layer0);
              map.removeLayer(weather_layer1);
              map.removeLayer(weather_layer2);
              map.removeLayer(weather_layer3);
              let t = formDat(data[data.length - 4]);
              helper.top_bar(
                "",
                t.year +
                  "." +
                  t.month +
                  "." +
                  t.day +
                  ", " +
                  t.hour +
                  ":" +
                  t.minute,
                ""
              );
            }

            if (i == 2) {
              map.removeLayer(weather_layer);
              map.removeLayer(weather_layer0);
              map.addLayer(weather_layer1);
              map.removeLayer(weather_layer2);
              map.removeLayer(weather_layer3);
              let t = formDat(data[data.length - 3]);
              helper.top_bar(
                "",
                t.year +
                  "." +
                  t.month +
                  "." +
                  t.day +
                  ", " +
                  t.hour +
                  ":" +
                  t.minute,
                ""
              );
            }

            if (i == 3) {
              map.removeLayer(weather_layer);
              map.removeLayer(weather_layer0);
              map.removeLayer(weather_layer1);
              map.addLayer(weather_layer2);
              map.removeLayer(weather_layer3);
              let t = formDat(data[data.length - 2]);
              helper.top_bar(
                "",
                t.year +
                  "." +
                  t.month +
                  "." +
                  t.day +
                  ", " +
                  t.hour +
                  ":" +
                  t.minute,
                ""
              );
            }
            if (i == 4) {
              map.removeLayer(weather_layer);
              map.removeLayer(weather_layer0);
              map.removeLayer(weather_layer1);
              map.removeLayer(weather_layer2);
              map.addLayer(weather_layer3);
              let t = formDat(data[data.length - 1]);
              helper.top_bar(
                "",
                t.year +
                  "." +
                  t.month +
                  "." +
                  t.day +
                  ", " +
                  t.hour +
                  ":" +
                  t.minute,
                ""
              );
            }
            if (i == 5) {
              i = -1;
            }
          }, 2000);
        })
        .catch(function (err) {
          if (helper.isOnline == true) {
            helper.allow_unsecure(
              "https://api.rainviewer.com/public/maps.json"
            );
            helper.side_toaster("Can't load weather data" + err, 3000);
          }
        });
    }
  }
  return {
    follow_icon,
    default_icon,
    default_overpass_icon,
    goal_icon,
    public_transport,
    water_icon,
    select_icon,
    tracking_icon,
    start_icon,
    end_icon,
    weather_map,
    caching_tiles,
    delete_cache,
    addMap,
    export_db,
    import_db,
  };
})();
