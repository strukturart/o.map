"use strict";

let save_mode = "";
let scale;
const debug = false;
let contained = []; //markers in viewport
let overpass_query = ""; //to toggle overpass layer

//groups
let markers_group = new L.FeatureGroup();
let overpass_group = new L.FeatureGroup();
let measure_group_path = new L.FeatureGroup();
let measure_group = new L.FeatureGroup();
let tracking_group = new L.FeatureGroup();
let gpx_group = new L.FeatureGroup();
let geoJSON_group = new L.FeatureGroup();

var jsonLayer = L.geoJSON("", { color: "red" });
let map;
let tracking_timestamp = [];
let myMarker;
let gpx_selection_info = {};
let tilesLayer = "";
let n;

let gps_lock;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let routing = {
  start: "",
  end: "",
  data: "",
  active: false,
  closest: "",
  loaded: false,
  auto_routing: false,
  auto_update: false,
};

let mainmarker = {
  target_marker: "",
  selected_marker: "",
  gpx_selection_latlng: [],
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
  accuracyAlt: 0,
  map: "unknown",
  positionHasChanged: false,
  last_location:
    localStorage.getItem("last_location") != null
      ? JSON.parse(localStorage.getItem("last_location"))
      : [0, 0],
};

let setting = {
  export_path: "",
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

let status = {
  intro: true,
  geolocation: false,
  tracking_running: false,
  live_track: false,
  live_track_id: [],
  visible: "visible",
  caching_tiles_started: false,
  marker_selection: false,
  path_selection: false,
  windowOpen: "map",
  selected_marker: "",
  appOpendByUser: true,
  closedByUser: false,
  live_track_file_created: false,
  tracking_backupup_at: new Date().getTime() / 1000,
  tracking_paused: false,
  keylock: false,
  screenOff: false,
  follow_path: false,
};

if (!navigator.geolocation) {
  helper.toaster("Your device does't support geolocation!", 2000);
}

if ("requestWakeLock" in navigator) {
  gps_lock = window.navigator.requestWakeLock("gps");
}

if ("b2g" in Navigator) {
  try {
    if ("serviceWorker" in navigator) {
      try {
        navigator.serviceWorker
          .register("sw.js", {
            scope: "/",
          })
          .then((registration) => {
            registration.systemMessageManager.subscribe("activity").then(
              (rv) => {
                alert("installed");
              },
              (error) => {}
            );
          });
      } catch (e) {
        console.log(e);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

//leaflet add basic map
map = L.map("map-container", {
  zoomControl: false,
  dragging: false,
  keyboard: true,
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
  osm.get_user();
  settings.load_settings();

  let routing_service_callback = function (e) {
    //clean layer
    jsonLayer.clearLayers();
    jsonLayer.addData(e);
    let i;
    let instructions = [];
    let p;
    let reverse_2D_array;

    //fly to start point
    L.geoJSON(e, {
      onEachFeature: function (feature) {
        if (feature.geometry != "") {
          //fly to start
          p = feature.geometry.coordinates[0];

          reverse_2D_array = feature.geometry.coordinates.map((row) =>
            row.reverse()
          );

          routing.coordinates = reverse_2D_array;

          document.getElementById("routing-distance").innerText =
            module.convert_units(
              "kilometer",
              feature.properties.summary.distance
            );

          document.getElementById("routing-ascent").innerText =
            module.convert_units("meter", feature.properties.ascent);

          document.getElementById("routing-descent").innerText =
            module.convert_units("meter", feature.properties.descent);

          document.getElementById("routing-duration").innerText =
            module.format_ms(feature.properties.summary.duration * 1000);

          let m = feature.geometry.coordinates[0];
          let mm =
            feature.geometry.coordinates[
              feature.geometry.coordinates.length - 1
            ];

          i = feature.properties.segments[0].steps;

          //if the file is a routing file
          if (i.length > 0) {
            try {
              geoJSON_group.clearLayers();
              // Remove the layer, only if it is not myMarker
              if (routing.end_marker_id != myMarker._leaflet_id) {
                markers_group.removeLayer(routing.end_marker_id);
              }
              // Remove the layer, only if it is not myMarker
              if (routing.start_marker_id != myMarker._leaflet_id) {
                markers_group.removeLayer(routing.start_marker_id);
              }
            } catch (err) {}

            // Here, the coordinates are organised as [alt, lat, long]
            let m = feature.geometry.coordinates[0];
            let mm =
              feature.geometry.coordinates[
                feature.geometry.coordinates.length - 1
              ];

            // Reverse from file
            let routing_start = [m[1], m[2]];
            let routing_end = [mm[1], mm[2]];

            //add marker
            let s = L.marker(routing_start).addTo(markers_group);
            let f = L.marker(routing_end).addTo(markers_group);
            //set routing object
            routing.start_marker_id = s._leaflet_id;
            routing.end_marker_id = f._leaflet_id;

            s.setIcon(maps.start_icon);
            f.setIcon(maps.end_icon);
          }
        }
      },
    });

    //reverse
    n = L.geoJSON(e, {
      onEachFeature: function (feature) {
        if (feature.geometry != "") {
          reverse_2D_array = feature.geometry.coordinates.map((row) =>
            row.reverse()
          );

          routing.coordinates = reverse_2D_array;
        }
      },
    });

    routing.data = e;

    i.forEach(function (value, index) {
      instructions.push({
        instruction: value.instruction,
        index: index + 2,
      });
    });

    rs.routing_instructions(instructions);
    routing.loaded = true;
    document.querySelectorAll(".routing-profile-status").forEach((e) => {
      e.innerText = setting.routing_profil;
    });
    if (!routing.auto_update)
      helper.side_toaster(
        "the track has been loaded, to see information about it open the menu with enter",
        10000
      );
  };

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

  if ("b2g" in navigator) {
    load_ads();
    let manifest = function (a) {
      document.getElementById("intro-footer").innerText =
        "Version " + a.version;
    };
    helper.getManifest(manifest);
  } else {
    let manifest = function (a) {
      document.getElementById("intro-footer").innerText =
        "O.MAP Version " + a.manifest.version;
      if (a.installOrigin == "app://kaios-plus.kaiostech.com") {
        load_ads();
      } else {
        let t = document.getElementById("kaios-ads").remove();
      }
    };

    helper.getManifest(manifest);
  }

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
    status.intro = false;
  }, 5000);

  //add group layers
  map.addLayer(markers_group);
  map.addLayer(overpass_group);
  map.addLayer(measure_group);
  map.addLayer(measure_group_path);
  map.addLayer(tracking_group);
  map.addLayer(gpx_group);
  map.addLayer(geoJSON_group);

  jsonLayer.addTo(map);

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
    //KaiOS 2.x
    try {
      //search gpx
      let finder_gpx = new Applait.Finder({
        type: "sdcard",
        debugMode: false,
      });

      finder_gpx.search(".gpx");
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
          module.loadGPX(fileinfo.path + "/" + fileinfo.name);
        }
      });
    } catch (e) {}

    //KaiOS 3.x

    let list_files_callback = function (e) {
      document.getElementById("gpx-title").style.display = "block";

      let filename = e.split("/");
      filename = filename[filename.length - 1];

      document
        .querySelector("div#gpx")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="gpx" data-filename="' +
            filename +
            '" data-filepath="' +
            e +
            '">' +
            filename +
            "</div>"
        );

      if (filename.substring(0, 1) == "_") {
        module.loadGPX(e);
      }
    };

    try {
      helper.list_files("gpx", list_files_callback);
    } catch (e) {
      console.log(e);
    }
  };

  //////////////////////////////////
  //FIND GEOJSON////////////////////////
  /////////////////////////////////
  document.getElementById("tracks-title").style.display = "none";

  let find_geojson = function () {
    try {
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
            '<div class="item" data-map="geojson" data-filename="' +
              fileinfo.name +
              '" data-filepath="' +
              fileinfo.path +
              "/" +
              fileinfo.name +
              '">' +
              fileinfo.name +
              "</div>"
          );

        //load startup item

        if (fileinfo.name.substring(0, 1) == "_") {
          module.loadGeoJSON(fileinfo.path + "/" + fileinfo.name, false);
        }
      });
    } catch (e) {}

    //KaiOS 3.x

    let list_files_callback = function (e) {
      document.getElementById("tracks-title").style.display = "block";

      let filename = e.split("/");
      filename = filename[filename.length - 1];

      document
        .querySelector("div#tracksmarkers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="geojson" data-filename="' +
            filename +
            '" data-filepath="' +
            e +
            '">' +
            filename +
            "</div>"
        );

      if (filename.substring(0, 1) == "_") {
        module.loadGeoJSON(e, false);
      }
    };

    try {
      helper.list_files("geojson", list_files_callback);
    } catch (e) {
      console.log(e);
    }
  };

  //////////////////////////////////
  //LOAD MAPS////////////////////////
  /////////////////////////////////

  let load_maps = function () {
    let search_callback = (e) => {
      let data = "";
      let reader = new FileReader();

      reader.onerror = function () {
        reader.abort();
      };

      reader.onloadend = function () {
        //check if json valid

        try {
          data = JSON.parse(reader.result);
        } catch (e) {
          helper.toaster("JSON is not valid", 2000);
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

      reader.readAsText(e);
    };
    try {
      helper.search_file("omap_maps.json", search_callback);
    } catch (e) {
      console.log(e);
    }
  };
  ///////////////
  ///OSM SERVER
  /////////////

  let osm_server_list_gpx = function () {
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

  let osm_server_load_gpx = function (id, filename, download) {
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

        //download file
        if (download == true) {
          helper.downloadFile(filename, data, callback_download);
        } else {
          new L.GPX(gpx, {
            async: true,
          })
            .on("loaded", function (e) {
              map.fitBounds(e.target.getBounds());
            })
            .addTo(gpx_group);

          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
        }
      })

      .catch((error) => {
        helper.side_toaster(error, 2000);
      });
  };

  if (localStorage.getItem("openstreetmap_token") == null) {
    document.getElementById("osm-server-gpx-title").style.display = "none";
  } else {
    osm_server_list_gpx();
    document.getElementById("osm-server-gpx-title").style.display = "block";
  }
  //callback download file
  let callback_download = function (filename, filepath) {
    helper.side_toaster("downloaded successfully", 2000);

    document
      .querySelector("div#gpx")
      .nextSibling.insertAdjacentHTML(
        "afterend",
        "<div class='item' data-map='gpx' data-filename='" +
          filename +
          "' data-filepath='" +
          filepath +
          "'>" +
          filename +
          "</div>"
      );

    finder_tabindex();
  };

  const osm_oauth_callback = function () {
    document.getElementById("osm-user").innerText =
      "logged in as " + general.osm_user;
  };

  let gpx_callback = function (filename) {
    helper.side_toaster(filename + " saved", 3000);

    document
      .querySelector("div#gpx")
      .nextSibling.insertAdjacentHTML(
        "afterend",
        "<div class='item' data-map='gpx' data-filename='" +
          filename +
          "' data-filepath='" +
          filename +
          "'>" +
          filename +
          "</div>"
      );
  };

  /////openweather callback
  ////build elements in weather panel

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
    let n = document.querySelectorAll("div[data-type]");
    n.forEach(function (e) {
      e.style.background = "black";
      e.style.color = "white";
      e.classList.remove("active-layer");
    });

    n.forEach(function (e) {
      if (e.getAttribute("data-url") == general.last_map) {
        e.style.background = "white";
        e.style.color = "black";
        e.classList.add("active-layer");
      }

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
    document.querySelector("div#finder").style.display = "block";
    finder_navigation("start");
    status.windowOpen = "finder";

    activelayer();
    mapcenter_position();

    //openweather request
    if (setting.openweather_api == "") return false;
    let c = map.getCenter();

    if (setting.openweather_api != "") {
      weather.openweather_call(
        c.lat,
        c.lng,
        setting.openweather_api,
        openweather_callback
      );
    }
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
      document.querySelector("#cross").classList.add("unavailable");
      myMarker = L.marker([0, 0]).addTo(markers_group);
      myMarker.setIcon(maps.default_icon);
      map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
      setTimeout(function () {
        mainmarker.current_lat = mainmarker.device_lat;
        mainmarker.current_lng = mainmarker.device_lng;
      }, 5000);

      helper.side_toaster("try to determine your position", 3000);
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 15000,
    };

    function success(pos) {
      document.querySelector("#cross").classList.remove("unavailable");

      helper.side_toaster("Position  found", 2000);
      status.geolocation = true;
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
        geolocationWatch();
        document.getElementById("cross").style.opacity = 1;
        return true;
      }
    }

    function error(err) {
      if (setting.ipbase_api != "") {
        var z = confirm(
          "do you want to find out your position by your ip address ?"
        );
      }

      if (z == true) {
        helper.geoip(geoip_callback, setting.ipbase_api);
      } else {
        helper.side_toaster(
          "Position not found, load last known position",
          4000
        );
        mainmarker.current_lat = mainmarker.last_location[0];
        mainmarker.current_lng = mainmarker.last_location[1];
        mainmarker.current_alt = 0;

        mainmarker.device_lat = mainmarker.last_location[0];
        mainmarker.device_lng = mainmarker.last_location[1];
        geolocationWatch();
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
  let geoLoc = navigator.geolocation;
  let crd;

  let geolocationWatch = function () {
    function showLocation(position) {
      document.querySelector("#cross").classList.remove("unavailable");
      status.gps_data_received = Math.round(Date.now() / 1000);
      crd = position.coords;

      //store device location
      mainmarker.device_lat = crd.latitude;
      mainmarker.device_lng = crd.longitude;

      document.querySelector("section#device-position div.lat span").innerText =
        crd.latitude.toFixed(2);

      document.querySelector("section#device-position div.lng span").innerText =
        crd.longitude.toFixed(2);
      //accuracy
      if (crd.accuracy) {
        if (status.geolocation == false) {
          helper.side_toaster(
            "the position of your device could now be found.",
            2000
          );
        }
        status.geolocation = true;
        mainmarker.accuracy = crd.accuracy;

        if (general.measurement_unit == "km") {
          document.querySelector(
            "section#device-position div.accuracy span"
          ).innerText = crd.accuracy.toFixed(2);
        }

        if (general.measurement_unit == "mil") {
          let n = crd.accuracy * 3.280839895;
          document.querySelector(
            "section#device-position div.accuracy span"
          ).innerText = n.toFixed(2);
        }
      }

      //alitude
      if (crd.altitude) {
        mainmarker.device_alt = parseInt(crd.altitude);
        if (general.measurement_unit == "km") {
          document.querySelector(
            "section#device-position div.altitude span"
          ).innerText = mainmarker.device_alt;
        }

        if (general.measurement_unit == "mil") {
          let n = crd.altitude * 3.280839895;
          document.querySelector(
            "section#device-position div.altitude span"
          ).innerText = mainmarker.device_alt;
        }
      } else {
        document.querySelector(
          "section#device-position div.altitude span"
        ).innerText = "unknow";
      }

      if (crd.altitudeAccuracy) {
        mainmarker.accuracyAlt = crd.altitudeAccuracy;

        document.querySelector(
          "section#device-position div.alt-accuracy span"
        ).innerText = crd.altitudeAccuracy;
      } else {
        document.querySelector(
          "section#device-position div.alt-accuracy span"
        ).innerText = "unknow";
      }

      //heading
      if (crd.heading) {
        mainmarker.current_heading = crd.heading;
        mainmarker.device_heading = crd.heading;
        document.querySelector(
          "section#device-position div.heading span"
        ).innerText = crd.heading.toFixed(2);
      } else {
        document.querySelector(
          "section#device-position div.heading span"
        ).innerText = "unknow";
      }
      //speed
      if (crd.speed) {
        mainmarker.device_speed = crd.speed;

        if (general.measurement_unit == "km") {
          let n = crd.speed * 3.6;
          n = n.toFixed(2);

          document.querySelector(
            "section#device-position div.speed span"
          ).innerText = n + " km/h";
        }

        if (general.measurement_unit == "mil") {
          let n = crd.speed * 2.236936;
          n = n.toFixed(2);

          document.querySelector(
            "section#device-position div.speed span"
          ).innerText = n + " mph";
        }
      } else {
        document.querySelector(
          "section#device-position div.speed span"
        ).innerText = "unknow";
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

      let j = localStorage.getItem("last_location");

      //store location as fallout
      let b = JSON.stringify([crd.latitude, crd.longitude]);
      //test if position has changed
      if (j !== b) {
        mainmarker.positionHasChanged = true;
      } else {
        mainmarker.positionHasChanged = false;
      }

      localStorage.setItem("last_location", b);

      if (routing.active && routing.auto_update) {
        routing_auto_update();
      }

      //update main marker

      myMarker
        .setLatLng([mainmarker.device_lat, mainmarker.device_lng])
        .update();

      if (mainmarker.auto_view_center) {
        map.flyTo(new L.LatLng(mainmarker.device_lat, mainmarker.device_lng));
      }

      //distances

      if (routing.active && routing.auto_routing == false) {
        module.get_closest_point(routing.coordinates);
      }

      if (status.follow_path == true) {
        module.get_closest_point(general.gpx_selection_latlng);
      }

      distance_to_target();
    }

    function errorHandler(err) {
      console.log(err.code);
      document.querySelector("#cross").classList.add("unavailable");

      if (err.code == 1) {
        helper.side_toaster("Error: Access is denied!", 2000);
      }
      if (err.code == 2) {
        helper.side_toaster("Error: Position is unavailable!", 2000);
      }
      if (err.code == 3) {
        helper.side_toaster("Position is unavailable!", 2000);
      }
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 35000,
    };
    watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
  };

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

  ////routing auto update polyline

  let last_update = dayjs();
  let routing_auto_update = () => {
    const date1 = dayjs();
    let k = date1.diff(last_update, "second");
    if (k < 4) {
      return; // Break the function if the difference is smaller than 4 seconds
    }
    last_update = dayjs();

    if (routing.auto_routing == false) return false;

    routing.start = mainmarker.device_lng + "," + mainmarker.device_lat;

    rs.request(
      routing.start,
      routing.end,
      setting.ors_api,
      setting.routing_profil,
      routing_service_callback
    );
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

      if (item_value == "auto_update_route") {
        routing.active = true;
        routing.auto_routing = true;
        routing.auto_update = true;
        bottom_bar("", "", "");

        document.querySelector(".loader").style.display = "block";
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";

        routing.end =
          mainmarker.selected_marker._latlng.lng +
          "," +
          mainmarker.selected_marker._latlng.lat;

        routing.start = mainmarker.device_lng + "," + mainmarker.device_lat;

        rs.request(
          routing.start,
          routing.end,
          setting.ors_api,
          setting.routing_profil,
          routing_service_callback
        );

        map.flyTo([mainmarker.device_lat, mainmarker.device_lng], 16);

        auto_update_view();
      }

      if (item_value == "set_target_marker") {
        mainmarker.target_marker = mainmarker.selected_marker._latlng;
        mainmarker.selected_marker.setIcon(maps.goal_icon);
        helper.side_toaster(
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

      if (item_value == "change-profile") {
        rs.change_type();
        rs.request(
          routing.start,
          routing.end,
          setting.ors_api,
          setting.routing_profil,
          routing_service_callback
        );
      }

      if (item_value == "set_marker_route_start") {
        rs.addPoint("start", "add", mainmarker.selected_marker._latlng);
        document.querySelector("div#markers-option").style.display = "none";

        status.windowOpen = "map";
        bottom_bar("", "", "");
        setTimeout(function () {
          if (routing.start && routing.end) {
            status.routing = true;
            rs.request(
              routing.start,
              routing.end,
              setting.ors_api,
              setting.routing_profil,
              routing_service_callback
            );
          }
        }, 1000);
      }
      if (item_value == "set_marker_route_end") {
        rs.addPoint("end", "add", mainmarker.selected_marker._latlng);
        document.querySelector("div#markers-option").style.display = "none";

        status.windowOpen = "map";
        bottom_bar("", "", "");
        setTimeout(function () {
          if (routing.start && routing.end) {
            status.routing = true;
            rs.request(
              routing.start,
              routing.end,
              setting.ors_api,
              setting.routing_profil,
              routing_service_callback
            );
          }
        }, 1000);
      }

      if (item_value == "remove_marker") {
        map.removeLayer(mainmarker.selected_marker);
        mainmarker.selected_marker.removeFrom(markers_group);
        helper.side_toaster("marker removed", 4000);
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";
        bottom_bar("", "", "");
        module.set_f_upd_markers();
      }

      if (item_value == "save_marker") {
        document.querySelector("div#markers-option").style.display = "none";
        save_mode = "geojson-single";
        module.user_input("open", "", "save this marker as geojson file");
        bottom_bar("cancel", "", "save");
      }

      if (item_value == "delete-file") {
        document.querySelector("div#files-option").style.display = "none";
        helper.deleteFile(general.active_item.getAttribute("data-filepath"));
        setTimeout(function () {
          open_finder();
        }, 1500);
      }

      if (item_value == "rename-file") {
        document.querySelector("div#files-option").style.display = "none";
        status.windowOpen = "user-input";
        save_mode = "rename-file";
        let string =
          "if you want the file to be loaded automatically when you start the app, start the file name with the _ character";
        //remove
        let n = general.active_item.getAttribute("data-filename").split(".");
        module.user_input("open", n[0], string);
        bottom_bar("cancel", "rename", "");
      }

      if (item_value == "download-file") {
        osm_server_load_gpx(
          general.active_item.getAttribute("data-id"),
          general.active_item.innerText,
          true
        );
        document.querySelector("div#files-option").style.display = "none";
        open_finder();
        general.active_item.focus();
      }

      if (item_value == "upload-file-to-osm") {
        document.querySelector("div#files-option").style.display = "none";
        open_finder();
        general.active_item.focus();
        module.loadGPX_data(
          general.active_item.getAttribute("data-filepath"),
          osm.osm_server_upload_gpx
        );
      }
    }
  };

  const marker_text = document.querySelector("input#popup");
  marker_text.addEventListener("blur", (event) => {
    let c = document.querySelector("input#popup").value;
    if (c != "")
      mainmarker.selected_marker.bindPopup(c, module.popup_option).openPopup();
  });

  //FINDER

  function addMapLayers() {
    if (
      document.activeElement.classList.contains("item") &&
      status.windowOpen == "finder"
    ) {
      top_bar("", "", "");
      bottom_bar("", "", "");

      //custom maps and layers from json file
      if (document.activeElement.classList.contains("active-layer")) {
        maps.addMap("");

        return false;
      }
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
          module.loadGPX(document.activeElement.getAttribute("data-filepath"));
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
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

        if (item_value == "savelocation") {
          document.querySelector("div#finder").style.display = "none";
          save_mode = "geojson-single";
          module.user_input("open");
          setTimeout(function () {
            bottom_bar("cancel", "", "save");
          }, 1000);
        }

        if (item_value == "saverouting") {
          save_mode = "routing";
          module.user_input("open", "", "save route as geoJSON file");
          setTimeout(function () {
            bottom_bar("cancel", "", "save");
          }, 1000);
        }

        if (item_value == "change-profile") {
          rs.change_type();
          rs.request(
            routing.start,
            routing.end,
            setting.ors_api,
            setting.routing_profil,
            routing_service_callback
          );
        }

        if (item_value == "resetrouting") {
          rs.reset_routing();
        }
        if (item_value == "follow-path") {
          if (setting.routing_notification == false) {
            helper.side_toaster(
              "You have to activate the notification in the settings of the app",
              3000
            );
            return false;
          }

          if (status.follow_path == false) {
            status.follow_path = true;
            document.querySelector("div#finder").style.display = "none";
            status.windowOpen = "map";
            helper.side_toaster(
              "you will get a warning if you are too far off the path",
              3000
            );
          } else {
            status.follow_path = false;
            helper.side_toaster("off", 3000);
          }
        }

        if (item_value === "startrouting") {
          // If item_value is "startrouting"
          // Call the auto_update_view function
          auto_update_view();
          status.auto_routing = false;

          // Check the value of routing.active and perform the appropriate action
          switch (routing.active) {
            case true:
              routing.active = false;
              helper.side_toaster("Routing paused", 2000);

              document.activeElement.innerText = "start";
              break;

            case false:
              routing.active = true;
              helper.side_toaster("Routing started", 2000);
              document.activeElement.innerText = "stop";
              break;

            default:
              console.log("Invalid value of routing.active");
              break;
          }
        }

        if (item_value == "export") {
          document.querySelector("div#finder").style.display = "none";
          save_mode = "geojson-collection";
          module.user_input("open");
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
          helper.side_toaster(
            "please close the menu and press key 1 to start tracking.",
            3000
          );
        }

        if (item_value == "draw-path") {
          helper.side_toaster(
            "please close the menu and press key 7 to draw a path.",
            3000
          );
        }

        if (item_value == "add-marker-icon") {
          helper.side_toaster(
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

        //add geoJson data
        if (item_value == "geojson") {
          module.loadGeoJSON(
            document.activeElement.getAttribute("data-filepath"),
            routing_service_callback
          );

          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
        }

        //add gpx data from osm
        if (item_value == "gpx-osm") {
          osm_server_load_gpx(
            document.activeElement.getAttribute("data-id"),
            "",
            false
          );
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

    document
      .querySelectorAll("div#files-option div")
      .forEach(function (e, index) {
        e.style.display = "block";
      });

    if (general.active_item.getAttribute("data-map") == "gpx") {
      document
        .querySelectorAll("div.only-gpx-local")
        .forEach(function (e, index) {
          e.style.display = "block";
        });
    }

    if (general.active_item.getAttribute("data-map") == "geojson") {
      document
        .querySelectorAll("div.only-gpx-local")
        .forEach(function (e, index) {
          e.style.display = "block";
        });
    }

    if (general.active_item.getAttribute("data-map") == "gpx-osm") {
      document
        .querySelectorAll("div.only-gpx-local")
        .forEach(function (e, index) {
          e.style.display = "none";
        });
    }

    document.querySelectorAll("#files-option div").forEach(function (e) {
      e.classList.add("item");
    });

    let p = 0;
    document.querySelectorAll("#files-option div.item").forEach(function (e) {
      e.classList.add("item");

      if (e.style.display == "block") {
        e.classList.add("item");
        e.setAttribute("tabindex", p++);
      } else {
        e.classList.remove("item");
      }
    });

    document.querySelector("#files-option div.item[tabindex='0']").focus();
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

  let count = 0;
  let panels;

  let finder_navigation = function (dir) {
    let finder_panels = [];

    panels = document.querySelectorAll("div#finder div.panel");
    panels.forEach(function (e) {
      finder_panels.push({
        name: e.getAttribute("name"),
        id: e.getAttribute("id"),
      });
    });
    //remove finder pages

    if (!setting.tips_view) {
      finder_panels = finder_panels.filter((e) => e.id != "tips");
    }

    if (!setting.openweather_api) {
      finder_panels = finder_panels.filter((e) => e.id != "weather");
    }

    if (status.select_gpx == true) {
      finder_panels = finder_panels.filter((e) => e.id != "gpx-file-info");
    }

    if (!status.tracking_running) {
      finder_panels = finder_panels.filter((e) => e.id != "tracking");
    }

    if (!status.geolocation) {
      finder_panels = finder_panels.filter((e) => e.id != "coordinations");
    }

    if (!routing.loaded) {
      finder_panels = finder_panels.filter((e) => e.id != "routing");
    }
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
    document.getElementById(finder_panels[count].id).focus();

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

    if (finder_panels[count].id == "gpx-file-info") {
      bottom_bar("", "", "");
      console.log(document.querySelectorAll("#gpx-file-info > .item").length);
      document.querySelectorAll("#gpx-file-info  > .item")[0].focus();
    }
    if (finder_panels[count].id == "tracking") {
      bottom_bar("", "", "");
    }

    if (finder_panels[count].id == "settings") {
      if (general.osm_user) {
        document.getElementById("osm-user").innerText =
          "logged in as " + general.osm_user;
      }
    }

    if (finder_panels[count].id == "routing") {
      console.log("hey. " + setting.routing_profil);
      document.querySelectorAll(".item")[0].focus();
      bottom_bar("", "", "");
      document.querySelector("button.routing-profile-status").innerText =
        setting.routing_profil;
    }
    focus_after_selection();
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
      status.activeElement = document.activeElement;
      //get items from current

      let b = document.activeElement.closest("div.menu-box");
      let items_list = b.querySelectorAll(".item");

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

  const input = document.getElementById("export-path");
  const regex = new RegExp("^[a-zA-Z0-9_.-]*$");

  input.addEventListener("beforeinput", (event) => {
    if (event.target.value != null && !regex.test(event.target.value))
      helper.toaster("I recommend you not to use the sign", 2000);
  });

  //qr scan listener
  const qr_listener = document.querySelectorAll("input.qr");
  let qrscan = false;
  qr_listener.forEach(function (e) {
    e.addEventListener("focus", () => {
      bottom_bar("qr-scan", "", "");
      qrscan = true;
    });

    e.addEventListener("blur", (event) => {
      qrscan = false;
      bottom_bar("", "", "");
    });
  });

  document.querySelectorAll(".select-box").forEach(function (e) {
    e.addEventListener("keypress", function (n) {
      setTimeout(function () {
        e.parentElement.focus();
      }, 200);
    });
  });

  let focus_after_selection = function () {
    if (document.querySelectorAll(".select-box") == null) return false;
    document.querySelectorAll(".select-box").forEach(function (e) {
      e.addEventListener("blur", function (k) {
        setTimeout(function () {
          e.parentElement.focus();
        }, 200);
      });
    });
  };

  //callback from sw, osm oauth
  const channel = new BroadcastChannel("sw-messages");
  channel.addEventListener("message", (event) => {
    //callback from osm OAuth

    if (event.data.oauth_success) {
      //callback from  OAuth
      //ugly method to open a new window, because a window from sw clients.open can no longer be closed
      const l = event.data.oauth_success;
      if (event.data.oauth_success) {
        setTimeout(() => {
          window.open(l);
        }, 5000);
      }

      setTimeout(() => {
        localStorage.setItem("openstreetmap_token", event.data.oauth_success);
        osm_server_list_gpx();
      }, 3000);
    }
  });

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
      case "*":
        if (status.keylock) {
          status.keylock = false;
          helper.side_toaster("key unlocked", 3000);
        } else {
          status.keylock = true;

          helper.side_toaster("key locked", 3000);
        }

        break;
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
        status.closedByUser = true;
        status.appOpendByUser = false;
        status.tracking_running = false;
        window.close();
        break;

      case "1":
        if (status.windowOpen == "map") {
          if (status.tracking_running) {
            return false;
          } else {
            if (status.geolocation == false) {
              helper.side_toaster(
                "can't start tracking, the position of your device could not be determined.",
                4000
              );
              return false;
            }
            helper.side_toaster(
              "tracking started,\n stop tracking with key 1",
              4000
            );
            status.live_track = true;
            module.measure_distance("tracking");
            status.tracking_running = true;

            var d = new Date();
            d.setMinutes(d.getMinutes() + 1);
            keepalive.add_alarm(d, "keep alive");
          }
        }
        break;
    }
  }

  ///////////////
  ////SHORTPRESS
  //////////////

  function shortpress_action(param) {
    if (status.keylock) {
      switch (param.key) {
        case "Backspace":
          preventDefault();
          break;
        case "EndCall":
          preventDefault();
          break;
        case "Enter":
          document.querySelector("body").classList.contains("screenOff")
            ? document.querySelector("body").classList.remove("screenOff")
            : document.querySelector("body").classList.add("screenOff");
          break;
      }
      return false;
    }
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
          windowOpen = "finder";

          general.active_item.focus();

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

        if (status.windowOpen === "map") {
          status.closedByUser = false;
          localStorage.setItem("status", JSON.stringify(status));

          break;
        }

        break;

      case "EndCall":
        localStorage.setItem("app_closed", "by_user");
        status.closedByUser = true;
        window.close();
        break;

      case "SoftLeft":
      case "Control":
        if (status.windowOpen == "user-input" && save_mode == "rename-file") {
          module.user_input("close");
          status.windowOpen = "finder";
          save_mode = "";
          break;
        }
        if (status.windowOpen == "user-input") {
          module.user_input("close");
          save_mode = "";
          if (status.tracking_paused) {
            status.tracking_running = true;
            status.tracking_paused = false;
          }
          break;
        }
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

        if (status.windowOpen == "map") {
          ZoomMap("out");
          break;
        }

        if (status.windowOpen == "finder" && qrscan == true) {
          status.windowOpen = "scan";
          let t = document.activeElement;
          qr.start_scan(function (scan_callback) {
            let slug = scan_callback;
            document.activeElement.value = slug;
            status.windowOpen = "finder";
            t.focus();
          });

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
          module.user_input("open", "", "save this marker as geojson file");
          bottom_bar("cancel", "", "save");

          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-single"
        ) {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_geojson(
            setting.export_path + w + ".geojson",
            "single-direct"
          );
          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-single"
        ) {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_geojson(setting.export_path + w + ".geojson", "single");
          save_mode = "";
          break;
        }

        if (status.windowOpen == "user-input" && save_mode == "geojson-path") {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_geojson(setting.export_path + w + ".geojson", "path");
          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-collection"
        ) {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_geojson(
            setting.export_path + w + ".geojson",
            "collection"
          );

          save_mode = "";
          break;
        }

        if (status.windowOpen == "user-input" && save_mode == "routing") {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_geojson(setting.export_path + w + ".geojson", "routing");
          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-tracking"
        ) {
          let w;
          if (module.user_input("return") == "") {
            w = dayjs().format("YYYY-MM-DD-HH-mm");
          } else {
            w = module.user_input("return");
          }

          geojson.save_gpx(
            setting.export_path + w + ".gpx",
            "tracking",
            gpx_callback
          );
          save_mode = "";
          status.live_track = false;
          status.live_track_id = [];

          if (status.tracking_paused) {
            status.tracking_running = false;
            status.tracking_paused = false;
          }
          break;
        }

        if (status.windowOpen == "map") {
          ZoomMap("in");
          break;
        }

        if (status.windowOpen == "user-input" && save_mode != "geojson") {
          let filename = module.user_input("return");
          break;
        }

        if (status.windowOpen == "finder") {
          if (
            document.activeElement.getAttribute("data-map") == "gpx" ||
            document.activeElement.getAttribute("data-map") == "geojson" ||
            document.activeElement.getAttribute("data-map") == "gpx-osm"
          ) {
            show_files_option();
          }
          break;
        }

        break;

      case "Enter":
        if (status.intro) return false;
        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-tracking"
        ) {
          module.user_input("close");
          module.measure_distance("destroy_tracking");
          status.live_track = false;
          status.live_track_id = [];
          save_mode = "";
          break;
        }

        if (status.windowOpen == "user-input" && save_mode == "routing") {
          break;
        }

        if (status.windowOpen == "user-input" && save_mode == "rename-file") {
          helper.renameFile(
            general.active_item.getAttribute("data-filepath"),
            module.user_input("return")
          );
          status.windowOpen = "finder";
          save_mode = "";
          break;
        }

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
          document.activeElement.children[1].focus();
          if (document.activeElement.type == "checkbox") {
            settings.save_chk(
              document.activeElement.id,
              document.activeElement.value
            );
          }
        }

        if (status.windowOpen == "search") {
          search.search_return_data();

          map.setView([olc_lat_lng[0], olc_lat_lng[1]]);
          search.hideSearch();
          mainmarker.current_lat = Number(olc_lat_lng[0]);
          mainmarker.current_lng = Number(olc_lat_lng[1]);
          helper.side_toaster("press 5 to save the marker", 2000);
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
          osm.OAuth_osm(osm_oauth_callback);

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

          document.querySelector("input#popup").value = "";

          let pu = mainmarker.selected_marker.getPopup();

          if (pu != undefined) {
            document.querySelector("input#popup").value = pu._content;
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
            helper.side_toaster("tracking paused", 5000);
            save_mode = "geojson-tracking";
            module.user_input("open", "", "Save as GPX file");
            bottom_bar("cancel", "don't save", "save");

            keepalive.remove_alarm();
            status.tracking_running = false;
            status.tracking_paused = true;
            //live tracking
            //upload track, before save local
            let t = new Date().getTime() / 1000;
            t = t + 320;
            status.tracking_backupup_at = t;
            keepalive.remove_alarm();

            return true;
          } else {
            if (status.geolocation == false) {
              helper.side_toaster(
                "can't start tracking, the position of your device could not be determined.",
                4000
              );
              return false;
            }
            helper.side_toaster(
              "tracking started,\n stop tracking with key 1",
              4000
            );
            module.measure_distance("tracking");
            status.tracking_running = true;

            var d = new Date();
            d.setMinutes(d.getMinutes() + 1);
            keepalive.add_alarm(d, "keep alive");
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
        break;

      case "6":
        module.select_gpx();
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
          module.user_input("open", "", "save all markers as geojson file");
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
        if (status.intro) return false;
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
    localStorage.setItem("status", JSON.stringify(status));

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
    //delete text
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
});

if (debug) {
  window.onerror = function (msg, url, linenumber) {
    alert(
      "Error message: " + msg + "\nURL: " + url + "\nLine Number: " + linenumber
    );
    return true;
  };
}
