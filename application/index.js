"use strict";

let step = 0.001;

//to store device loaction
let device_lat;
let device_lng;

let windowOpen;
let message_body = "";
let selected_marker;

let tilesLayer;
let tileLayer;
let tilesUrl;
let savesearch = false;

let search_current_lng;
let search_current_lat;

let open_url = false;
let marker_latlng = false;

let json_modified = false;

let markers_group = new L.FeatureGroup();

let save_mode; // to check save geojson or update json

let caching_time = 86400000;

let mainmarker = {
  current_lng: "unknown",
  current_lat: "unknown",
  current_alt: "unknown",
  current_heading: "unknown",
  accuracy: "unknown",
  map: "unknown",
  last_location: JSON.parse(localStorage.getItem("last_location")),
};

let target_marker;

let settings_data = settings.load_settings();
let setting = {
  export_path: localStorage.getItem("export-path"),
  owm_key: localStorage.getItem("owm-key"),
  cache_time: localStorage.getItem("cache-time"),
  cache_zoom: localStorage.getItem("cache-zoom"),
  openweather_api: localStorage.getItem("owm-key"),
};

let status = {
  marker_selection: false,
};

if (!navigator.geolocation) {
  toaster("Your device does't support geolocation!", 2000);
}

//leaflet add basic map
let map = L.map("map-container", {
  zoomControl: false,
  dragging: false,
  keyboard: true,
}).fitWorld();

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    document.querySelector("div#intro").style.display = "none";

    //get location if not an activity open url
    if (open_url === false) {
      build_menu();
      getLocation("init");

      toaster("Press 3 to open the menu", 5000);

      setTimeout(function () {
        document.querySelector(".leaflet-control-attribution").style.display =
          "none";
      }, 8000);
    }
    ///set default map
    maps.opentopo_map();
    windowOpen = "map";
  }, 4000);

  L.control
    .scale({
      position: "topright",
      metric: true,
      imperial: false,
    })
    .addTo(map);

  map.addLayer(markers_group);

  let build_menu = function () {
    document.querySelector("div#tracksmarkers").innerHTML = "";
    document.querySelector("div#maps").innerHTML = "";
    document.querySelector("div#layers").innerHTML = "";

    let el = document.querySelector("div#maps");
    el.innerHTML = "";
    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="toner">Toner <i>Map</i></div>'
    );
    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="osm">OSM <i>Map</i></div>'
    );

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="otm">OpenTopo <i>Map</i></div>'
    );

    el.insertAdjacentHTML(
      "afterend",
      '<div class="item" data-map="moon">Moon <i>Map</i></div>'
    );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="weather">Weather <i>Layer</i></div>'
      );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="earthquake">Earthquake <i>Layer</i></div>'
      );

    document
      .querySelector("div#layers")
      .insertAdjacentHTML(
        "afterend",
        '<div class="item" data-map="railway">Railway <i>Layer</i></div>'
      );

    if (settings_data[0]) {
      document
        .querySelector("div#layers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="owm">Open Weather <i>Layer</i></div>'
        );
    }

    find_gpx();
    find_geojson();
  };

  //////////////////////////////////
  //READ GPX////////////////////////
  /////////////////////////////////
  let find_gpx = function () {
    //search gpx
    let finder_gpx = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });

    finder_gpx.search(".gpx");
    finder_gpx.on("searchComplete", function (needle, filematchcount) {});

    finder_gpx.on("fileFound", function (file, fileinfo, storageName) {
      document
        .querySelector("div#gpx")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="gpx">' + fileinfo.name + "</div>"
        );
    });
  };

  //////////////////////////////////
  //READ GEOJSON////////////////////////
  /////////////////////////////////

  let find_geojson = function () {
    //search geojson
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(".geojson");

    finder.on("searchComplete", function (needle, filematchcount) {});
    finder.on("fileFound", function (file, fileinfo, storageName) {
      document
        .querySelector("div#tracksmarkers")
        .insertAdjacentHTML(
          "afterend",
          '<div class="item" data-map="geojson">' + fileinfo.name + "</div>"
        );
    });
  };

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
    finder_tabindex();
    wikilocation.load();
    document.querySelector("div#finder").style.display = "block";
    finder_navigation("start");
    windowOpen = "finder";
  };

  /////////////////////////
  /////Load GPX///////////
  ///////////////////////
  function loadGPX(filename) {
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(filename);

    finder.on("fileFound", function (file, fileinfo, storageName) {
      //file reader

      let reader = new FileReader();

      reader.onerror = function (event) {
        toaster("can't read file", 3000);
        reader.abort();
      };

      reader.onloadend = function (event) {
        var gpx = event.target.result; // URL to your GPX file or the GPX itself

        new L.GPX(gpx, {
          async: true,
        })
          .on("loaded", function (e) {
            map.fitBounds(e.target.getBounds());
          })
          .addTo(map);

        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      };

      reader.readAsText(file);
    });
  }

  //////////////////////////
  ///M A R K E R S//////////
  //////////////////////////

  ////////////////////
  ////GEOLOCATION/////
  ///////////////////
  //////////////////////////
  ////MARKER SET AND UPDATE/////////
  /////////////////////////

  let myMarker;

  function getLocation(option) {
    marker_latlng = false;

    if (option == "init" || option == "update_marker" || option == "share") {
      toaster("seeking position", 3000);
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    function success(pos) {
      let crd = pos.coords;
      mainmarker.current_lat = crd.latitude;
      mainmarker.current_lng = crd.longitude;
      mainmarker.current_alt = crd.altitude;
      mainmarker.current_heading = crd.heading;
      mainmarker.accuracy = crd.accuracy;

      //to store device loaction
      device_lat = crd.latitude;
      device_lng = crd.longitude;

      if (option == "share") {
        mozactivity.share_position();
      }

      //store location as fallout
      let b = [crd.latitude, crd.longitude];
      localStorage.setItem("last_location", JSON.stringify(b));

      if (option == "init") {
        myMarker = L.marker([
          mainmarker.current_lat,
          mainmarker.current_lng,
        ]).addTo(markers_group);

        myMarker.setIcon(maps.default_icon);
        document.getElementById("cross").style.opacity = 1;

        map.setView([mainmarker.current_lat, mainmarker.current_lng], 12);

        zoom_speed();
        return true;
      }

      if (option == "update_marker" && mainmarker.current_lat != "") {
        myMarker
          .setLatLng([mainmarker.current_lat, mainmarker.current_lng])
          .update();
        map.flyTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
        zoom_speed();
      }
    }

    function error(err) {
      toaster("Position not found, load last known position", 4000);

      mainmarker.current_lat = mainmarker.last_location[0];
      mainmarker.current_lng = mainmarker.last_location[1];
      mainmarker.current_alt = 0;

      map.setView([mainmarker.current_lat, mainmarker.current_lng], 12);
      zoom_speed();
      return false;
    }

    navigator.geolocation.getCurrentPosition(success, error, options);
  }

  ///////////
  //watch position
  //////////
  let watchID;
  let state_geoloc = false;

  let wakeLock;

  function geolocationWatch() {
    marker_latlng = false;

    let geoLoc = navigator.geolocation;

    if (state_geoloc == false) {
      toaster("watching postion started", 2000);
      state_geoloc = true;

      function showLocation(position) {
        let crd = position.coords;

        mainmarker.current_lat = crd.latitude;
        mainmarker.current_lng = crd.longitude;
        mainmarker.current_alt = crd.altitude;
        mainmarker.current_heading = crd.heading;
        mainmarker.accuracy = crd.accuracy;

        //store device location
        device_lat = crd.latitude;
        device_lng = crd.longitude;
        myMarker.setIcon(maps.follow_icon);
        document.getElementById("cross").style.opacity = 0;

        if (crd.heading != null) {
          //myMarker.setRotationAngle(crd.heading);
        } else {
          //myMarker.setRotationAngle(0);
        }

        //store location as fallout
        let b = [crd.latitude, crd.longitude];
        localStorage.setItem("last_location", JSON.stringify(b));

        map.flyTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
        myMarker
          .setLatLng([mainmarker.current_lat, mainmarker.current_lng])
          .update();
      }

      function errorHandler(err) {
        if (err.code == 1) {
          toaster("Error: Access is denied!", 2000);
        } else if (err.code == 2) {
          toaster("Error: Position is unavailable!", 2000);
        }
      }

      let options = {
        timeout: 60000,
      };
      watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
      return true;
    }

    if (state_geoloc == true) {
      geoLoc.clearWatch(watchID);
      state_geoloc = false;
      toaster("watching postion stopped", 2000);
      myMarker.setIcon(maps.default_icon);
      //myMarker.setRotationAngle(0);
      document.getElementById("cross").style.opacity = 1;

      return true;
    }
  }

  /////////////////////////
  /////MENU///////////////
  ////////////////////////

  let markers_action = function () {
    if (
      document.activeElement.className == "item" &&
      windowOpen == "markers_option"
    ) {
      let item_value = document.activeElement.getAttribute("data-action");

      if (item_value == "set_target_marker") {
        target_marker = selected_marker._latlng;
        selected_marker.setIcon(maps.goal_icon);
        toaster(
          "goal marker set, press key 4 to be informed about the current distance in the info panel.",
          4000
        );
        document.querySelector("div#markers-option").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "remove_marker") {
        map.removeLayer(selected_marker);
        toaster("marker removed", 4000);
        document.querySelector("div#markers-option").style.display = "none";
        windowOpen = "map";
      }

      bottom_bar("", "", "");
      top_bar("", "", "");
    }
  };

  function addMapLayers() {
    if (document.activeElement.className == "item" && windowOpen == "finder") {
      //switch online maps
      let item_value = document.activeElement.getAttribute("data-map");

      if (item_value == "weather") {
        maps.weather_map();
        document.querySelector("div#finder").style.display = "none";
      }

      if (item_value == "toner") {
        map.removeLayer(tilesLayer);
        maps.toner_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "osm") {
        map.removeLayer(tilesLayer);
        maps.osm_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "moon") {
        map.removeLayer(tilesLayer);
        maps.moon_map();
        document.querySelector("div#finder").style.display = "none";
        map.setZoom(4);
        windowOpen = "map";
      }

      if (item_value == "otm") {
        map.removeLayer(tilesLayer);
        maps.opentopo_map();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "owm") {
        maps.owm_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "railway") {
        maps.railway_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "earthquake") {
        maps.earthquake_layer();
        document.querySelector("div#finder").style.display = "none";
        windowOpen = "map";
      }

      if (item_value == "share") {
        mozactivity.share_position();
        return true;
      }

      if (item_value == "autoupdate-geolocation") {
        windowOpen = "map";
        document.querySelector("div#finder").style.display = "none";
        geolocationWatch();
      }

      if (item_value == "update-position") {
        getLocation("update_marker");
      }

      if (item_value == "search") {
        windowOpen = "map";
        document.querySelector("div#finder").style.display = "none";
        showSearch();
      }

      if (item_value == "coordinations") {
        coordinations("show");
      }

      if (item_value == "savelocation") {
        document.querySelector("div#finder").style.display = "none";
        save_mode = "geojson-single";
        user_input("open");
      }

      if (item_value == "export") {
        document.querySelector("div#finder").style.display = "none";
        save_mode = "geojson-collection";
        user_input("open");
      }

      if (item_value == "add-marker-icon") {
        toaster("please close the menu and press key 9 to set a marker.", 3000);
      }

      if (item_value == "photo") {
        mozactivity.photo();
      }

      //add geoJson data
      if (item_value == "geojson") {
        let finder = new Applait.Finder({
          type: "sdcard",
          debugMode: false,
        });
        finder.search(document.activeElement.innerText);

        finder.on("fileFound", function (file, fileinfo, storageName) {
          //file reader

          let geojson_data = "";
          let reader = new FileReader();

          reader.onerror = function (event) {
            reader.abort();
          };

          reader.onloadend = function (event) {
            //check if json valid
            try {
              geojson_data = JSON.parse(event.target.result);
            } catch (e) {
              toaster("Json is not valid", 2000);
              return false;
            }

            //if valid add layer
            //to do if geojson is marker add to  marker_array[]
            //https://blog.codecentric.de/2018/06/leaflet-geojson-daten/
            L.geoJSON(geojson_data, {
              // Marker Icon
              pointToLayer: function (feature, latlng) {
                let t = L.marker(latlng);
                t.addTo(markers_group);
                map.flyTo(latlng);
                windowOpen = "map";
                json_modified = true;
              },

              // Popup
              onEachFeature: function (feature, layer) {
                console.log(feature);
              },
            }).addTo(map);
            document.querySelector("div#finder").style.display = "none";

            windowOpen = "map";
          };

          reader.readAsText(file);
        });
      }

      //add gpx data
      if (item_value == "gpx") {
        loadGPX(document.activeElement.innerText);
      }
    }

    top_bar("", "", "");
  }

  let compass = function (degree) {
    let a = "N";
    if (degree == 0 || degree == 360) a = "North";
    if (degree > 0 && degree < 90) a = "NorthEast";
    if (degree == 90) a = "East";
    if (degree > 90 && degree < 180) a = "SouthEast";
    if (degree == 180) a = "South";
    if (degree > 180 && degree < 270) a = "SouthWest";
    if (degree == 270) a = "West";
    if (degree > 270 && degree < 360) a = "NorthWest";
    return a;
  };

  ////////////////////////////////////////
  ////COORDINATIONS PANEL/////////////////
  ///////////////////////////////////////
  let corr_toogle = false;
  let coordinations = function () {
    windowOpen = "coordinations";
    let update_view;
    if (!corr_toogle) {
      corr_toogle = true;
      document.querySelector("div#finder").style.display = "none";
      document.querySelector("div#coordinations").style.display = "block";

      if (setting.openweather_api && setting.openweather_api != undefined) {
        document.querySelector("div#coordinations div#weather").style.display =
          "block";

        function openweather_callback(some) {
          document.getElementById("temp").innerText =
            some.hourly[0].temp + " °C";

          document.getElementById("icon").src =
            "https://openweathermap.org/img/w/" +
            some.hourly[0].weather[0].icon +
            ".png";

          let sunset_ts = new Date(some.current.sunset * 1000);
          let sunset = sunset_ts.getHours() + ":" + sunset_ts.getMinutes();

          let sunrise_ts = new Date(some.current.sunrise * 1000);
          let sunrise = sunrise_ts.getHours() + ":" + sunrise_ts.getMinutes();

          document.getElementById("sunset").innerText = sunset;
          document.getElementById("sunrise").innerText = sunrise;
        }

        let c = map.getCenter();

        weather.openweather_call(
          c.lat,
          c.lng,
          setting.openweather_api,
          openweather_callback
        );
      }

      update_view = setInterval(() => {
        console.log(JSON.stringify(mainmarker));

        if (mainmarker.current_lat != "" && mainmarker.current_lng != "") {
          //when marker is loaded from menu

          let f = map.getCenter();
          //distance to current position
          document.querySelector("div#coordinations div#distance").innerText =
            "to device: " +
            module.calc_distance(device_lat, device_lng, f.lat, f.lng);

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
          if (mainmarker.current_heading) {
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
          if (target_marker != null) {
            let k = document.querySelector("div#target");
            k.style.display = "block";
            k.innerText =
              "to the goal marker: " +
              module.calc_distance(
                device_lat,
                device_lng,
                target_marker.lat,
                target_marker.lng
              );
          }

          document.querySelector(
            "div#coordinations div#compass"
          ).style.display = "block";

          if (mainmarker.current_heading != null) {
            document.querySelector("div#coordinations div#compass").innerText =
              "compass " + compass(mainmarker.current_heading);
          } else {
            document.querySelector("div#coordinations div#compass").innerText =
              "compass:  ";
          }
        }
      }, 1000);

      return true;
    }

    if (corr_toogle) {
      document.querySelector("div#coordinations").style.display = "none";
      windowOpen = "map";
      clearInterval(update_view);
      corr_toogle = false;
    }
  };

  /////////////////////
  ////ZOOM MAP/////////
  ////////////////////

  function ZoomMap(in_out) {
    let current_zoom_level = map.getZoom();

    if (
      windowOpen == "map" ||
      (windowOpen == "coordinations" &&
        window.getComputedStyle(document.querySelector("div#search-box"))
          .display == "none")
    ) {
      if (in_out == "in") {
        map.setZoom(current_zoom_level + 1);
      }

      if (in_out == "out") {
        map.setZoom(current_zoom_level - 1);
      }

      zoom_speed();
    }
  }

  function zoom_speed() {
    let zoom_level = map.getZoom();
    if (zoom_level < 2) {
      step = 10;
    }
    if (zoom_level > 2) {
      step = 7.5;
    }
    if (zoom_level > 3) {
      step = 5;
    }
    if (zoom_level > 4) {
      step = 1;
    }
    if (zoom_level > 5) {
      step = 0.5;
    }
    if (zoom_level > 6) {
      step = 0.25;
    }
    if (zoom_level > 7) {
      step = 0.1;
    }
    if (zoom_level > 8) {
      step = 0.075;
    }
    if (zoom_level > 9) {
      step = 0.05;
    }
    if (zoom_level > 10) {
      step = 0.025;
    }
    if (zoom_level > 11) {
      step = 0.01;
    }
    if (zoom_level > 12) {
      step = 0.0075;
    }
    if (zoom_level > 13) {
      step = 0.005;
    }
    if (zoom_level > 14) {
      step = 0.0025;
    }
    if (zoom_level > 15) {
      step = 0.001;
    }
    if (zoom_level > 16) {
      step = 0.0004;
    }
    return step;
  }

  /////////////////////
  //MAP NAVIGATION//
  /////////////////////

  function MovemMap(direction) {
    //if (!marker_latlng) {
    if (windowOpen == "map" || windowOpen == "coordinations") {
      let n = map.getCenter();

      mainmarker.current_lat = n.lat;
      mainmarker.current_lng = n.lng;

      if (direction == "left") {
        zoom_speed();

        mainmarker.current_lng = n.lng - step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "right") {
        zoom_speed();

        mainmarker.current_lng = n.lng + step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "up") {
        zoom_speed();

        mainmarker.current_lat = n.lat + step;
        map.panTo(new L.LatLng(mainmarker.current_lat, mainmarker.current_lng));
      }

      if (direction == "down") {
        zoom_speed();

        mainmarker.current_lat = n.lat - step;
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

  for (let i = 0; i < panels.length; i++) {
    finder_panels.push({
      name: panels[i].getAttribute("name"),
      id: panels[i].getAttribute("id"),
    });
  }

  let finder_navigation = function (dir) {
    tabIndex = 0;

    let d = document.querySelectorAll("div.panel");
    for (let b = 0; b < d.length; b++) {
      d[b].style.display = "none";
    }

    if (dir == "start") {
      document.getElementById(finder_panels[count].id).style.display = "block";
      finder_tabindex();
    }

    if (dir == "+1") {
      count++;
      if (count > finder_panels.length - 1) count = finder_panels.length - 1;
      document.getElementById(finder_panels[count].id).style.display = "block";
      finder_tabindex();
    }
    if (dir == "-1") {
      count--;
      if (count < 0) count = 0;
      document.getElementById(finder_panels[count].id).style.display = "block";
      finder_tabindex();
    }

    top_bar("◀", finder_panels[count].name, "▶");

    if (document.activeElement.classList.contains("input-parent")) {
      document.activeElement.children[0].style.background = "yellow";
      bottom_bar("", "edit", "");
    }
  };

  function nav(move) {
    if (windowOpen == "finder" || windowOpen == "markers_option") {
      bottom_bar("", "select", "");

      if (
        document.activeElement.parentNode.classList.contains("input-parent")
      ) {
        document.activeElement.parentNode.focus();
      }

      var inputs = document.getElementsByTagName("input");
      for (var i = 0; i < inputs.length; ++i) {
        inputs[i].style.background = "white";
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
          document.activeElement.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
        }
      }

      if (move == "-1") {
        if (tabIndex > 0) {
          tabIndex--;
          items_list[tabIndex].focus();
          document.activeElement.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
        }

        if (tabIndex == 0) {
          //to do
          window.scroll(0, 50);
          //document.location.href = "#finder";
        }
      }

      if (document.activeElement.classList.contains("input-parent")) {
        document.activeElement.children[0].style.background = "yellow";
        bottom_bar("", "edit", "");
      }
    }
  }

  //////////////////////////////
  ////MOZ ACTIVITY////////////
  //////////////////////////////

  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler("activity", function (activityRequest) {
      var option = activityRequest.source;
      //gpx
      if (option.name == "open") {
        loadGPX(option.data.url);
      }
      //link
      if (option.name == "view") {
        open_url = true;
        const url_split = option.data.url.split("/");
        current_lat = url_split[url_split.length - 2];
        current_lng = url_split[url_split.length - 1];

        //remove !numbers
        current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
        current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
        current_lat = Number(current_lat);
        current_lng = Number(current_lng);

        myMarker = L.marker([current_lat, current_lng]).addTo(map);
        map.setView([current_lat, current_lng], 13);
        zoom_speed();
      }
    });
  }

  //////////////////////////////
  ///LISTENER//////////////////
  /////////////////////////////
  let t = document.getElementsByTagName("input");
  for (let i = 0; i < t.length; i++) {
    t[i].addEventListener("focus", function () {
      if (document.activeElement.classList.contains("qr")) {
        bottom_bar("", "QR", "");
      }
    });
  }

  //qr scan listener
  const qr_listener = document.querySelector("input#owm-key");
  let qrscan = false;
  qr_listener.addEventListener("focus", (event) => {
    bottom_bar("", "qr", "");
    qrscan = true;
  });

  qr_listener.addEventListener("blur", (event) => {
    qrscan = false;
    bottom_bar("", "", "");
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

      case "Enter":
        break;
    }
  }

  //////////////
  ////LONGPRESS
  /////////////

  function longpress_action(param) {
    switch (param.key) {
      case "0":
        if (windowOpen == "finder") {
          addMapLayers("delete-marker");
          return false;
        }

        if (windowOpen == "map") {
          maps.weather_map();
          return false;
        }
        break;

      case "Backspace":
        if (windowOpen == "map") {
          windowOpen = "";
          window.goodbye();
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
        if (
          (windowOpen == "finder" &&
            document.activeElement.tagName != "INPUT") ||
          windowOpen == "markers_option"
        ) {
          document.querySelector("div#finder").style.display = "none";
          document.querySelector("div#markers-option").style.display = "none";
          windowOpen = "map";

          top_bar("", "", "");
          bottom_bar("", "", "");

          break;
        }

        if (windowOpen == "coordinations") {
          coordinations("hide");
          break;
        }

        if (windowOpen == "scan") {
          qr.stop_scan();
          windowOpen = "setting";
          break;
        }

        break;

      case "SoftLeft":
        if (windowOpen == "search") {
          search.hideSearch();
          break;
        }

        if (status.marker_selection) {
          bottom_bar("", "", "");
          status.marker_selection = false;
          break;
        }

        if (windowOpen == "map") {
          ZoomMap("in");
          break;
        }

        if (windowOpen == "user-input") {
          user_input("close");
          save_mode = "";
          break;
        }

        break;

      case "SoftRight":
        if (windowOpen == "map") {
          ZoomMap("out");
          break;
        }

        if (windowOpen == "user-input" && save_mode == "geojson-single") {
          console.log(setting.export_path + user_input("return") + ".geojson");
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "single"
          );
          save_mode = "";
          break;
        }

        if (windowOpen == "user-input" && save_mode == "geojson-collection") {
          geojson.save_geojson(user_input("return") + ".geojson", "collection");
          save_mode = "";
          break;
        }

        if (windowOpen == "user-input" && save_mode != "geojson") {
          filename = user_input("return");
          break;
        }

        break;

      case "Enter":
        if (
          document.activeElement.tagName == "BUTTON" &&
          document.activeElement.classList.contains("link")
        ) {
          window.open(document.activeElement.getAttribute("data-href"));
          break;
        }
        if (windowOpen == "search") {
          L.marker([olc_lat_lng[0], olc_lat_lng[1]]).addTo(map);
          map.setView([olc_lat_lng[0], olc_lat_lng[1]], 13);

          hideSearch();

          current_lat = Number(olc_lat_lng[0]);
          current_lng = Number(olc_lat_lng[1]);

          toaster("press 5 to save the marker", 2000);
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

        if (windowOpen == "map" && status.marker_selection) {
          document.querySelector("div#markers-option").style.display = "block";
          document.querySelector("div#markers-option").children[0].focus();
          finder_tabindex();
          windowOpen = "markers_option";
          bottom_bar("", "select", "");
          tabIndex = 0;
          break;
        }

        if (windowOpen == "markers_option" && selected_marker != "") {
          markers_action();
          break;
        }

        if (windowOpen == "finder" && qrscan == true) {
          windowOpen = "scan";

          qr.start_scan(function (callback) {
            let slug = callback;
            document.getElementById("owm-key").value = slug;
          });

          break;
        }

        if (
          windowOpen == "finder" &&
          document.activeElement.classList.contains("input-parent")
        ) {
          document.activeElement.children[0].focus();
        }

        if (windowOpen == "finder") {
          addMapLayers("add-marker");

          break;
        }

        break;

      case "1":
        if (windowOpen == "map") getLocation("update_marker");
        break;

      case "2":
        if (windowOpen == "map") search.showSearch();
        break;

      case "3":
        if (windowOpen == "map") {
          open_finder();
        }

        break;

      case "4":
        if (windowOpen == "map") {
          geolocationWatch();
          screenWakeLock("lock");
        }

        break;

      case "5":
        if (windowOpen == "map") {
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
          save_mode = "geojson-single";
          user_input("open", now());
          document.getElementById("user-input-description").innerText =
            "save this marker as geojson file";
          break;
        }
        break;

      case "6":
        if (windowOpen == "map") coordinations("show");
        break;

      case "7":
        if (windowOpen == "map") module.ruler_toggle();
        break;

      case "8":
        if (windowOpen == "map") {
          save_mode = "geojson-collection";
          user_input("open", now());
          document.getElementById("user-input-description").innerText =
            "Export all markers as geojson file";
        }

        break;

      case "9":
        if (windowOpen == "map")
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
        break;

      case "0":
        if (windowOpen == "map") mozactivity.share_position();
        break;

      case "*":
        selected_marker = module.select_marker();

        break;

      case "#":
        if (windowOpen == "map") maps.caching_tiles();
        break;

      case "ArrowRight":
        MovemMap("right");

        if (
          windowOpen == "finder" &&
          document.activeElement.tagName != "INPUT"
        ) {
          finder_navigation("+1");
        }
        break;

      case "ArrowLeft":
        MovemMap("left");
        if (
          windowOpen == "finder" &&
          document.activeElement.tagName != "INPUT"
        ) {
          finder_navigation("-1");
        }
        break;

      case "ArrowUp":
        if (windowOpen == "map" || windowOpen == "coordinations")
          MovemMap("up");

        nav("-1");
        break;

      case "ArrowDown":
        if (windowOpen == "map" || windowOpen == "coordinations")
          MovemMap("down");

        nav("+1");
        break;
    }
  }

  /////////////////////////////////
  ////shortpress / longpress logic
  ////////////////////////////////

  function handleKeyDown(evt) {
    if (evt.key == "Backspace" && document.activeElement.tagName != "INPUT")
      evt.preventDefault();
    if (!evt.repeat) {
      //evt.preventDefault();
      longpress = false;
      timeout = setTimeout(() => {
        longpress = true;
        longpress_action(evt);
      }, longpress_timespan);
    }

    if (evt.repeat) {
      longpress = false;
      repeat_action(evt);
    }
  }

  function handleKeyUp(evt) {
    if (evt.key == "Backspace") evt.preventDefault();

    clearTimeout(timeout);
    if (!longpress) {
      shortpress_action(evt);
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
});
