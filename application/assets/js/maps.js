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

  //caching settings from settings panel
  let caching_time;

  if (settings[1] != "") {
    caching_time = Number(settings[1]) * 86400000;
  } else {
    caching_time = 86400000;
  }
  if (settings[3] != "") {
    zoom_depth = localStorage.getItem("cache-zoom");
  } else {
    zoom_depth = 12;
  }

  let caching_events = function () {
    // Listen to cache hits and misses and spam the console
    tilesLayer.on("tilecachehit", function (ev) {
      //console.log("Cache hit: ", ev.url);
    });
    tilesLayer.on("tilecachemiss", function (ev) {
      //console.log("Cache miss: ", ev.url);
    });
    tilesLayer.on("tilecacheerror", function (ev) {
      //console.log("Cache error: ", ev.tile, ev.error);
    });
  };

  let caching_tiles = function () {
    let swLat = map.getBounds()._southWest.lat;
    let swLng = map.getBounds()._southWest.lng;
    let neLat = map.getBounds()._northEast.lat;
    let neLng = map.getBounds()._northEast.lng;

    var bbox = L.latLngBounds(L.latLng(swLat, swLng), L.latLng(neLat, neLng));
    tilesLayer.seed(bbox, 0, zoom_depth);

    top_bar("", "downloading", "");

    // Display seed progress on console
    tilesLayer.on("seedprogress", function (seedData) {
      var percent =
        100 -
        Math.floor((seedData.remainingLength / seedData.queueLength) * 100);
      console.log("Seeding " + percent + "% done");

      document.querySelector("div#top-bar div.button-center").innerText =
        percent + "%";
    });
    tilesLayer.on("seedend", function (seedData) {
      document.querySelector("div#top-bar div.button-center").innerText =
        "Downloads finished";
      setTimeout(() => {
        top_bar("", "", "");
      }, 2000);
    });

    tilesLayer.on("error", function (seedData) {
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
        toaster("map cache deleted", 3000);
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  function moon_map() {
    tilesUrl =
      "https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-moon-basemap-v0-1/all/{z}/{x}/{y}.png";
    tilesLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 12,
      minZoom: 2,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    });

    map.addLayer(tilesLayer);
    caching_events();
  }

  function toner_map() {
    tilesUrl = "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png";
    tilesLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    });

    map.addLayer(tilesLayer);
    caching_events();
  }

  function opentopo_map() {
    tilesUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
    tilesLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 17,
      attribution:
        "Map data &copy;<div> © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)</div>",
    });

    map.addLayer(tilesLayer);
    caching_events();
  }

  let owmLayer;
  function owm_layer() {
    if (map.hasLayer(owmLayer)) {
      map.removeLayer(owmLayer);
      return false;
    }

    tilesUrl =
      "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" +
      openweather_api;
    owmLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    });

    map.addLayer(owmLayer);
    caching_events();
  }

  function osm_map() {
    tilesUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    tilesLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 18,

      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    });

    map.addLayer(tilesLayer);
    caching_events();
  }

  let railwayLayer;
  function railway_layer() {
    if (map.hasLayer(railwayLayer)) {
      map.removeLayer(railwayLayer);
      return false;
    }

    tilesUrl = "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png";

    railwayLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 18,

      attribution:
        'Daten <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap-Mitwirkende</a>, Grafik: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a>',
    });

    map.addLayer(railwayLayer);
    caching_events();
  }

  function formatDate(date, format) {
    const map = {
      mm: date.getMonth() + 1,
      dd: date.getDate(),
      yy: date.getFullYear().toString().slice(-2),
      yyyy: date.getFullYear(),
    };

    return format.replace(/mm|dd|yy|yyy/gi, (matched) => map[matched]);
  }

  let attribution = function () {
    document.querySelector(".leaflet-control-attribution").style.display =
      "block";
    setTimeout(function () {
      document.querySelector(".leaflet-control-attribution").style.display =
        "none";
    }, 8000);
  };

  let markers_group_eq = new L.FeatureGroup();
  let earthquake_layer = function () {
    if (map.hasLayer(markers_group_eq)) {
      map.removeLayer(markers_group_eq);
      return false;
    }

    const today = new Date();
    const two_days_before = new Date(Date.now() - 24 * 3600 * 1000);

    fetch(
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=" +
        formatDate(two_days_before, "yy-mm-dd") +
        "&endtime=" +
        formatDate(today, "yy-mm-dd")
      //"&latitude=47&longitude=7&maxradiuskm=1800"
    )
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        L.geoJSON(data, {
          // Marker Icon
          pointToLayer: function (feature, latlng) {
            if (feature.properties.type == "earthquake") {
              let t = L.marker(latlng, {
                icon: L.divIcon({
                  html: '<i class="eq-marker" style="color: red"></i>',
                  iconSize: [10, 10],
                  className: "earthquake-marker",
                }),
              }).openTooltip();
              t.addTo(markers_group_eq);
              map.addLayer(markers_group_eq);

              windowOpen = "map";
            }
          },

          // Popup
          onEachFeature: function (feature, layer) {
            console.log(feature);
          },
        }).addTo(map);
      });
  };

  let formDat = function (timestamp) {
    (date = new Date(timestamp * 1000)),
      (datevalues = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        sec: date.getSeconds(),
      });

    return datevalues;
  };

  let running = false;
  let k;
  let weather_layer,
    weather_layer0,
    weather_layer1,
    weather_layer2,
    weather_layer3;

  function weather_map() {
    let weather_url;
    if (running == true) {
      top_bar("", "", "");
      map.removeLayer(weather_layer);
      map.removeLayer(weather_layer0);
      map.removeLayer(weather_layer1);
      map.removeLayer(weather_layer2);
      map.removeLayer(weather_layer3);
      clearInterval(k);
      running = false;
      return false;
    }

    fetch("https://api.rainviewer.com/public/maps.json")
      .then(function (response) {
        running = true;
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
            top_bar(
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
            top_bar(
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
            top_bar(
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
            top_bar(
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
            top_bar(
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
        toaster("Can't load weather data", 3000);
      });
  }
  return {
    follow_icon,
    default_icon,
    goal_icon,
    select_icon,
    attribution,
    moon_map,
    earthquake_layer,
    toner_map,
    opentopo_map,
    owm_layer,
    osm_map,
    weather_map,
    railway_layer,
    caching_tiles,
    delete_cache,
  };
})();
