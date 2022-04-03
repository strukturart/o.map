"use strict";

let save_mode = "";
let markers_group = new L.FeatureGroup();
let measure_group_path = new L.FeatureGroup();
let measure_group = new L.FeatureGroup();
let tracking_group = new L.FeatureGroup();
let myMarker;
let tilesLayer = "";

let mainmarker = {
  target_marker: "",
  selected_marker: "",
  startup_markers:
    localStorage.getItem("startup_markers") != null
      ? JSON.parse(localStorage.getItem("startup_markers"))
      : [],
  startup_marker_toggle: false,
  tracking: false,
  tracking_distance: 0,
  tracking_alt_up: 0,
  tracking_alt_down: 0,
  auto_view_center: false,
  device_lat: "",
  device_lng: "",
  device_alt: "",
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
};

let general = {
  step: 0.001,
  zoomlevel: 12,
  ads: false,
  measurement_unit: "km",
  active_layer: "",
  last_map:
    localStorage.getItem("last_map") != null
      ? localStorage.getItem("last_map")
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
};

setting.measurement == true
  ? (general.measurement_unit = "km")
  : (general.measurement_unit = "mil");

let status = {
  visible: "visible",
  caching_tiles_started: false,
  marker_selection: false,
  path_selection: false,
  windowOpen: "map",
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

//highlight active layer
let active_layer = function () {
  let n = document.querySelectorAll("div[data-type]");
  n.forEach(function (e) {
    e.style.color = "white";
    if (e.getAttribute("data-url") == general.last_map) {
      e.style.color = "red";
    }
  });

  let m = document.querySelectorAll("div[data-map]");
  m.forEach(function (e) {
    e.style.color = "white";
    if (e.getAttribute("data-map") == general.active_layer) {
      e.style.color = "red";
    }
  });
};

document.addEventListener("DOMContentLoaded", function () {
  //load KaiOs ads or not
  settings.load_settings();

  let manifest = function (a) {
    document.getElementById("intro-footer").innerText =
      "O.MAP Version " + a.manifest.version;
    if (a.installOrigin == "app://kaios-plus.kaiostech.com") {
      general.ads = true;
      document.querySelector("#ads-container iframe").src = "ads.html";
    } else {
      console.log("Ads free");
      let t = document.getElementById("kaisos-ads");
      t.remove();
    }
  };

  helper.getManifest(manifest);
  let geoip_callback = function (data) {
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
  map.addLayer(measure_group);
  map.addLayer(measure_group_path);
  map.addLayer(tracking_group);

  //build menu
  let build_menu = function () {
    document.querySelector("div#tracksmarkers").innerHTML = "";
    document.querySelector("div#maps").innerHTML = "";
    document.querySelector("div#layers").innerHTML = "";

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
        '<div class="item" data-map="weather">Weather <i>Layer</i></div>'
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
          '<div class="item" data-map="gpx">' + fileinfo.name + "</div>"
        );

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
        });
      };

      reader.readAsText(file);
    });
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

  let osm_server_load_gpx = function (id) {
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
        console.log(error);
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
    url.searchParams.append("scope", "read_gpx");
    const windowRef = window.open(url.toString());

    windowRef.addEventListener("tokens", (ev) => osm_server_list_gpx());
  };

  if (localStorage.getItem("openstreetmap_token") == null) {
    document.getElementById("osm-server-gpx-title").style.display = "none";
  } else {
    osm_server_list_gpx();
    document.getElementById("osm-server-gpx-title").style.display = "block";
  }

  //////////////////////////////////
  ///MENU//////////////////////////
  /////////////////////////////////
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
    active_layer();
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
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    function success(pos) {
      helper.toaster("Position  found", 2000);

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

  function geolocationWatch(init) {
    state_geoloc = true;
    function showLocation(position) {
      let crd = position.coords;

      if (crd.heading) mainmarker.current_heading = crd.heading;
      mainmarker.accuracy = crd.accuracy;

      //store device location
      mainmarker.device_lat = crd.latitude;
      mainmarker.device_lng = crd.longitude;
      mainmarker.device_alt = crd.altitude;

      if (init) {
        mainmarker.current_lng = crd.longitude;
        mainmarker.current_lat = crd.latitude;
      }

      if (mainmarker.tracking == false) {
        myMarker.setIcon(maps.default_icon);
      }
      if (mainmarker.tracking == true) {
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
      helper.toaster("autoupdate view off", 2000);
      document.getElementById("cross").style.opacity = 1;
      return true;
    } else {
      mainmarker.auto_view_center = true;
      helper.toaster("autoupdate view on", 2000);
      document.getElementById("cross").style.opacity = 0;
    }
  };

  /////////////////////////
  /////MENU///////////////
  ////////////////////////

  let markers_action = function () {
    if (
      document.activeElement.className == "item" &&
      status.windowOpen == "markers_option"
    ) {
      let item_value = document.activeElement.getAttribute("data-action");

      if (item_value == "set_target_marker") {
        mainmarker.target_marker = mainmarker.selected_marker._latlng;
        mainmarker.selected_marker.setIcon(maps.goal_icon);
        helper.toaster(
          "target marker set, press key 6 to be informed about the current distance in the info panel.",
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
      }

      if (item_value == "save_marker") {
        document.querySelector("div#markers-option").style.display = "none";
        save_mode = "geojson-single";
        user_input("open", "", "save this marker as geojson file");
        bottom_bar("cancel", "", "save");
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

  function addMapLayers(action) {
    if (
      document.activeElement.className == "item" &&
      status.windowOpen == "finder"
    ) {
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

        if (item_value == "weather") {
          maps.weather_map();
          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
          //toggle
          if (
            document.activeElement.getAttribute("data-map") ==
            general.active_layer
          ) {
            general.active_layer = "";
          } else {
            general.active_layer =
              document.activeElement.getAttribute("data-map");
          }
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

        //add geoJson data
        if (item_value == "geojson") {
          module.loadGeoJSON(document.activeElement.innerText);
        }

        if (item_value == "geojson" && action == "delete") {
        }

        //add gpx data
        if (item_value == "gpx") {
          module.loadGPX(document.activeElement.innerText);
        }

        if (item_value == "gpx-osm") {
          osm_server_load_gpx(document.activeElement.getAttribute("data-id"));
        }
      }
    }

    top_bar("", "", "");
    bottom_bar("", "", "");
  }

  ////////////////////////////////////////
  ////COORDINATIONS PANEL/////////////////
  ///////////////////////////////////////
  let coordinations = function () {
    status.windowOpen = "coordinations";

    document.querySelector("div#finder").style.display = "none";
    document.querySelector("div#coordinations").style.display = "block";

    if (setting.openweather_api && setting.openweather_api != undefined) {
      document.querySelector("div#coordinations div#weather").style.display =
        "block";

      function openweather_callback(some) {
        document.getElementById("temp").innerText = some.hourly[0].temp + " °C";
        document.getElementById("weather-description").innerText =
          some.hourly[0].weather[0].description;
      }

      let c = map.getCenter();

      weather.openweather_call(
        c.lat,
        c.lng,
        setting.openweather_api,
        openweather_callback
      );
    }

    let update_view = setInterval(() => {
      if (mainmarker.current_lat != "" && mainmarker.current_lng != "") {
        //when marker is loaded from menu

        let f = map.getCenter();

        //https://github.com/mourner/suncalc
        //sunset
        let times = SunCalc.getTimes(new Date(), f.lat, f.lng);
        let sunrise =
          times.sunrise.getHours() + ":" + times.sunrise.getMinutes();
        let sunset = times.sunset.getHours() + ":" + times.sunrise.getMinutes();
        document.getElementById("sunrise").innerText = sunrise;
        document.getElementById("sunset").innerText = sunset;
        //distance to current position
        let calc = module.calc_distance(
          mainmarker.device_lat,
          mainmarker.device_lng,
          f.lat,
          f.lng,
          general.measurement_unit
        );
        calc = calc / 1000;
        calc.toFixed(2);
        parseFloat(calc);

        document.querySelector("div#coordinations div#distance").innerText =
          "to device: " + calc + " " + general.measurement_unit;

        //accurancy
        document.querySelector(
          "div#coordinations div#accuracy span"
        ).innerText = mainmarker.accuracy.toFixed(2);

        document.querySelector("div#coordinations div#lat").innerText =
          "Lat " + mainmarker.current_lat.toFixed(5);
        document.querySelector("div#coordinations div#lng").innerText =
          "Lng " + mainmarker.current_lng.toFixed(5);

        if (mainmarker.current_alt) {
          document.querySelector(
            "div#coordinations div#altitude"
          ).style.display = "block";
          document.querySelector("div#coordinations div#altitude").innerText =
            "alt " + mainmarker.current_alt.toFixed(2);
        } else {
          document.querySelector(
            "div#coordinations div#altitude"
          ).style.display = "none";
        }
        if (mainmarker.current_heading != "unknown") {
          document.querySelector(
            "div#coordinations div#heading"
          ).style.display = "block";
          document.querySelector("div#coordinations div#heading").innerText =
            "heading " + mainmarker.current_heading.toFixed(2);
        } else {
          document.querySelector(
            "div#coordinations div#heading"
          ).style.display = "none";
        }
        //distance to target marker
        if (mainmarker.target_marker != undefined) {
          let calc = module.calc_distance(
            mainmarker.device_lat,
            mainmarker.device_lng,
            mainmarker.target_marker.lat,
            mainmarker.target_marker.lng,
            general.measurement_unit
          );
          calc = calc / 1000;
          calc.toFixed(2);
          parseFloat(calc);

          let k = document.querySelector("div#target");
          k.style.display = "block";
          k.innerText =
            "to the goal marker: " + calc + " " + general.measurement_unit;
        }

        document.querySelector("div#coordinations div#compass").style.display =
          "block";

        if (mainmarker.current_heading != null) {
          document.querySelector("div#coordinations div#compass").innerText =
            "compass " + module.compass(mainmarker.current_heading);
        } else {
          document.querySelector("div#coordinations div#compass").innerText =
            "compass:  ";
        }
      }
      //stop interval
      if (document.querySelector("div#coordinations").style.display == "none")
        clearInterval(update_view);
    }, 1000);
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
    if (status.windowOpen == "map" || status.windowOpen == "coordinations") {
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

  let panels = document.querySelectorAll("div#finder div.panel");

  panels.forEach(function (e) {
    finder_panels.push({
      name: e.getAttribute("name"),
      id: e.getAttribute("id"),
    });
  });

  let finder_navigation = function (dir) {
    tabIndex = 0;

    panels.forEach(function (e) {
      e.style.display = "none";
    });

    if (dir == "start") {
    }

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
      return;
    }

    if (finder_panels[count].id == "imprint") bottom_bar("", "", "");
    if (finder_panels[count].id == "kaisos-ads") bottom_bar("", "", "");
    if (finder_panels[count].id == "tips") bottom_bar("", "", "");
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
      status.windowOpen == "markers_option"
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

  checkbox.addEventListener("change", function () {
    alert();
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

        if (status.windowOpen != "map") {
          document.querySelector("div#finder").style.display = "none";
          document.querySelector("div#markers-option").style.display = "none";
          document.querySelector("div#coordinations").style.display = "none";
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

        if (
          status.windowOpen == "map" ||
          status.windowOpen == "coordinations"
        ) {
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
          geojson.save_geojson(user_input("return") + ".geojson", "tracking");
          save_mode = "";
          break;
        }

        if (
          status.windowOpen == "map" ||
          status.windowOpen == "coordinations"
        ) {
          ZoomMap("in");
          break;
        }

        if (status.windowOpen == "user-input" && save_mode != "geojson") {
          filename = user_input("return");
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
          user_input("close");
          save_mode = "";
          module.measure_distance("destroy_tracking");
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

        if (status.windowOpen == "finder") {
          addMapLayers();
          addMapLayers("delete");

          break;
        }

        break;

      case "1":
        if (status.windowOpen == "map") {
          if (mainmarker.tracking) {
            helper.toaster("tracking paused", 5000);
            save_mode = "geojson-tracking";
            user_input("open", "", "Export path as geojson file");
            bottom_bar("cancel", "don't save", "save");

            return true;
          } else {
            mainmarker.tracking = true;
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
        if (status.windowOpen == "map") {
        }

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
        if (status.windowOpen == "map") coordinations();
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
        console.log(status.windowOpen);
        if (status.windowOpen == "map")
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
        break;

      case "0":
        if (status.windowOpen == "map") {
          //maps.export_mapdata();
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
