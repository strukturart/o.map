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
    if (url) {
      var gpx = url;

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
            .addTo(gpx_group);
          //.addTo(map);

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
  let loadGeoJSON = function (filename, callback) {
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
              map.flyTo([p[1], p[0]]);
            }
            //routing data
            if (feature.properties.segments[0].steps) {
              callback(geojson_data, true);
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
  // of generating the new marker list
  var f_upd_markers_list = true;
  let set_f_upd_markers = function () {
    f_upd_markers_list = true;
  };

  let markers_collection = []; //makers in map boundingbox
  let l = [];
  let index = -1;
  let select_marker = function () {
    if (f_upd_markers_list) {
      // Reset contained list
      markers_collection = [];

      //merge markers in viewport
      if (overpass_group != "") {
        overpass_group.eachLayer(function (l) {
          markers_collection.push(l);
          if (
            l instanceof L.Marker &&
            map.getBounds().contains(l.getLatLng())
          ) {
          }
          //markers_collection.push(l);
        });
      }

      markers_group.eachLayer(function (l) {
        markers_collection.push(l);
        if (l instanceof L.Marker && map.getBounds().contains(l.getLatLng())) {
        }
        // markers_collection.push(l);
      });

      // Clear flag
      f_upd_markers_list = false;
    }

    //l = contained;

    status.marker_selection = true;
    status.windowOpen = "marker";

    index++;

    if (index >= markers_collection.length) index = 0;
    bottom_bar("cancel", "option", "");

    //reset icons and close popus
    for (let t = 0; t < markers_collection.length; t++) {
      let p = markers_collection[t].getIcon();

      if (
        p.options.className != "follow-marker" &&
        p.options.className != "goal-marker" &&
        p.options.className != "start-marker" &&
        p.options.className != "end-marker"
      ) {
        markers_collection[t].setIcon(maps.default_icon);
      }
      markers_collection[index].closePopup();
    }

    //show selected marker

    let p = markers_collection[index].getIcon();
    if (
      p.options.className != "follow-marker" &&
      p.options.className != "goal-marker" &&
      p.options.className != "start-marker" &&
      p.options.className != "end-marker"
    ) {
      markers_collection[index].setIcon(maps.select_icon);
    }

    //popup
    document.querySelector("textarea#popup").value = "";
    let pu = markers_collection[index].getPopup();

    if (pu != undefined && pu._content != undefined) {
      //get popup content
      document.querySelector("textarea#popup").value = pu._content;
      //show popup
      markers_collection[index]
        .bindPopup(pu._content, popup_option)
        .openPopup();
      //close popup
      setTimeout(function () {
        markers_collection[index].closePopup();
      }, 3000);
    }

    map.setView(markers_collection[index]._latlng, map.getZoom());
    status.selected_marker = markers_collection[index];
    return markers_collection[index];
  };

  //SELECT GPX

  let gpx_selection_count = 0;
  let select_gpx = function () {
    let gpx_selection = [];

    gpx_selection_count++;

    gpx_group.eachLayer(function (l) {
      if (l.getBounds()) gpx_selection.push(l);
    });

    if (gpx_selection_count > gpx_selection.length - 1) gpx_selection_count = 0;
    map.fitBounds(gpx_selection[gpx_selection_count].getBounds());

    //store info in object
    gpx_selection_info.duration =
      gpx_selection[gpx_selection_count]._info.duration.total;
    gpx_selection_info.elevation_gain =
      gpx_selection[gpx_selection_count]._info.elevation.gain;

    gpx_selection_info.elevation_loss =
      gpx_selection[gpx_selection_count]._info.elevation.loss;

    gpx_selection_info.elevation_loss =
      gpx_selection[gpx_selection_count]._info.elevation.loss;

    gpx_selection_info.distance =
      gpx_selection[gpx_selection_count]._info.length;

    gpx_selection_info.name = gpx_selection[gpx_selection_count]._info.name;
    update_gpx_info();

    console.log(gpx_selection[gpx_selection_count]._info);
  };

  let update_gpx_info = function () {
    document.getElementById("gpx-name").innerText = gpx_selection_info.name;
    document.getElementById("gpx-time").innerText = format_ms(
      gpx_selection_info.duration
    );
    document.querySelector("#gpx-evo-up span").innerText =
      gpx_selection_info.elevation_gain.toFixed(2);

    document.querySelector("#gpx-evo-down span").innerText =
      gpx_selection_info.elevation_loss.toFixed(2);

    let n = gpx_selection_info.distance / 1000;
    n = n.toFixed(2);
    document.getElementById("gpx-distance").innerText = n;
  };

  let format_ms = function (millisec) {
    var seconds = (millisec / 1000).toFixed(0);
    var minutes = Math.floor(seconds / 60);
    var hours = "";
    if (minutes > 59) {
      hours = Math.floor(minutes / 60);
      hours = hours >= 10 ? hours : "0" + hours;
      minutes = minutes - hours * 60;
      minutes = minutes >= 10 ? minutes : "0" + minutes;
    }

    seconds = Math.floor(seconds % 60);
    seconds = seconds >= 10 ? seconds : "0" + seconds;
    if (hours != "") {
      return hours + ":" + minutes + ":" + seconds;
    }
    return minutes + ":" + seconds;
  };

  let format_s = function (seconds) {
    let nhours = Math.floor(seconds / 3600);
    let nminutes = Math.floor((seconds % 3600) / 60);
    let nseconds = Math.floor(seconds % 60);
    if (nhours == 0) {
        return nminutes+":"+nseconds;
    } 
    return nhours+":"+nminutes+":"+nseconds;
  };

  //calc distance between markers
  let calc_distance = function (from_lat, from_lng, to_lat, to_lng, unit) {
    let d = map.distance([from_lat, from_lng], [to_lat, to_lng]);
    if (unit == "mil") {
      d = d * 3.28084;
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

  //json to gpx
  let toGPX = function () {
    let e = tracking_group.toGeoJSON();
    e.features[0].properties.software = "o.map";
    e.features[0].properties.timestamp = tracking_timestamp;

    let option = { featureCoordTimes: "timestamp", creator: "o.map" };

    extData = togpx(e, option);
    return togpx(e, option);
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
      document.querySelector("div#tracking-evo-up span").innerText = "";
      document.querySelector("div#tracking-evo-down span").innerText = "";
      document.querySelector("div#tracking-moving-time span").innerText = "";

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
      if (typeof window.navigator.requestWakeLock !== "undefined")
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
        let n = 0;
        if (tracking_cache.length > 2) {
          n = calc_distance(
            Number(tracking_cache[tracking_cache.length - 1].lat),
            Number(tracking_cache[tracking_cache.length - 1].lng),
            Number(tracking_cache[tracking_cache.length - 2].lat),
            Number(tracking_cache[tracking_cache.length - 2].lng)
          );
        }
        if (mainmarker.accuracy > 10000) {
          console.log("the gps is very inaccurate right now");
          return false;
        } else {
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

          //only record the altitude if the accuracy of the measurement is less than 1000.
          if (mainmarker.accuracy < 1000) {
            //elevation(tracking_altitude);
          }

          if (tracking_cache.length > 2) {
            /*
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
*/

            //get tracking data to display in view
            new L.GPX(toGPX(), { async: true }).on("loaded", function (e) {
              // Get elapsed time
              let elapsed_time_ms = e.target.get_total_time();
              let elapsed_time_s = elapsed_time_ms / 1000;
              //meter
              if (general.measurement_unit == "km") {
                let a = e.target.get_distance() / 1000;
                document.querySelector("div#tracking-distance").innerText =
                  a.toFixed(2) + general.measurement_unit;

                let b = e.target._info.elevation.gain;
                document.querySelector("#tracking-evo-up span").innerText =
                  b.toFixed(2);

                let c = e.target._info.elevation.loss;
                document.querySelector("#tracking-evo-down span").innerText =
                  c.toFixed(2);

                document.getElementById("tracking-altitude").innerText =
                  mainmarker.device_alt;

                let d = a * 3600 / elapsed_time_s;
                document.querySelector("#tracking-avg-speed span").innerText = 
                  d.toFixed(2) + " km/h";
              }
              //miles
              if (general.measurement_unit == "mil") {
                let a = e.target.get_distance_imp();
                document.querySelector("div#tracking-distance").innerText =
                  a.toFixed(2) + general.measurement_unit;

                let b = e.target.get_elevation_gain_imp();
                document.querySelector("#tracking-evo-up span").innerText =
                  b.toFixed(2);

                let c = e.target.get_elevation_loss_imp();
                document.querySelector("#tracking-evo-down span").innerText =
                  c.toFixed(2);

                document.getElementById("tracking-altitude").innerText =
                  mainmarker.device_alt * 3.280839895;

                let d = a * 3600 / elapsed_time_s;
                document.querySelector("#tracking-avg-speed span").innerText =
                  d.toFixed(2) + " mph"
              }

              let t = e.target.get_duration_string(
                elapsed_time_ms,
                false
              );
              document.querySelector("#tracking-moving-time span").innerText =
                t;
            });

            let k = JSON.stringify(tracking_cache);
            localStorage.setItem("tracking_cache", k);
          }

          if (mainmarker.tracking == false) {
            clearInterval(tracking_interval);
            if (setting.tracking_screenlock) screenWakeLock("unlock", "screen");
          }
        }
      }, 5000);
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

  let user_input = function (param, file_name, label) {
    if (param == "open") {
      document.getElementById("user-input-description").innerText = label;

      document.querySelector("div#user-input").style.bottom = "25px";
      document.querySelector("div#user-input input").focus();
      document.querySelector("div#user-input input").value = file_name;
      status.windowOpen = "user-input";
    }
    if (param == "close") {
      document.querySelector("div#user-input").style.bottom = "-1000px";
      document.querySelector("div#user-input input").blur();
      status.windowOpen = "map";
      bottom_bar("", "", "");
    }

    if (param == "return") {
      let input_value = document.querySelector("div#user-input input").value;
      document.querySelector("div#user-input").style.bottom = "-1000px";
      document.querySelector("div#user-input input").blur();
      bottom_bar("", "", "");

      return input_value;
    }
  };

  return {
    set_f_upd_markers,
    select_marker,
    select_gpx,
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
    user_input,
    format_ms,
    format_s,
  };
})();
