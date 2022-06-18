"use strict";

let save_mode = "";
let markers_group = new L.FeatureGroup();
let overpass_group = new L.FeatureGroup();
let contained = []; //markers in viewport
let overpass_query = ""; //to toggle overpass layer

let measure_group_path = new L.FeatureGroup();
let measure_group = new L.FeatureGroup();
let tracking_group = new L.FeatureGroup();
let tracking_timestamp = [];
let myMarker;
let tilesLayer = "";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let mainmarker = {
  target_marker: "",
  selected_marker: "",
  startup_markers:
    localStorage.getItem("startup_markers") != null
      ? JSON.parse(localStorage.getItem("startup_markers"))
      : [],
  startup_marker_toggle: false,
  tracking_distance: 0,
  auto_view_center: false,
  device_lat: "",
  device_lng: "",
  device_alt: "",
  device_speed: 0,
  current_lng: 0,
  current_lat: 0,
  current_alt: 0,
  current_heading: 0,
  accuracy: 0,
  map: "unknown",
  last_location:
    localStorage.getItem("last_location") != null
      ? JSON.parse(localStorage.getItem("last_location"))
      : [0, 0],
};

let setting = {
  export_path:
    localStorage.getItem("export-path") != null
      ? localStorage.getItem("export-path")
      : "",
  osm_tag: localStorage.getItem("osm-tag"),

  cache_time: localStorage["cache-time"] || "10",
  cache_zoom: localStorage["cache-zoom"] || "12",
  openweather_api: localStorage.getItem("owm-key"),
  crosshair:
    localStorage.getItem("crosshair") != null
      ? JSON.parse(localStorage.getItem("crosshair"))
      : true,
  scale:
    localStorage.getItem("scale") != null
      ? JSON.parse(localStorage.getItem("scale"))
      : true,
  tracking_screenlock:
    localStorage.getItem("tracking_screenlock") != null
      ? JSON.parse(localStorage.getItem("tracking_screenlock"))
      : true,

  measurement:
    localStorage.getItem("measurement") != null
      ? JSON.parse(localStorage.getItem("measurement"))
      : true,
  measurement_unit: "",
};

let general = {
  osm_token:
    localStorage.getItem("openstreetmap_token") != null
      ? localStorage.getItem("openstreetmap_token")
      : "",
  step: 0.001,
  zoomlevel: 12,
  measurement_unit: "km",
  active_item: "",
  active_layer: [],
  last_map:
    localStorage.getItem("last_map") != null
      ? localStorage.getItem("last_map")
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
};

setting.measurement == true
  ? (setting.measurement_unit = "km")
  : (setting.measurement_unit = "mil");

let status = {
  tracking_running: false,
  visible: "visible",
  caching_tiles_started: false,
  marker_selection: false,
  path_selection: false,
  windowOpen: "map",
  sub_status: "",
  crash:
    localStorage.getItem("crash") != null
      ? JSON.parse(localStorage.getItem("crash"))
      : false,
};

if (status.crash) {
  helper.toaster("the app has probably experienced a crash", 2000);
}

if (!navigator.geolocation) {
  helper.toaster("Your device does't support geolocation!", 2000);
}

//leaflet add basic map
let map = L.map("map-container", {
  zoomControl: false,
  dragging: false,
  keyboard: true,
});

let scale = L.control.scale({
  position: "topright",
  metric: setting.measurement,
  imperial: setting.measurement ? false : true,
});

map.on("load", function () {
  maps.addMap(
    general.last_map,
    "Map data &copy; OpenStreetMap contributors, CC-BY-SA",
    18,
    "map"
  );
});

