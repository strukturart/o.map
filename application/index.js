"use strict";

//let windowOpen;
let save_mode = "";
let markers_group = new L.FeatureGroup();
let measure_group_path = new L.FeatureGroup();
let measure_group = new L.FeatureGroup();
let tracking_group = new L.FeatureGroup();
let myMarker;

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

let general = {
  step: 0.001,
  zoomlevel: 12,
};

let setting = {
  export_path:
    localStorage.getItem("export-path") != null
      ? localStorage.getItem("export-path")
      : "",
  cache_time: localStorage.getItem("cache-time"),
  cache_zoom: localStorage.getItem("cache-zoom"),
  openweather_api: localStorage.getItem("owm-key"),
  tracking_screenlock: JSON.parse(localStorage.getItem("tracking_screenlock")),
};

settings.load_settings();

let status = {
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
      const url_split = option.data.url.split("/");
      current_lat = url_split[url_split.length - 2];
      current_lng = url_split[url_split.length - 1];

      //remove !numbers
      current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
      current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
      mainmarker.device_lat = Number(current_lat);
      mainmarker.device_lng = Number(current_lng);

      myMarker = L.marker([mainmarker.device_lat, mainmarker.device_lng]).addTo(
        markers_group
      );

      map.setView([mainmarker.device_lat, mainmarker.device_lng], 13);
    }
  });
}

//leaflet add basic map
let map = L.map("map-container", {
  zoomControl: false,
  dragging: false,
  keyboard: true,
});

L.control
  .scale({
    position: "topright",
    metric: true,
    imperial: false,
  })
  .addTo(map);

map.on("load", function () {
  maps.opentopo_map();
  maps.attribution();
});

