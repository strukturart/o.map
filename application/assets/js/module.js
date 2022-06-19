const module = (() => {
  let link_to_marker = function (url) {
    let url_split = url.split("/");
    current_lat = url_split[url_split.length - 2];
    current_lng = url_split[url_split.length - 1];

    //remove !numbers
    current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
    current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
    mainmarker.current_lat = Number(current_lat);
    mainmarker.current_lng = Number(current_lng);

    map.setView([current_lat, current_lng], 14);
    L.marker([mainmarker.current_lat, mainmarker.current_lng]).addTo(
      markers_group
    );
  };

  let sunrise = function (lat, lng) {
    //get sunset
    //https://github.com/mourner/suncalc
    //sunset
    let times = SunCalc.getTimes(new Date(), lat, lng);
    let sunrise = times.sunrise.getHours() + ":" + times.sunrise.getMinutes();
    let sunset = times.sunset.getHours() + ":" + times.sunrise.getMinutes();

    let result = {
      sunrise: sunrise,
      sunset: sunset,
    };
    return result;
  };

  /////////////////////////
  /////Load GPX///////////
  ///////////////////////
  function loadGPX(filename, url) {
    console.log(filename, url);
    if (url) {
      var gpx = url;

      new L.GPX(gpx, {
        async: true,
      })
        .on("loaded", function (e) {
          map.fitBounds(e.target.getBounds());
        })
        .addTo(map);

      document.querySelector("div#finder").style.display = "none";
      status.windowOpen = "map";
    }
    if (filename) {
      let finder = new Applait.Finder({
        type: "sdcard",
        debugMode: false,
      });
      finder.search(filename);

      finder.on("fileFound", function (file, fileinfo, storageName) {
        //file reader

        let reader = new FileReader();

        reader.onerror = function (event) {
          helper.toaster("can't read file", 3000);
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
          status.windowOpen = "map";
        };

        reader.readAsText(file);
      });
    }
  }

  function loadGPX_data(filename, callback) {
    if (filename) {
      let finder = new Applait.Finder({
        type: "sdcard",
        debugMode: false,
      });
      finder.search(filename);

      finder.on("fileFound", function (file, fileinfo, storageName) {
        //file reader

        let reader = new FileReader();

        reader.onerror = function (event) {
          helper.toaster("can't read file", 3000);
          reader.abort();
        };

        reader.onloadend = function (event) {
          callback(filename, event.target.result);
        };

        reader.readAsText(file);
      });
    }
  }

  /////////////////////////
  /////Load GeoJSON///////////
  ///////////////////////
  let loadGeoJSON = function (filename) {
    let finder = new Applait.Finder({
      type: "sdcard",
      debugMode: false,
    });
    finder.search(filename);

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
          helper.toaster("Json is not valid", 2000);
          return false;
        }

        //if valid add layer
        //to do if geojson is marker add to  marker_array[]
        //https://blog.codecentric.de/2018/06/leaflet-geojson-daten/
        L.geoJSON(geojson_data, {
          onEachFeature: function (feature, layer) {
            if (feature.geometry != "") {
              let p = feature.geometry.coordinates[0];
              p.reverse();
              map.flyTo(p);
            }
          },
          // Marker Icon
          pointToLayer: function (feature, latlng) {
            let t = L.marker(latlng);
            //to do
            if (feature.properties.hasOwnProperty("popup")) {
              t.bindPopup(feature.properties.popup, module.popup_option);
            }

            if (feature.properties.hasOwnProperty("description")) {
              t.bindPopup(feature.properties.description, module.popup_option);
            }

            t.addTo(markers_group);
            map.flyTo(latlng);
          },

          // Popup
        }).addTo(map);
        document.querySelector("div#finder").style.display = "none";

        status.windowOpen = "map";
      };

      reader.readAsText(file);
    });
  };

  ///////////////////
  //select marker
  ////////////////////
  // Flag to keep track of the need
  // of generating the new marker lis
  var f_upd_markers_list = true;
  let set_f_upd_markers = function () {
    f_upd_markers_list = true;
  };

  contained = []; //makers in map boundingbox
  let l = [];
  let index = -1;
  let select_marker = function () {
    if (f_upd_markers_list) {
      // Reset contained list
      contained = [];

      //merge markers in viewport
      if (overpass_group != "") {
        overpass_group.eachLayer(function (l) {
          if (l instanceof L.Marker && map.getBounds().contains(l.getLatLng()))
            contained.push(l);
        });
      }

      markers_group.eachLayer(function (l) {
        contained.push(l);
        if (l instanceof L.Marker && map.getBounds().contains(l.getLatLng()))
          contained.push(l);
      });

      // Clear flag
      f_upd_markers_list = false;
    }

    l = contained;

    console.log(l);

    status.marker_selection = true;
    status.windowOpen = "marker";

    index++;

    if (index >= l.length) index = 0;
    bottom_bar("cancel", "option", "");

    //reset icons and close popus
    for (let t = 0; t < l.length; t++) {
      let p = l[t].getIcon();

      if (
        p.options.className != "follow-marker" &&
        p.options.className != "goal-marker"
      ) {
        //l[t].setIcon(maps.default_icon);
      }

      setTimeout(function () {
        l[index].closePopup();
      }, 3000);
    }

    let p = l[index].getIcon();
    if (
      p.options.className != "follow-marker" &&
      p.options.className != "goal-marker"
    ) {
      //l[index].setIcon(maps.select_icon);
    }

    //popup
    document.querySelector("textarea#popup").value = "";
    let pu = l[index].getPopup();

    if (pu != undefined && pu._content != undefined) {
      //get popup content
      document.querySelector("textarea#popup").value = pu._content;
      //show popup
      l[index].bindPopup(pu._content, popup_option).openPopup();
      //close popup
      setTimeout(function () {
        l[index].closePopup();
      }, 3000);
    }

    //check if marker set as startup marker

    for (let i = 0; i < mainmarker.startup_markers.length; i++) {
      if (
        l[index]._latlng.lng == mainmarker.startup_markers[i].latlng.lng &&
        l[index]._latlng.lat == mainmarker.startup_markers[i].latlng.lat
      ) {
        mainmarker.startup_marker_toggle = true;
        document.querySelector(
          "div#markers-option div[data-action='set_startup_marker']"
        ).innerText = "unset startup marker";
        i = mainmarker.startup_markers.length;
      } else {
        document.querySelector(
          "div#markers-option div[data-action='set_startup_marker']"
        ).innerText = "set startup marker";
        mainmarker.startup_marker_toggle = false;
      }
    }

    map.setView(l[index]._latlng, map.getZoom());
    return l[index];
  };

  //calc distance between markers
  let calc_distance = function (from_lat, from_lng, to_lat, to_lng, unit) {
    let d = map.distance([from_lat, from_lng], [to_lat, to_lng]);
    if (unit == "miles") {
      d = d * 0.00062137119;
    }

    d = Math.ceil(d);
    return d;
  };

  //convert degree to direction
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

  /////////////////////
  ////STARTUP MARKERS
  ///////////////////

  let startup_marker = function (markerid, action) {
    if (action == "set") {
      if (!mainmarker.startup_marker_toggle) {
        mainmarker.startup_markers.push({ latlng: markerid._latlng });
        localStorage.setItem(
          "startup_markers",
          JSON.stringify(mainmarker.startup_markers)
        );
        helper.toaster("set as startup marker", 2000);
      } else {
        for (let i = 0; i < mainmarker.startup_markers.length; i++) {
          if (
            markerid._latlng.lng == mainmarker.startup_markers[i].latlng.lng &&
            markerid._latlng.lat == mainmarker.startup_markers[i].latlng.lat
          ) {
            mainmarker.startup_markers.splice(i, 1);
            localStorage.setItem(
              "startup_markers",
              JSON.stringify(mainmarker.startup_markers)
            );
            helper.toaster("unset startup marker", 2000);
          }
        }
      }
    }

    if (action == "add") {
      if (mainmarker.startup_markers.length == 0) return false;
      mainmarker.startup_markers.forEach(function (index) {
        L.marker([index.latlng.lat, index.latlng.lng]).addTo(markers_group);
      });
    }
  };

  /////////////////////
  ////PATH & TRACKING
  ///////////////////

  //calculation of altitude ascents and descents

  let elevation = function (t) {
    let up_e = 0;
    let down_e = 0;
    let evo = {};
    //the gps is too inaccurate, a boundary mark so help to spot errors
    let limit = 15;

    t.forEach(function (item, index) {
      if (index > 0) {
        if (item > t[index - 1]) {
          let c = item - t[index - 1];
          if (c > limit) return false;
          up_e += c;
        }
        if (item < t[index - 1]) {
          let cc = t[index - 1] - item;
          if (cc > limit) return false;
          down_e += cc;
        }

        evo.up = up_e;
        evo.down = down_e;
      }
    });
    document.querySelector("#tracking-evo-up span").innerText =
      evo.up.toFixed(2);
    document.querySelector("#tracking-evo-down span").innerText =
      evo.down.toFixed(2);
  };

  //tool to measure distance

  let popup_option = {
    closeButton: false,
    maxWidth: 200,
    maxHeight: 200,
  };

  let path_option = {
    color: "red",
    step: 0,
  };

  let distances = [];
  let latlngs = [];
  let tracking_latlngs = [];
  let tracking_interval;
  let tracking_cache = [];
  let gps_lock;
  let tracking_altitude = [];

  let tracking_distance;

  let polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
  let polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
    tracking_group
  );

  const measure_distance = function (action) {
    if (action == "destroy") {
      status.path_selection = false;
      measure_group_path.clearLayers();
      measure_group.clearLayers();
      polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
      return true;
    }

    if (action == "destroy_tracking") {
      tracking_altitude = [];
      document.getElementById("tracking-altitude").innerText = "";
      document.querySelector("div#tracking-distance").innerText = "";
      document.querySelector("div#tracking-evo-up").innerText = "";
      document.querySelector("div#tracking-evo-down").innerText = "";
      clearInterval(tracking_interval);
      setTimeout(function () {
        localStorage.removeItem("tracking_cache");
      }, 10000);

      tracking_group.clearLayers();
      polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
        tracking_group
      );
      status.tracking_running = false;
      gps_lock.unlock();

      return true;
    }

    if (action == "tracking") {
      gps_lock = window.navigator.requestWakeLock("gps");
      status.tracking_running = true;

      if (localStorage.getItem("tracking_cache") != null) {
        if (
          window.confirm(
            "looks like a tracking was aborted without saving it, would you like to continue?"
          )
        ) {
          let d = localStorage.getItem("tracking_cache");

          d = JSON.parse(d);

          tracking_cache = d;
          //restore path
          for (let i = 0; i < tracking_cache.length; i++) {
            polyline_tracking.addLatLng([
              tracking_cache[i].lat,
              tracking_cache[i].lng,
              tracking_cache[i].timestamp,
            ]);

            tracking_timestamp.push(tracking_cache[i].timestamp);
          }
        } else {
          localStorage.removeItem("tracking_cache");
          tracking_cache = [];
        }
      }
      if (setting.tracking_screenlock) screenWakeLock("lock", "screen");

      let calc = 0;

      tracking_interval = setInterval(function () {
        //only write data if accuracy
        if (mainmarker.accuracy > 10000) {
          console.log("the gps is very inaccurate right now");
          return false;
        }
        let ts = new Date();
        tracking_timestamp.push(ts.toISOString());

        polyline_tracking.addLatLng([
          mainmarker.device_lat,
          mainmarker.device_lng,
          mainmarker.device_alt,
        ]);

        tracking_cache.push({
          lat: mainmarker.device_lat,
          lng: mainmarker.device_lng,
          alt: mainmarker.device_alt,
          timestamp: ts.toISOString(),
          tracking_altitude: mainmarker.device_alt,
        });
        tracking_altitude = [];
        tracking_cache.forEach(function (e) {
          if (e.tracking_altitude != null)
            tracking_altitude.push(e.tracking_altitude);
        });

        document.getElementById("tracking-altitude").innerText =
          mainmarker.device_alt.toFixed(2);

        //only record the altitude if the accuracy of the measurement is less than 1000.
        if (mainmarker.accuracy < 1000) {
          elevation(tracking_altitude);
        }

        if (tracking_cache.length > 2) {
          tracking_distance = calc_distance(
            Number(tracking_cache[tracking_cache.length - 1].lat),
            Number(tracking_cache[tracking_cache.length - 1].lng),
            Number(tracking_cache[tracking_cache.length - 2].lat),
            Number(tracking_cache[tracking_cache.length - 2].lng)
          );

          tracking_distance = tracking_distance / 1000;

          calc += Number(tracking_distance);

          document.querySelector("div#tracking-distance").innerText =
            calc.toFixed(2) + general.measurement_unit;

          //check if old tracking
          let k = JSON.stringify(tracking_cache);

          localStorage.setItem("tracking_cache", k);
        }

        if (mainmarker.tracking == false) {
          clearInterval(tracking_interval);
          if (setting.tracking_screenlock) screenWakeLock("unlock", "screen");
        }
      }, 8000);
    }

    if (action == "addMarker") {
      status.path_selection = true;
      L.marker([mainmarker.current_lat, mainmarker.current_lng])
        .addTo(measure_group)
        .setIcon(maps.select_icon);

      let l = measure_group.getLayers();

      polyline.addLatLng([mainmarker.current_lat, mainmarker.current_lng]);

      if (l.length < 2) return false;
      let dis = calc_distance(
        l[l.length - 1]._latlng.lat,
        l[l.length - 1]._latlng.lng,
        l[l.length - 2]._latlng.lat,
        l[l.length - 2]._latlng.lng
      );

      distances.push(dis);
      let calc = 0;

      for (let i = 0; i < distances.length; i++) {
        calc += distances[i];
      }
      calc = calc / 1000;
      calc.toFixed(2);
      parseFloat(calc);

      l[l.length - 1]
        .bindPopup(
          calc.toString() + " " + general.measurement_unit,
          popup_option
        )
        .openPopup();
    }
  };

  return {
    set_f_upd_markers,
    select_marker,
    calc_distance,
    compass,
    measure_distance,
    link_to_marker,
    popup_option,
    startup_marker,
    loadGeoJSON,
    loadGPX,
    sunrise,
    loadGPX_data,
  };
})();