document.addEventListener("DOMContentLoaded", function () {
  //load KaiOs ads or not
  let load_ads = function () {
    var js = document.createElement("script");
    js.type = "text/javascript";
    js.src = "assets/js/kaiads.v5.min.js";

    js.onload = function () {
      getKaiAd({
        publisher: "4408b6fa-4e1d-438f-af4d-f3be2fa97208",
        app: "omap",
        slot: "omap",
        test: 0,
        timeout: 10000,
        h: 220,
        w: 220,
        container: document.getElementById("kaios-ads"),
        onerror: (err) => console.error("Error:", err),
        onready: (ad) => {
          ad.on("close", () => console.log("close event"));

          // user clicked the ad
          ad.on("click", () => console.log("click event"));

          // user closed the ad (currently only with fullscreen)
          ad.on("close", () => console.log("close event"));

          // the ad succesfully displayed
          ad.on("display", () => console.log("display event"));

          // Ad is ready to be displayed
          // calling 'display' will display the ad
          ad.call("display", {
            navClass: "item",
            display: "block",
          });
        },
      });
    };
    document.head.appendChild(js);
  };

  //load settings
  settings.load_settings();

  let manifest = function (a) {
    document.getElementById("intro-footer").innerText =
      "O.MAP Version " + a.manifest.version;
    if (a.installOrigin == "app://kaios-plus.kaiostech.com") {
      load_ads();
    } else {
      console.log("Ads free");
      let t = document.getElementById("kaios-ads").remove();
    }
  };

  helper.getManifest(manifest);

  let geoip_callback = function (data) {
    helper.side_toaster(
      "your position was found out via your ip address, the accuracy is rather poor",
      2000
    );
    mainmarker.current_lat = data[0];
    mainmarker.current_lng = data[1];

    mainmarker.device_lat = data[0];
    mainmarker.device_lng = data[1];
    myMarker.setLatLng([mainmarker.device_lat, mainmarker.device_lng]).update();
    console.log(data[0] + "/" + data[1]);
    setTimeout(function () {
      map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
    }, 1000);
  };

  setTimeout(function () {
    //get location if not an activity open url
    document.querySelector("div#intro").style.display = "none";
    build_menu();
    module.startup_marker("", "add");
    getLocation("init");

    status.windowOpen = "map";
  }, 5000);

  //add group layers
  map.addLayer(markers_group);
  map.addLayer(overpass_group);
  map.addLayer(measure_group);
  map.addLayer(measure_group_path);
  map.addLayer(tracking_group);

  //build menu
  let build_menu = function () {
    document.querySelector("div#tracksmarkers").innerHTML = "";
    document.querySelector("div#maps").innerHTML = "";
    document.querySelector("div#layers").innerHTML = "";
    document.querySelector("div#overpass").innerHTML = "";
    document.querySelector("div#gpx").innerHTML = "";

    let el = document.querySelector("div#maps");
    el.innerHTML = "";
    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-type="map" data-url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" data-maxzoom="18" data-attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community">Satellite Map</div>'
    );
    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-type="map" data-url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" data-maxzoom="18" data-attribution="Map data &copy; OpenStreetMap contributors, CC-BY-SA">Openstreetmap</div>'
    );

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-type="map" data-url="https://tile.opentopomap.org/{z}/{x}/{y}.png" data-maxzoom="18" data-attribution="Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap</a>(CC-BY-SA)">OpenTopoMap</div>'
    );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item"  data-type="none" data-url="weather" data-map="weather">Weather <i>Layer</i></div>'
      );

    document
      .querySelector("div#overpass")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item"  data-type="overpass" data-url="water" data-map="water">Drinking water <i>Layer</i></div>'
      );

    find_gpx();
    find_geojson();
    load_maps();
  };

  //////////////////////////////////
  //READ GPX////////////////////////
  /////////////////////////////////
  document.getElementById("gpx-title").style.display = "none";

  let find_gpx = function () {
    //search gpx
    let finder_gpx = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });

    finder_gpx.search(".gpx");
    finder_gpx.on("searchComplete", function (needle, filematchcount) {});

    finder_gpx.on("fileFound", function (file, fileinfo, storageName) {
      document.getElementById("gpx-title").style.display = "block";

      document
        .querySelector("div#gpx")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="gpx" data-filename="' +
            fileinfo.name +
            '" data-filepath="' +
            fileinfo.path +
            "/" +
            fileinfo.name +
            '">' +
            fileinfo.name +
            "</div>"
        );
      //load gpx file on start
      if (fileinfo.name.substring(0, 1) == "_") {
        module.loadGPX(fileinfo.name);
      }
    });
  };

  //////////////////////////////////
  //FIND GEOJSON////////////////////////
  /////////////////////////////////
  document.getElementById("tracks-title").style.display = "none";

  let find_geojson = function () {
    //search geojson
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(".geojson");

    finder.on("searchComplete", function (needle, filematchcount) {});
    finder.on("fileFound", function (file, fileinfo, storageName) {
      document.getElementById("tracks-title").style.display = "block";

      document
        .querySelector("div#tracksmarkers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="geojson">' + fileinfo.name + "</div>"
        );

      //load startup item

      if (fileinfo.name.substring(0, 1) == "_") {
        module.loadGeoJSON(fileinfo.name);
      }
    });
  };

  //////////////////////////////////
  //LOAD MAPS////////////////////////
  /////////////////////////////////

  let load_maps = function () {
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search("omap_maps.json");

    finder.on("searchComplete", function (needle, filematchcount) {});
    finder.on("fileFound", function (file, fileinfo, storageName) {
      let data = "";
      let reader = new FileReader();

      reader.onerror = function (event) {
        reader.abort();
      };

      reader.onloadend = function (event) {
        //check if json valid
        try {
          data = JSON.parse(event.target.result);
        } catch (e) {
          helper.toaster("Json is not valid", 2000);
          return false;
        }

        data.forEach(function (key) {
          if (key.type == "map") {
            document
              .querySelector("div#maps")
              .insertAdjacentHTML(
                "afterend",
                '<div class="item" data-type="' +
                  key.type +
                  '"  data-maxzoom="' +
                  key.maxzoom +
                  '"  data-url="' +
                  key.url +
                  '" data-attribution="' +
                  key.attribution +
                  '">' +
                  key.name +
                  "</div>"
              );
          }

          if (key.type == "overlayer") {
            document
              .querySelector("div#layers")
              .insertAdjacentHTML(
                "afterend",
                '<div class="item" data-type="' +
                  key.type +
                  '"  data-maxzoom="' +
                  key.maxzoom +
                  '"  data-url="' +
                  key.url +
                  '" data-attribution="' +
                  key.attribution +
                  '">' +
                  key.name +
                  "</div>"
              );
          }

          if (key.type == "overpass") {
            document
              .querySelector("div#overpass")
              .insertAdjacentHTML(
                "afterend",
                '<div class="item" data-type="' +
                  key.type +
                  '"  data-maxzoom="' +
                  key.maxzoom +
                  '"  data-url="' +
                  key.url +
                  '" data-attribution="' +
                  key.attribution +
                  '">' +
                  key.name +
                  "</div>"
              );
          }
        });
      };

      reader.readAsText(file);
    });
  };
  ///////////////
  ///OSM SERVER
  /////////////

  let osm_server_list_gpx = function () {
    console.log("load osm");
    let n = "Bearer " + localStorage.getItem("openstreetmap_token");

    const myHeaders = new Headers({
      Authorization: n,
    });

    return fetch("https://api.openstreetmap.org/api/0.6/user/gpx_files", {
      method: "GET",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
        document.querySelector("div#osm-server-gpx").innerHTML = "";
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        let s = xml.getElementsByTagName("gpx_file");
        //filter by tag
        for (let i = 0; i < s.length; i++) {
          if (setting.osm_tag == null || setting.osm_tag == "") {
            let m = {
              name: s[i].getAttribute("name"),
              id: s[i].getAttribute("id"),
            };

            document
              .querySelector("div#osm-server-gpx")
              .insertAdjacentHTML(
                "afterend",
                '<div class="item" data-id=' +
                  m.id +
                  ' data-map="gpx-osm">' +
                  m.name +
                  "</div>"
              );
          } else {
            for (let n = 0; n < s[i].childNodes.length; n++) {
              if (s[i].childNodes[n].tagName == "tag") {
                if (s[i].childNodes[n].textContent == setting.osm_tag) {
                  let m = {
                    name: s[i].getAttribute("name"),
                    id: s[i].getAttribute("id"),
                  };

                  document
                    .querySelector("div#osm-server-gpx")
                    .insertAdjacentHTML(
                      "afterend",
                      '<div class="item" data-id=' +
                        m.id +
                        ' data-map="gpx-osm">' +
                        m.name +
                        "</div>"
                    );
                }
              }
            }
          }
        }
      })

      .catch((error) => {
        console.log(error);
      });
  };

  let osm_server_load_gpx = function (id) {
    console.log("token: " + general.osm_token);
    let n = "Bearer " + localStorage.getItem("openstreetmap_token");

    const myHeaders = new Headers({
      Authorization: n,
      Accept: "application/gpx+xml",
    });

    return fetch("https://api.openstreetmap.org/api/0.6/gpx/" + id + "/data", {
      method: "GET",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        var gpx = data;
        new L.GPX(gpx, {
          async: true,
        })
          .on("loaded", function (e) {
            map.fitBounds(e.target.getBounds());
          })
          .addTo(map);

        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
      })

      .catch((error) => {
        helper.side_toaster(error, 2000);
      });
  };

  let osm_server_upload_gpx = function (filename, gpx_data) {
    let n = "Bearer " + general.osm_token;
    const myHeaders = new Headers({
      Authorization: n,
    });

    var blob = new Blob([gpx_data], {
      type: "application/gpx",
    });

    let formData = new FormData();
    formData.append("description", "uploaded from o.map");
    formData.append("visibility", "private");
    formData.append("file", blob, filename);

    return fetch("https://api.openstreetmap.org/api/0.6/gpx/create", {
      method: "POST",
      body: formData,
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        helper.side_toaster("file uploaded", 4000);
      })

      .catch((error) => {
        helper.side_toaster(error, 4000);
      });
  };

  let OAuth_osm = function () {
    let n = window.location.href;
    const url = new URL("https://www.openstreetmap.org/oauth2/authorize");
    url.searchParams.append("response_type", "code");
    url.searchParams.append(
      "client_id",
      "KEcqDV16BjfRr-kYuOyRGmiQcx6YCyRz8T21UjtQWy4"
    );
    url.searchParams.append(
      "redirect_uri",
      "https://strukturart.github.io/o.map/oauth.html"
    );
    url.searchParams.append("scope", "write_gpx read_gpx");

    const windowRef = window.open(url.toString());

    windowRef.addEventListener("tokens", (ev) => osm_server_list_gpx());
  };

  if (localStorage.getItem("openstreetmap_token") == null) {
    document.getElementById("osm-server-gpx-title").style.display = "none";
  } else {
    osm_server_list_gpx();
    document.getElementById("osm-server-gpx-title").style.display = "block";
  }

  /////openweather callback
  ////build elements in wheater panel

  let getDay = function (dt) {
    let t = new Date(dt);
    return days[t.getDay()];
  };

  function openweather_callback(some) {
    document.querySelector("section#forecast-hourly div.temp").innerText =
      some.hourly[0].temp + " °C";
    document.querySelector(
      "section#forecast-hourly div.description"
    ).innerText = some.hourly[0].weather[0].description;

    for (let i = 0; i < 4; i++) {
      document.querySelector("div#day-" + i + " div.time").innerText = getDay(
        some.daily[i].dt * 1000
      );

      document.querySelector("div#day-" + i + " div.temp").innerText =
        some.daily[i].temp.day + " °C";

      document.querySelector("div#day-" + i + " div.description").innerText =
        some.daily[i].weather[0].description;
    }
  }

  //distance to target marker
  let distance_to_target = function () {
    //device
    let calc = module.calc_distance(
      mainmarker.current_lat,
      mainmarker.current_lng,
      mainmarker.device_lat,
      mainmarker.device_lng,
      general.measurement_unit
    );
    calc = calc / 1000;
    calc.toFixed(2);
    parseFloat(calc);

    document.querySelector(
      "section#device-distance div.distance span"
    ).innerText = calc + " " + general.measurement_unit;

    //map center
    let calc2 = module.calc_distance(
      mainmarker.current_lat,
      mainmarker.current_lng,
      mainmarker.device_lat,
      mainmarker.device_lng,
      general.measurement_unit
    );
    calc2 = calc2 / 1000;
    calc2.toFixed(2);
    parseFloat(calc2);

    document.querySelector(
      "section#mapcenter-distance div.distance span"
    ).innerText = calc2 + " " + general.measurement_unit;

    if (mainmarker.target_marker != undefined) {
      //target marker

      let calc3 = module.calc_distance(
        mainmarker.current_lat,
        mainmarker.current_lng,
        mainmarker.target_marker.lat,
        mainmarker.target_marker.lng,
        general.measurement_unit
      );
      calc3 = calc3 / 1000;
      calc3.toFixed(2);
      parseFloat(calc3);

      document.querySelector(
        "section#mapcenter-distance div.target span"
      ).innerText = calc3 + " " + general.measurement_unit;
    }

    let calc4 = module.calc_distance(
      mainmarker.device_lat,
      mainmarker.device_lng,
      mainmarker.target_marker.lat,
      mainmarker.target_marker.lng,
      general.measurement_unit
    );
    calc4 = calc4 / 1000;
    calc4.toFixed(2);
    parseFloat(calc4);

    document.querySelector(
      "section#device-distance div.target span"
    ).innerText = calc4 + " " + general.measurement_unit;
  };

  //update data fields

  let mapcenter_position = function () {
    let f = map.getCenter();

    mainmarker.current_lat = f.lat;
    mainmarker.current_lng = f.lng;

    //lat lng
    document.querySelector("div#mapcenter div.lat span").innerText =
      f.lat.toFixed(5);
    document.querySelector("div#mapcenter div.lng span").innerText =
      f.lng.toFixed(5);

    //sun
    let n = module.sunrise(f.lat, f.lng);

    document.querySelector("section#mapcenter-sun span.sunrise").innerText =
      n.sunrise;
    document.querySelector("section#mapcenter-sun span.sunset").innerText =
      n.sunset;
  };

  //////////////////////////////////
  ///MENU//////////////////////////
  /////////////////////////////////
  //highlight active layer
  let activelayer = function () {
    console.log(JSON.stringify(general.active_layer));
    let n = document.querySelectorAll("div[data-type]");
    n.forEach(function (e) {
      e.style.background = "black";
      e.style.color = "white";
    });

    n.forEach(function (e) {
      if (e.getAttribute("data-url") == general.last_map) {
        e.style.background = "white";
        e.style.color = "black";
      }

      if (overpass_query == e.getAttribute("data-url")) {
        e.style.background = "white";
        e.style.color = "black";
      }
      console.log(general.active_layer.includes(e.getAttribute("data-url")));
      if (general.active_layer.includes(e.getAttribute("data-url"))) {
        e.style.background = "white";
        e.style.color = "black";
      }
    });
  };
  let tabIndex = 0;

  let finder_tabindex = function () {
    //set tabindex
    let t = -1;
    let items = document.querySelectorAll(".item");
    let items_list = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].parentNode.style.display == "block") {
        items_list.push(items[i]);
        t++;
        items_list[items_list.length - 1].setAttribute("tabIndex", t);
        items_list[0].focus();
      }
    }
  };

  let open_finder = function () {
    settings.load_settings();
    finder_tabindex();
    wikilocation.load();
    document.querySelector("div#finder").style.display = "block";
    finder_navigation("start");
    status.windowOpen = "finder";
    activelayer();
    mapcenter_position();

    //openweather request
    if (setting.openweather_api == "") return false;
    let c = map.getCenter();

    weather.openweather_call(
      c.lat,
      c.lng,
      setting.openweather_api,
      openweather_callback
    );

    distance_to_target();
  };

  //////////////////////////
  ///M A R K E R S//////////
  //////////////////////////

  ////////////////////
  ////GEOLOCATION/////
  ///////////////////
  //////////////////////////
  ////MARKER SET AND UPDATE/////////
  /////////////////////////

  function getLocation(option) {
    if (option == "init") {
      helper.toaster("try to determine your position", 3000);
      myMarker = L.marker([0, 0]).addTo(markers_group);
      myMarker.setIcon(maps.default_icon);
      map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
      setTimeout(function () {
        mainmarker.current_lat = mainmarker.device_lat;
        mainmarker.current_lng = mainmarker.device_lng;
      }, 5000);
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    function success(pos) {
      helper.side_toaster("Position  found", 2000);
      let crd = pos.coords;

      //to store device loaction
      mainmarker.device_lat = crd.latitude;
      mainmarker.device_lng = crd.longitude;
      mainmarker.device_alt = crd.altitude;
      mainmarker.accuracy = crd.accuracy;

      setTimeout(function () {
        map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
      }, 1000);

      //store location as fallout
      let b = [crd.latitude, crd.longitude];
      localStorage.setItem("last_location", JSON.stringify(b));

      if (option == "init") {
        geolocationWatch(true);

        document.getElementById("cross").style.opacity = 1;

        return true;
      }
    }

    function error(err) {
      //helper.toaster("Position not found, load last known position", 4000);
      var z = confirm(
        "do you want to find out your position by your ip address ?"
      );
      if (z == true) {
        helper.geoip(geoip_callback);
      } else {
        helper.toaster("Position not found, load last known position", 4000);
        mainmarker.current_lat = mainmarker.last_location[0];
        mainmarker.current_lng = mainmarker.last_location[1];
        mainmarker.current_alt = 0;

        mainmarker.device_lat = mainmarker.last_location[0];
        mainmarker.device_lng = mainmarker.last_location[1];

        myMarker
          .setLatLng([mainmarker.device_lat, mainmarker.device_lng])
          .update();
        setTimeout(function () {
          map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
        }, 1000);
      }
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  }

  ///////////
  //watch position
  //////////
  let watchID;
  let state_geoloc = false;
  let geoLoc = navigator.geolocation;

  function geolocationWatch() {
    state_geoloc = true;
    function showLocation(position) {
      let crd = position.coords;

      //store device location
      mainmarker.device_lat = crd.latitude;

      document.querySelector("section#device-position div.lat span").innerText =
        crd.latitude.toFixed(2);

      mainmarker.device_lng = crd.longitude;

      document.querySelector("section#device-position div.lng span").innerText =
        crd.longitude.toFixed(2);
      //accuracy
      if (crd.accuracy != undefined || crd.accuracy != null) {
        mainmarker.accuracy = crd.accuracy;

        document.querySelector(
          "section#device-position div.accuracy span"
        ).innerText = crd.accuracy.toFixed(2);
      }

      //alitude
      if (crd.altitude != undefined || crd.altitude != null) {
        mainmarker.device_alt = crd.altitude;

        document.querySelector(
          "section#device-position div.altitude span"
        ).innerText = crd.altitude.toFixed(2);
      }
      //heading
      if (crd.heading != undefined || crd.heading != null) {
        mainmarker.current_heading = crd.heading;
        mainmarker.device_heading = crd.heading;
        document.querySelector(
          "section#device-position div.heading span"
        ).innerText = crd.heading.toFixed(2);
      }
      //speed
      if (crd.speed != undefined || crd.speed != null) {
        mainmarker.device_speed = crd.speed;

        if (setting.measurement_unit == "km") {
          let n = crd.speed * 3.6;
          n = n.toFixed(2);

          document.querySelector(
            "section#device-position div.speed span"
          ).innerText = n + " km/h";
        }

        if (setting.measurement_unit == "mil") {
          let n = crd.speed * 2.236936;
          n = n.toFixed(2);

          document.querySelector(
            "section#device-position div.speed span"
          ).innerText = n + " mph";
        }
      }

      //sun

      let n = module.sunrise(crd.latitude, crd.longitude);

      document.querySelector("section#device-sun  span.sunrise").innerText =
        n.sunrise;
      document.querySelector("section#device-sun  span.sunset").innerText =
        n.sunset;

      if (status.tracking_running == false) {
        myMarker.setIcon(maps.default_icon);
      }
      if (status.tracking_running == true) {
        myMarker.setIcon(maps.follow_icon);
      }

      //store location as fallout
      let b = [crd.latitude, crd.longitude];
      localStorage.setItem("last_location", JSON.stringify(b));

      myMarker
        .setLatLng([mainmarker.device_lat, mainmarker.device_lng])
        .update();

      if (mainmarker.auto_view_center) {
        map.flyTo(new L.LatLng(mainmarker.device_lat, mainmarker.device_lng));
      }

      //distances

      distance_to_target();
    }

    function errorHandler(err) {
      if (err.code == 1) {
        helper.toaster("Error: Access is denied!", 2000);
      } else if (err.code == 2) {
        helper.toaster("Error: Position is unavailable!", 2000);
      }
    }

    let options = {
      timeout: 60000,
    };
    watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
    return true;
  }

  let auto_update_view = function () {
    if (mainmarker.auto_view_center) {
      mainmarker.auto_view_center = false;
      helper.side_toaster("autoupdate view off", 2000);
      document.getElementById("cross").style.opacity = 1;
      return true;
    } else {
      mainmarker.auto_view_center = true;
      helper.side_toaster("autoupdate view on", 2000);
      document.getElementById("cross").style.opacity = 0;
    }
  };

  /////////////////////////
  /////MENU///////////////
  ////////////////////////

  let markers_action = function () {
    if (
      (document.activeElement.className == "item" &&
        status.windowOpen == "markers_option") ||
      status.windowOpen == "files-option"
    ) {
      let item_value = document.activeElement.getAttribute("data-action");
      console.log(item_value);

      if (item_value == "set_target_marker") {
        mainmarker.target_marker = mainmarker.selected_marker._latlng;
        mainmarker.selected_marker.setIcon(maps.goal_icon);
        helper.toaster(
          "target marker set, press enter to be informed about the current distance.",
          4000
        );
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";
        bottom_bar("", "", "");
      }

      if (item_value == "set_startup_marker") {
        module.startup_marker(mainmarker.selected_marker, "set");
        status.windowOpen = "map";
        bottom_bar("", "", "");
      }

      if (item_value == "remove_marker") {
        map.removeLayer(mainmarker.selected_marker);
        mainmarker.selected_marker.removeFrom(markers_group);
        helper.toaster("marker removed", 4000);
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";
        bottom_bar("", "", "");
        module.set_f_upd_markers();
      }

      if (item_value == "save_marker") {
        document.querySelector("div#markers-option").style.display = "none";
        save_mode = "geojson-single";
        user_input("open", "", "save this marker as geojson file");
        bottom_bar("cancel", "", "save");
      }

      if (item_value == "delete-file") {
        document.querySelector("div#files-option").style.display = "none";
        helper.deleteFile(general.active_item.getAttribute("data-filename"));
        document
          .querySelectorAll("div.item[data-map='gpx']")
          .forEach(function (e) {
            e.remove();
          });

        document
          .querySelectorAll("div.item[data-map='geojson']")
          .forEach(function (e) {
            e.remove();
          });
        find_gpx();
        find_geojson();
        setTimeout(function () {
          open_finder();
        }, 1500);
      }

      if (item_value == "upload-file-to-osm") {
        document.querySelector("div#files-option").style.display = "none";
        helper.side_toaster("try uploading track", 2000);
        module.loadGPX_data(
          general.active_item.innerText,
          osm_server_upload_gpx
        );
      }
    }
  };

  const marker_text = document.querySelector("textarea#popup");
  marker_text.addEventListener("blur", (event) => {
    let c = document.querySelector("textarea#popup").value;
    if (c != "")
      mainmarker.selected_marker.bindPopup(c, module.popup_option).openPopup();
  });

  //FINDER

  function addMapLayers() {
    if (
      document.activeElement.classList == "item" &&
      status.windowOpen == "finder"
    ) {
      top_bar("", "", "");
      bottom_bar("", "", "");

      if (document.activeElement.getAttribute("data-map") == "gpx") {
        module.loadGPX(document.activeElement.innerText);
      }

      //custom maps and layers from json file
      if (document.activeElement.hasAttribute("data-url")) {
        let item_url = document.activeElement.getAttribute("data-url");
        let item_type = document.activeElement.getAttribute("data-type");
        let item_attribution =
          document.activeElement.getAttribute("data-attribution");
        let item_maxzoom = document.activeElement.getAttribute("data-maxzoom");

        maps.addMap(item_url, item_attribution, item_maxzoom, item_type);

        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
      }

      //default

      if (document.activeElement.hasAttribute("data-map")) {
        let item_value = document.activeElement.getAttribute("data-map");

        //add gpx data
        if (item_value == "gpx") {
          console.log("gpxhkjhkjhjhj");
          module.loadGPX(document.activeElement.innerText);
        }

        if (item_value == "weather") {
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
          maps.weather_map();
        }

        if (item_value == "share") {
          mozactivity.share_position();
          return true;
        }

        if (item_value == "autoupdate-view") {
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
          auto_update_view();
        }

        if (item_value == "search") {
          status.windowOpen = "map";
          document.querySelector("div#finder").style.display = "none";
          bottom_bar("", "", "");
          search.showSearch();
        }

        if (item_value == "coordinations") {
          document.querySelector("div#finder").style.display = "none";
          coordinations();
        }

        if (item_value == "savelocation") {
          document.querySelector("div#finder").style.display = "none";
          save_mode = "geojson-single";
          user_input("open");
          setTimeout(function () {
            bottom_bar("cancel", "", "save");
          }, 1000);
        }

        if (item_value == "export") {
          document.querySelector("div#finder").style.display = "none";
          save_mode = "geojson-collection";
          user_input("open");
          setTimeout(function () {
            bottom_bar("cancel", "", "save");
          }, 1000);
        }

        if (item_value == "read-qr-marker") {
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "scan";

          qr.start_scan(function (callback) {
            status.windowOpen = "map";
            helper.toaster(callback, 3000);
            module.link_to_marker(callback);
          });
        }

        if (item_value == "tracking") {
          helper.toaster(
            "please close the menu and press key 1 to start tracking.",
            3000
          );
        }

        if (item_value == "draw-path") {
          helper.toaster(
            "please close the menu and press key 7 to draw a path.",
            3000
          );
        }

        if (item_value == "add-marker-icon") {
          helper.toaster(
            "please close the menu and press key 9 to set a marker.",
            3000
          );
        }

        if (item_value == "photo") {
          mozactivity.photo();
        }

        if (item_value == "open_settings_app") {
          mozactivity.openSettings();
        }

        console.log(item_value);

        //add geoJson data
        if (item_value == "geojson") {
          module.loadGeoJSON(document.activeElement.innerText);
        }

        //add gpx data from osm
        if (item_value == "gpx-osm") {
          osm_server_load_gpx(document.activeElement.getAttribute("data-id"));
        }
      }
    }
  }

  /////////////////////
  ////FILES OPTION/////////
  ////////////////////

  let show_files_option = function () {
    general.active_item = document.activeElement;
    document.getElementById("files-option").style.display = "block";
    status.windowOpen = "files-option";
    document.querySelector("div#files-option div.item:first-child").focus();
    bottom_bar("", "select", "");
    tabIndex = 0;
  };

  /////////////////////
  ////ZOOM MAP/////////
  ////////////////////

  function ZoomMap(in_out) {
    let current_zoom_level = map.getZoom();

    if (status.windowOpen == "map" || status.windowOpen == "coordinations") {
      if (in_out == "in") {
        map.setZoom(current_zoom_level + 1);
      }

      if (in_out == "out") {
        map.setZoom(current_zoom_level - 1);
      }
    }
  }

  map.on("zoomend", function (ev) {
    let zoom_level = map.getZoom();
    if (zoom_level < 2) {
      general.step = 20;
    }
    if (zoom_level > 2) {
      general.step = 8;
    }
    if (zoom_level > 3) {
      general.step = 4.5;
    }
    if (zoom_level > 4) {
      general.step = 2.75;
    }
    if (zoom_level > 5) {
      general.step = 1.2;
    }
    if (zoom_level > 6) {
      general.step = 0.5;
    }
    if (zoom_level > 7) {
      general.step = 0.3;
    }
    if (zoom_level > 8) {
      general.step = 0.15;
    }
    if (zoom_level > 9) {
      general.step = 0.075;
    }
    if (zoom_level > 10) {
      general.step = 0.04;
    }
    if (zoom_level > 11) {
      general.step = 0.02;
    }
    if (zoom_level > 12) {
      general.step = 0.01;
    }
    if (zoom_level > 13) {
      general.step = 0.005;
    }
    if (zoom_level > 14) {
      general.step = 0.0025;
    }
    if (zoom_level > 15) {
      general.step = 0.001;
    }
    if (zoom_level > 16) {
      general.step = 0.0005;
    }
  });

  /////////////////////
  //MAP NAVIGATION//
  /////////////////////

  function MovemMap(direction) {
    if (status.windowOpen == "map") {
      mapcenter_position();

      let n = map.getCenter();

      mainmarker.current_lat = n.lat;
      mainmarker.current_lng = n.lng;

      if (direction == "left") {
        mainmarker.current_lng = n.lng - general.step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "right") {
        mainmarker.current_lng = n.lng + general.step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "up") {
        mainmarker.current_lat = n.lat + general.step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "down") {
        mainmarker.current_lat = n.lat - general.step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }
    }
  }

  //////////////////////
  //FINDER NAVIGATION//
  /////////////////////

  let finder_panels = [];
  let count = 0;
  let panels;

  setTimeout(function () {
    panels = document.querySelectorAll("div#finder div.panel");
    panels.forEach(function (e) {
      finder_panels.push({
        name: e.getAttribute("name"),
        id: e.getAttribute("id"),
      });
    });
  }, 1000);

  let finder_navigation = function (dir) {
    tabIndex = 0;

    panels.forEach(function (e) {
      e.style.display = "none";
    });

    if (dir == "+1") {
      count++;
      if (count == finder_panels.length) count = 0;
    }
    if (dir == "-1") {
      count--;
      if (count == -1) count = finder_panels.length - 1;
    }
    document.getElementById(finder_panels[count].id).style.display = "block";
    finder_tabindex();

    top_bar("◀", finder_panels[count].name, "▶");

    bottom_bar("", "select", "");

    if (document.activeElement.classList.contains("input-parent")) {
      bottom_bar("", "edit", "");
      //return;
    }
    if (finder_panels[count].id == "imprint") bottom_bar("", "", "");
    if (finder_panels[count].id == "coordinations") bottom_bar("", "", "");

    if (finder_panels[count].id == "kaios-ads") {
      bottom_bar("", "open", "");
      document.querySelector("#kaios-ads .item").focus();
    }
    if (finder_panels[count].id == "tips") bottom_bar("", "", "");
    if (finder_panels[count].id == "coordinations") {
      bottom_bar("", "", "");
      status.sub_status = "coordinations";
    }
    if (finder_panels[count].id == "tracking") {
      bottom_bar("", "", "");
    }
  };

  function nav(move) {
    if (
      document.activeElement.nodeName == "SELECT" ||
      document.activeElement.type == "date" ||
      document.activeElement.type == "time"
    )
      return false;
    if (
      status.windowOpen == "finder" ||
      status.windowOpen == "markers_option" ||
      status.windowOpen == "files-option"
    ) {
      //nested input field
      if (
        document.activeElement.parentNode.classList.contains("input-parent")
      ) {
        document.activeElement.parentNode.focus();
      }

      //get items from current pannel

      let b;
      let items_list = [];

      b = document.activeElement.parentNode;
      let items = b.querySelectorAll(".item");

      for (let i = 0; i < items.length; i++) {
        if (items[i].parentNode.style.display == "block") {
          items_list.push(items[i]);
        }
      }

      if (move == "+1") {
        if (tabIndex < items_list.length - 1) {
          tabIndex++;
          items_list[tabIndex].focus();
        }
      }

      if (move == "-1") {
        if (tabIndex > 0) {
          tabIndex--;
          items_list[tabIndex].focus();
        }

        if (tabIndex == 0) {
          window.scroll(0, 50);
        }
      }

      if (document.activeElement.classList.contains("input-parent")) {
        bottom_bar("", "edit", "");
      }

      if (
        document.activeElement.getAttribute("data-map") == "gpx" ||
        document.activeElement.getAttribute("data-map") == "geojson"
      ) {
        bottom_bar("", "select", "option");
      }
      // smooth center scrolling
      const rect = document.activeElement.getBoundingClientRect();
      const elY =
        rect.top - document.body.getBoundingClientRect().top + rect.height / 2;

      document.activeElement.parentNode.scrollBy({
        left: 0,
        top: elY - window.innerHeight / 2,
        behavior: "smooth",
      });
    }
  }

  //////////////////////////////
  ///LISTENER//////////////////
  /////////////////////////////

  let t = document.getElementsByTagName("input");
  for (let i = 0; i < t.length; i++) {
    t[i].addEventListener("focus", function () {
      if (document.activeElement.classList.contains("qr")) {
        bottom_bar("qr-scan", "", "");
      }
    });

    t[i].addEventListener("blur", function () {
      this.style.background = "white";
    });
  }

  //qr scan listener
  const qr_listener = document.querySelector("input#owm-key");
  let qrscan = false;
  qr_listener.addEventListener("focus", (event) => {
    bottom_bar("qr-scan", "", "");
    qrscan = true;
  });

  qr_listener.addEventListener("blur", (event) => {
    qrscan = false;
    bottom_bar("", "", "");
  });

  const checkbox = document.getElementById("measurement-ckb");

  checkbox.addEventListener("change", function () {});

  //////////////////////////////
  ////KEYPAD HANDLER////////////
  //////////////////////////////

  let longpress = false;
  const longpress_timespan = 1000;
  let timeout;

  function repeat_action(param) {
    switch (param.key) {
      case "ArrowUp":
        MovemMap("up");
        break;

      case "ArrowDown":
        MovemMap("down");
        break;

      case "ArrowLeft":
        MovemMap("left");
        break;

      case "ArrowRight":
        MovemMap("right");
        break;
    }
  }

  //////////////
  ////LONGPRESS
  /////////////

  function longpress_action(param) {
    switch (param.key) {
      case "0":
        if (status.windowOpen == "finder") {
          addMapLayers("delete-marker");
          return false;
        }

        if (status.windowOpen == "map") {
          maps.weather_map();
          return false;
        }
        break;

      case "Backspace":
        window.close();
        if (status.windowOpen == "map") {
          status.crash = false;
          localStorage.setItem("crash", "false");
          window.goodbye();
        }
        break;

      case "4":
        if (status.windowOpen == "map") {
          geolocationWatch(false);
          screenWakeLock("lock", "gps");
        }

        break;
    }
  }

  ///////////////
  ////SHORTPRESS
  //////////////

  function shortpress_action(param) {
    switch (param.key) {
      case "Backspace":
        if (status.windowOpen == "scan") {
          qr.stop_scan();

          open_finder();
          windowOpen = "finder";
        }

        if (
          document.activeElement.tagName == "TEXTAREA" ||
          document.activeElement.tagName == "INPUT"
        )
          break;

        if (status.windowOpen == "files-option") {
          document.getElementById("files-option").style.display = "none";

          open_finder();

          break;
        }

        if (status.windowOpen != "map") {
          document.querySelector("div#finder").style.display = "none";
          document.querySelector("div#markers-option").style.display = "none";
          status.windowOpen = "map";
          status.marker_selection = false;
          document.activeElement.blur();

          settings.load_settings();

          top_bar("", "", "");
          bottom_bar("", "", "");

          break;
        }

        if (status.windowOpen == "scan") {
          qr.stop_scan();
          status.windowOpen = "setting";
          break;
        }

        break;

      case "EndCall":
        helper.goodbye();
        break;

      case "SoftLeft":
      case "Control":
        if (status.windowOpen == "search") {
          search.hideSearch();
          break;
        }

        if (status.path_selection && status.windowOpen != "user-input") {
          bottom_bar("", "", "");
          status.path_selection = false;
          module.measure_distance("destroy");
          break;
        }

        if (status.windowOpen == "marker") {
          bottom_bar("", "", "");
          status.marker_selection = false;
          status.windowOpen = "map";
          document.getElementById("markers-option").style.display = "none";
        }

        if (status.windowOpen == "user-input") {
          user_input("close");
          save_mode = "";
          break;
        }

        if (status.windowOpen == "map") {
          ZoomMap("out");
          break;
        }

        if (status.windowOpen == "finder" && qrscan == true) {
          status.windowOpen = "scan";

          qr.start_scan(function (callback) {
            let slug = callback;
            document.getElementById("owm-key").value = slug;
          });

          break;
        }
        if (status.windowOpen == "finder" && kaios_ads_click == true) {
          const iframe = document.getElementById("ads-frame");
          const iWindow = iframe.contentWindow;
          const iDocument = iWindow.document;

          // accessing the element
          const element = iDocument.getElementById("KaiOsAd");
          element.click();

          break;
        }

        break;

      case "SoftRight":
      case "Alt":
        if (status.windowOpen == "search") {
          start_search();
          break;
        }
        if (status.path_selection && status.windowOpen == "map") {
          save_mode = "geojson-path";
          user_input("open", "", "save this marker as geojson file");
          bottom_bar("cancel", "", "save");

          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-single-direct"
        ) {
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "single-direct"
          );

          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-single"
        ) {
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "single"
          );

          save_mode = "";
          break;
        }

        if (status.windowOpen == "user-input" && save_mode == "geojson-path") {
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "path"
          );

          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-collection"
        ) {
          geojson.save_geojson(user_input("return") + ".geojson", "collection");
          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-tracking"
        ) {
          //geojson.save_geojson(user_input("return") + ".geojson", "tracking");
          geojson.save_gpx(
            setting.export_path + user_input("return") + ".gpx",
            "tracking"
          );
          save_mode = "";
          break;
        }

        if (status.windowOpen == "map") {
          ZoomMap("in");
          break;
        }

        if (status.windowOpen == "user-input" && save_mode != "geojson") {
          filename = user_input("return");
          break;
        }

        if (status.windowOpen == "finder") {
          if (
            document.activeElement.getAttribute("data-map") == "gpx" ||
            document.activeElement.getAttribute("data-map") == "geojson"
          ) {
            show_files_option();
          }
          break;
        }

        break;

      case "Enter":
        if (status.windowOpen == "map") {
          open_finder();
          status.windowOpen = "finder";
          break;
        }
        if (
          document.activeElement.tagName == "BUTTON" &&
          document.activeElement.classList.contains("link")
        ) {
          window.open(document.activeElement.getAttribute("data-href"));
          break;
        }

        if (document.activeElement.classList.contains("input-parent")) {
          document.activeElement.children[0].focus();
          if (document.activeElement.type == "checkbox") {
            settings.save_chk(
              document.activeElement.id,
              document.activeElement.value
            );
          }
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-tracking"
        ) {
          module.measure_distance("destroy_tracking");

          user_input("close");
          save_mode = "";
          break;
        }

        if (status.windowOpen == "search") {
          search.search_return_data();

          map.setView([olc_lat_lng[0], olc_lat_lng[1]]);
          search.hideSearch();
          mainmarker.current_lat = Number(olc_lat_lng[0]);
          mainmarker.current_lng = Number(olc_lat_lng[1]);
          helper.toaster("press 5 to save the marker", 2000);
          break;
        }

        if (document.activeElement == document.getElementById("clear-cache")) {
          maps.delete_cache();
          break;
        }

        if (
          document.activeElement == document.getElementById("save-settings")
        ) {
          settings.save_settings();
          break;
        }

        if (document.activeElement == document.getElementById("oauth")) {
          OAuth_osm();

          break;
        }

        if (
          document.activeElement == document.getElementById("export-settings")
        ) {
          settings.export_settings();
          break;
        }

        if (
          document.activeElement ==
          document.getElementById("load_settings_from_file")
        ) {
          settings.load_settings_from_file();

          break;
        }

        if (document.activeElement == document.getElementById("owm-key")) {
          bottom_bar("qr.scan", "", "");

          break;
        }

        if (status.windowOpen == "marker") {
          document.querySelector("div#markers-option").style.display = "block";
          document.querySelector("div#markers-option").children[0].focus();
          finder_tabindex();
          status.windowOpen = "markers_option";

          document.querySelector("textarea#popup").value = "";

          let pu = mainmarker.selected_marker.getPopup();

          if (pu != undefined) {
            document.querySelector("textarea#popup").value = pu._content;
          }
          bottom_bar("", "select", "");
          tabIndex = 0;
          break;
        }

        if (
          status.windowOpen == "markers_option" &&
          mainmarker.selected_marker != ""
        ) {
          markers_action();
          break;
        }

        if (status.windowOpen == "files-option") {
          markers_action();
          break;
        }

        if (
          status.windowOpen == "finder" &&
          document.activeElement.classList.contains("item")
        ) {
          addMapLayers();
          break;
        }

        break;

      case "1":
        if (status.windowOpen == "map") {
          if (status.tracking_running) {
            helper.toaster("tracking paused", 5000);
            save_mode = "geojson-tracking";
            user_input("open", "", "Export path as geojson file");
            bottom_bar("cancel", "don't save", "save");
            return true;
          } else {
            status.tracking_running = true;
            helper.toaster(
              "tracking started,\n stop tracking with key 1",
              4000
            );
            module.measure_distance("tracking");
          }
        }
        break;

      case "2":
        if (status.windowOpen == "map") {
          search.showSearch();
        }

        break;

      case "3":
        break;

      case "4":
        if (status.windowOpen == "map") {
          auto_update_view();
        }
        break;

      case "5":
        if (status.windowOpen == "map") {
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
          save_mode = "geojson-single-direct";
          user_input("open", "", "save this marker as geojson file");
          bottom_bar("cancel", "", "save");
          break;
        }

        break;

      case "6":
        break;

      case "7":
        if (status.windowOpen == "map") {
          module.measure_distance("addMarker");
          bottom_bar("close", "", "save");
        }
        break;

      case "8":
        if (status.windowOpen == "map") {
          save_mode = "geojson-collection";
          user_input("open", "", "save all markers as geojson file");
          bottom_bar("cancel", "", "save");
        }

        break;

      case "9":
        if (status.windowOpen == "map") {
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
          module.set_f_upd_markers();
        }
        break;

      case "0":
        if (status.windowOpen == "map") {
          mozactivity.share_position();
        }
        break;

      case "*":
        mainmarker.selected_marker = module.select_marker();

        break;

      case "#":
        if (status.windowOpen == "map") maps.caching_tiles();
        break;

      case "ArrowRight":
        MovemMap("right");

        if (
          status.windowOpen == "finder" &&
          document.activeElement.tagName != "INPUT"
        ) {
          finder_navigation("+1");
        }
        break;

      case "ArrowLeft":
        MovemMap("left");
        if (
          status.windowOpen == "finder" &&
          document.activeElement.tagName != "INPUT"
        ) {
          finder_navigation("-1");
        }
        break;

      case "ArrowUp":
        if (status.windowOpen == "map" || status.windowOpen == "coordinations")
          MovemMap("up");

        if (status.windowOpen == "search") search.search_nav(-1);
        nav("-1");
        break;

      case "ArrowDown":
        if (status.windowOpen == "map" || status.windowOpen == "coordinations")
          MovemMap("down");

        if (status.windowOpen == "search") search.search_nav(+1);

        nav("+1");
        break;
    }
  }

  /////////////////////////////////
  ////shortpress / longpress logic
  ////////////////////////////////

  function handleKeyDown(evt) {
    if (status.visible === "hidden") return false;
    if (evt.key === "Backspace" && status.windowOpen !== "map") {
      evt.preventDefault();
    }

    if (evt.key === "EndCall") {
      evt.preventDefault();
    }

    if (!evt.repeat) {
      longpress = false;
      timeout = setTimeout(() => {
        longpress = true;
        longpress_action(evt);
      }, longpress_timespan);
    }

    if (evt.repeat) {
      if (evt.key == "Backspace") evt.preventDefault();

      longpress = false;
      repeat_action(evt);
    }
  }

  function handleKeyUp(evt) {
    if (status.visible === "hidden") return false;
    evt.preventDefault();

    if (evt.key == "Backspace") evt.preventDefault();

    if (
      evt.key == "Backspace" &&
      status.windowOpen != "map" &&
      status.windowOpen == "finder" &&
      document.activeElement.tagName == "INPUT"
    ) {
      evt.preventDefault();
    }

    clearTimeout(timeout);
    if (!longpress) {
      shortpress_action(evt);
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  document.addEventListener("visibilitychange", function () {
    setTimeout(function () {
      status.visible = document.visibilityState;
    }, 1000);
  });
});
