////////////////////
////MAPS////////////
///////////////////
const maps = (() => {
  //caching settings from settings panel
  if (settings[1] != "") {
    caching_time = Number(settings[1]) * 86400000;
  } else {
    caching_time = 86400000;
  }
  if (settings[2] != "") {
    zoom_depth = Number(settings[2]);
  } else {
    zoom_depth = 5;
  }

  let caching_events = function () {
    // Listen to cache hits and misses and spam the console
    tilesLayer.on("tilecachehit", function (ev) {
      //console.log('Cache hit: ', ev.url);
    });
    tilesLayer.on("tilecachemiss", function (ev) {
      //console.log('Cache miss: ', ev.url);
    });
    tilesLayer.on("tilecacheerror", function (ev) {
      //console.log('Cache error: ', ev.tile, ev.error);
    });
  };

  let caching_tiles = function () {
    let swLat = map.getBounds()._southWest.lat;
    let swLng = map.getBounds()._southWest.lng;
    let neLat = map.getBounds()._northEast.lat;
    let neLng = map.getBounds()._northEast.lng;

    var bbox = L.latLngBounds(L.latLng(swLat, swLng), L.latLng(neLat, neLng));
    tilesLayer.seed(bbox, 0, Number(settings.load_settings()[2]));

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

  function owm_layer() {
    tilesUrl =
      "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" +
      openweather_api;
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

  function railway_layer() {
    tilesUrl = "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png";

    tilesLayer = L.tileLayer(tilesUrl, {
      useCache: true,
      saveToCache: false,
      crossOrigin: true,
      cacheMaxAge: caching_time,
      useOnlyCache: false,
      maxZoom: 18,

      attribution:
        'Daten <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap-Mitwirkende</a>, Grafik: <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="http://www.openrailwaymap.org/">OpenRailwayMap</a>',
    });

    map.addLayer(tilesLayer);
    caching_events();
  }

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
        weather_layer0 = L.tileLayer(weather_url);

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

        let tilesUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
        let tilesLayer = L.tileLayer(tilesUrl, {
          maxZoom: 18,
        });

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
            top_bar(
              "",
              moment.unix(data[data.length - 4]).format("DD.MM.YYYY, HH:MM:SS"),
              ""
            );
            //top_bar("", "a", "");
          }

          if (i == 1) {
            map.removeLayer(weather_layer);
            map.addLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            top_bar(
              "",
              moment.unix(data[data.length - 4]).format("DD.MM.YYYY, HH:MM:SS"),
              ""
            );
            //top_bar("", "a", "");
          }

          if (i == 2) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.addLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            top_bar(
              "",
              moment.unix(data[data.length - 3]).format("DD.MM.YYYY, HH:MM:SS"),
              ""
            );
          }

          if (i == 3) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.addLayer(weather_layer2);
            map.removeLayer(weather_layer3);
            top_bar(
              "",
              moment.unix(data[data.length - 2]).format("DD.MM.YYYY, HH:MM:SS"),
              ""
            );
          }
          if (i == 4) {
            map.removeLayer(weather_layer);
            map.removeLayer(weather_layer0);
            map.removeLayer(weather_layer1);
            map.removeLayer(weather_layer2);
            map.addLayer(weather_layer3);
            top_bar(
              "",
              moment.unix(data[data.length - 1]).format("DD.MM.YYYY, HH:MM:SS"),
              ""
            );
          }
          if (i == 5) {
            i = 0;
          }
        }, 2000);
      })
      .catch(function (err) {
        toaster("Can't load weather data", 3000);
      });
  }
  return {
    moon_map,
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