document.addEventListener("DOMContentLoaded", function () {
  //load KaiOs ads or not

  function manifest(a) {
    document.getElementById("intro-footer").innerText =
      "O.MAP Version " + a.manifest.version;

    if (a.installOrigin == "app://kaios-plus.kaiostech.com") {
      helper.add_script("assets/js/kaiads.v5.min.js");
      helper.add_script("assets/js/kaios-ads.js");
    }
  }

  helper.getManifest(manifest);

  setTimeout(function () {
    //get location if not an activity open url
    document.querySelector("div#intro").style.display = "none";
    build_menu();
    module.startup_marker("", "add");
    getLocation("init");
    helper.toaster("Press 3 to open the menu", 5000);
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

      if (fileinfo.name.substring(0, 1) == "_") {
        module.loadGPX(fileinfo.name);
      }
    });
  };

  //////////////////////////////////
  //FIND GEOJSON////////////////////////
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

      //load startup item

      if (fileinfo.name.substring(0, 1) == "_") {
        console.log("yeah");
        module.loadGeoJSON(fileinfo.name);
      }
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
    status.windowOpen = "finder";
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
    if (option == "init" || option == "update_marker") {
      helper.toaster("try to determine your position", 3000);
    }

    let options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    function success(pos) {
      helper.toaster("Position  found");

      let crd = pos.coords;

      if (crd.heading) mainmarker.current_heading = crd.heading;
      mainmarker.accuracy = crd.accuracy;

      //to store device loaction
      mainmarker.device_lat = crd.latitude;
      mainmarker.device_lng = crd.longitude;
      mainmarker.device_alt = crd.altitude;

      //store location as fallout
      let b = [crd.latitude, crd.longitude];
      localStorage.setItem("last_location", JSON.stringify(b));

      if (option == "init") {
        geolocationWatch();

        myMarker = L.marker([
          mainmarker.device_lat,
          mainmarker.device_lng,
        ]).addTo(markers_group);

        map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);

        myMarker.setIcon(maps.default_icon);
        document.getElementById("cross").style.opacity = 1;

        return true;
      }
    }

    function error(err) {
      helper.toaster("Position not found, load last known position", 4000);
      mainmarker.current_lat = mainmarker.last_location[0];
      mainmarker.current_lng = mainmarker.last_location[1];
      mainmarker.current_alt = 0;

      mainmarker.device_lat = mainmarker.last_location[0];
      mainmarker.device_lng = mainmarker.last_location[1];

      myMarker = L.marker([mainmarker.device_lat, mainmarker.device_lng]).addTo(
        markers_group
      );

      map.setView([mainmarker.device_lat, mainmarker.device_lng], 12);
      return false;
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

      if (crd.heading) mainmarker.current_heading = crd.heading;
      mainmarker.accuracy = crd.accuracy;

      //store device location
      mainmarker.device_lat = crd.latitude;
      mainmarker.device_lng = crd.longitude;
      mainmarker.device_alt = crd.altitude;

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
        console.log("Error: Position is unavailable!", 2000);
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
          "target marker set, press key 4 to be informed about the current distance in the info panel.",
          4000
        );
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";
      }

      if (item_value == "set_startup_marker") {
        module.startup_marker(mainmarker.selected_marker, "set");
      }

      if (item_value == "remove_marker") {
        map.removeLayer(mainmarker.selected_marker);
        mainmarker.selected_marker.removeFrom(markers_group);
        helper.toaster("marker removed", 4000);
        document.querySelector("div#markers-option").style.display = "none";
        status.windowOpen = "map";
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
      //switch online maps
      let item_value = document.activeElement.getAttribute("data-map");

      if (item_value == "weather") {
        maps.weather_map();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
      }

      if (item_value == "toner") {
        map.removeLayer(tilesLayer);
        maps.toner_map();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
        maps.attribution();
      }

      if (item_value == "osm") {
        map.removeLayer(tilesLayer);
        maps.osm_map();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
        maps.attribution();
      }

      if (item_value == "moon") {
        map.removeLayer(tilesLayer);
        maps.moon_map();
        document.querySelector("div#finder").style.display = "none";
        map.setZoom(4);
        status.windowOpen = "map";
        maps.attribution();
      }

      if (item_value == "otm") {
        map.removeLayer(tilesLayer);
        maps.opentopo_map();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
        maps.attribution();
      }

      if (item_value == "railway") {
        maps.railway_layer();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
        maps.attribution();
      }

      if (item_value == "earthquake") {
        maps.earthquake_layer();
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
        maps.attribution();
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
        bottom_bar("cancel", "", "save");
      }

      if (item_value == "export") {
        document.querySelector("div#finder").style.display = "none";
        save_mode = "geojson-collection";
        user_input("open");
        bottom_bar("cancel", "", "save");
      }

      if (item_value == "read-qr-marker") {
        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "scan";

        qr.start_scan(function (callback) {
          let slug = callback;
          helper.toaster(slug, 3000);
          module.link_to_marker(slug);
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
        //helper.deleteFile();
      }

      //add gpx data
      if (item_value == "gpx") {
        module.loadGPX(document.activeElement.innerText);
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

    let update_view = setInterval(() => {
      if (mainmarker.current_lat != "" && mainmarker.current_lng != "") {
        //when marker is loaded from menu

        let f = map.getCenter();
        //distance to current position

        let calc = module.calc_distance(
          mainmarker.device_lat,
          mainmarker.device_lng,
          f.lat,
          f.lng
        );
        calc = calc / 1000;
        calc.toFixed(2);
        parseFloat(calc);

        document.querySelector("div#coordinations div#distance").innerText =
          "to device: " + calc + " km";

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
            mainmarker.target_marker.lng
          );
          calc = calc / 1000;
          calc.toFixed(2);
          parseFloat(calc);

          let k = document.querySelector("div#target");
          k.style.display = "block";
          k.innerText = "to the goal marker: " + calc + " km";
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

    if (
      status.windowOpen == "map" ||
      (status.windowOpen == "coordinations" &&
        window.getComputedStyle(document.querySelector("div#search-box"))
          .display == "none")
    ) {
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
      general.step = 10;
    }
    if (zoom_level > 2) {
      general.step = 7.5;
    }
    if (zoom_level > 3) {
      general.step = 5;
    }
    if (zoom_level > 4) {
      general.step = 1;
    }
    if (zoom_level > 5) {
      general.step = 0.5;
    }
    if (zoom_level > 6) {
      general.step = 0.25;
    }
    if (zoom_level > 7) {
      general.step = 0.1;
    }
    if (zoom_level > 8) {
      general.step = 0.075;
    }
    if (zoom_level > 9) {
      general.step = 0.05;
    }
    if (zoom_level > 10) {
      general.step = 0.025;
    }
    if (zoom_level > 11) {
      general.step = 0.01;
    }
    if (zoom_level > 12) {
      general.step = 0.0075;
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
      general.step = 0.0001;
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
      status.windowOpen == "finder" ||
      status.windowOpen == "markers_option"
    ) {
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
        }
      }

      if (document.activeElement.classList.contains("input-parent")) {
        bottom_bar("", "edit", "");
      }
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
        if (status.windowOpen == "map") {
          //status.windowOpen = "";
          status.crash = false;
          localStorage.setItem("crash", "false");
          //window.goodbye();
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

        if (status.marker_selection == true) {
          bottom_bar("", "", "");
          status.marker_selection = false;
        }

        if (status.windowOpen == "user-input") {
          user_input("close");
          save_mode = "";
          break;
        }

        if (status.windowOpen == "map") {
          ZoomMap("in");
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
        if (status.path_selection && status.windowOpen == "map") {
          save_mode = "geojson-path";
          user_input("open", "", "save this marker as geojson file");
          bottom_bar("cancel", "", "save");

          break;
        }

        if (
          status.windowOpen == "user-input" &&
          save_mode == "geojson-single"
        ) {
          geojson.save_geojson(
            setting.export_path + user_input("return") + ".geojson",
            "single-speed"
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

        if (status.windowOpen == "map") {
          ZoomMap("out");
          break;
        }

        if (status.windowOpen == "user-input" && save_mode != "geojson") {
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

        if (document.activeElement.classList.contains("input-parent")) {
          document.activeElement.children[0].focus();
          settings.save_chk();
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
          map.setView([olc_lat_lng[0], olc_lat_lng[1]]);
          search.hideSearch();
          current_lat = Number(olc_lat_lng[0]);
          current_lng = Number(olc_lat_lng[1]);
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

        if (document.activeElement == document.getElementById("owm-key")) {
          bottom_bar("qr.scan", "", "");

          break;
        }

        if (status.windowOpen == "map" && status.marker_selection) {
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

          break;
        }

        if (status.windowOpen == "finder") {
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
        if (status.windowOpen == "map") search.showSearch();
        break;

      case "3":
        if (status.windowOpen == "map") {
          open_finder();
          status.windowOpen = "finder";
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
          save_mode = "single-speed";
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
        if (status.windowOpen == "map")
          L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
            markers_group
          );
        break;

      case "0":
        if (status.windowOpen == "map") mozactivity.share_position();
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

        nav("-1");
        break;

      case "ArrowDown":
        if (status.windowOpen == "map" || status.windowOpen == "coordinations")
          MovemMap("down");
        nav("+1");
        break;
    }
  }

  /////////////////////////////////
  ////shortpress / longpress logic
  ////////////////////////////////
  /*
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
*/

  function handleKeyDown(evt) {
    if (evt.key === "Backspace" && status.windowOpen !== "map") {
      evt.preventDefault();
    }

    if (evt.key === "EndCall") {
      evt.preventDefault();
    }
    // For some reasons empty inputs don't focus so it allows the app to be minimized also in empty inputs
    if (!evt.repeat) {
      longpress = false;
      timeout = setTimeout(() => {
        longpress = true;
        longpress_action(evt);
      }, longpress_timespan);
    }

    if (evt.repeat) {
      if (evt.key == "Backspace") evt.preventDefault(); // Disable close app by holding backspace

      longpress = false;
      repeat_action(evt);
    }
  }

  function handleKeyUp(evt) {
    evt.preventDefault();

    if (evt.key == "Backspace") evt.preventDefault(); // Disable close app by holding backspace

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
