const module = (() => {
  let uniqueId =
    Date.now().toString(36) + Math.random().toString(36).substring(2);

  let pushLocalNotification = function (title, body) {
    window.Notification.requestPermission().then((result) => {
      var notification = new window.Notification(title, {
        body: body,
        //requireInteraction: true,
      });

      notification.onerror = function (err) {
        console.log(err);
      };
      notification.onclick = function (event) {
        if (window.navigator.mozApps) {
          var request = window.navigator.mozApps.getSelf();
          request.onsuccess = function () {
            if (request.result) {
              notification.close();
              request.result.launch();
            }
          };
        } else {
          window.open(document.location.origin, "_blank");
        }
      };
      notification.onshow = function () {
        // notification.close();
      };
    });
  };

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
      new L.GPX(url, {
        async: true,
        marker_options: {
          startIconUrl: "assets/css/images/start.png",
          endIconUrl: "assets/css/images/end.png",
        },
      })
        .on("loaded", function (e) {
          map.fitBounds(e.target.getBounds());
        })
        .addTo(gpx_group);

      document.querySelector("div#finder").style.display = "none";
      status.windowOpen = "map";
    }

    if (filename) {
      try {
        let sdcard = navigator.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          m(this.result);
        };
        request.onerror = function () {};
      } catch (e) {}

      if ("b2g" in navigator) {
        try {
          let sdcard = navigator.b2g.getDeviceStorage("sdcard");
          let request = sdcard.get(filename);
          request.onsuccess = function () {
            m(this.result);
          };
          request.onerror = function () {};
        } catch (e) {}
      }

      let m = (r) => {
        let reader = new FileReader();

        reader.onerror = function (event) {
          helper.toaster("can't read file", 3000);
          reader.abort();
        };

        reader.onloadend = function (event) {
          var gpx = reader.result; // URL to your GPX file or the GPX itself

          new L.GPX(gpx, {
            async: true,
            marker_options: {
              startIconUrl: "assets/css/images/start.png",
              endIconUrl: "assets/css/images/end.png",
            },
          })
            .on("loaded", function (e) {
              map.fitBounds(e.target.getBounds());
            })
            .addTo(gpx_group);

          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
        };

        reader.readAsText(r);
      };
    }
  }

  function loadGPX_data(filename, callback) {
    if (filename) {
      try {
        let sdcard = navigator.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          let reader = new FileReader();

          reader.onerror = function (event) {
            helper.toaster("can't read file", 3000);
            reader.abort();
          };

          reader.onloadend = function (event) {
            callback(filename, event.target.result);
          };

          reader.readAsText(this.result);
        };
        request.onerror = function () {};
      } catch (e) {}

      try {
        if ("b2g" in navigator) {
          try {
            let sdcard = navigator.b2g.getDeviceStorage("sdcard");
            let request = sdcard.get(filename);
            request.onsuccess = function () {
              let reader = new FileReader();

              reader.onerror = function (event) {
                helper.toaster("can't read file", 3000);
                reader.abort();
              };

              reader.onloadend = function (event) {
                callback(filename, event.target.result);
              };

              reader.readAsText(this.result);
            };
            request.onerror = function () {};
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  /////////////////////////
  /////Load GeoJSON///////////
  ///////////////////////
  let loadGeoJSON = function (filename, callback) {
    //file reader
    try {
      let sdcard = navigator.getDeviceStorage("sdcard");
      let request = sdcard.get(filename);
      request.onsuccess = function () {
        m(this.result);
      };
      request.onerror = function () {
        alert("error");
      };
    } catch (e) {}

    if ("b2g" in window.navigator) {
      try {
        let sdcard = navigator.b2g.getDeviceStorage("sdcard");
        let request = sdcard.get(filename);
        request.onsuccess = function () {
          m(this.result);
        };
        request.onerror = function (e) {
          alert(e + "error");
        };
      } catch (e) {}
    }

    let m = (r) => {
      let geojson_data = "";
      let reader = new FileReader();

      reader.onerror = function (event) {
        reader.abort();
      };

      reader.onloadend = function () {
        //check if json valid
        try {
          geojson_data = JSON.parse(reader.result);
        } catch (e) {
          helper.toaster("JSON is not valid", 2000);
          return false;
        }

        //if valid add layer
        //to do if geojson is marker add to  marker_array[]
        //https://blog.codecentric.de/2018/06/leaflet-geojson-daten/
        L.geoJSON(geojson_data, {
          onEachFeature: function (feature, layer) {
            if (feature.geometry != null) {
              let p = feature.geometry.coordinates[0];
              map.flyTo([p[1], p[0]]);
            }
            //routing data
            if (feature.properties.segments != undefined) {
              if (feature.properties.segments[0].steps) {
                callback(geojson_data, true);
              }
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
        }).addTo(geoJSON_group);

        document.querySelector("div#finder").style.display = "none";
        status.windowOpen = "map";
      };

      reader.readAsText(r);
    };
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
        });
      }

      markers_group.eachLayer(function (l) {
        markers_collection.push(l);
      });

      // Clear flag
      f_upd_markers_list = false;
    }

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
    document.querySelector("input#popup").value = "";
    let pu = markers_collection[index].getPopup();

    if (pu != undefined && pu._content != undefined) {
      //get popup content
      document.querySelector("input#popup").value = pu._content;
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
  let gpx_selection = [];
  let select_gpx = function () {
    gpx_selection = [];

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

  let closest_average = [];
  //closest point in route/track
  let get_closest_point = function (route) {
    if (!mainmarker.device_lat) return false;

    //let r = route.map((row) => row.reverse());
    let m = L.polyline(route);

    let latlng = [mainmarker.device_lat, mainmarker.device_lng];

    let k = L.GeometryUtil.closest(map, m, latlng, true);

    L.marker(k).addTo(map);

    let f = calc_distance(
      mainmarker.device_lat,
      mainmarker.device_lng,
      k.lat,
      k.lng,
      "km"
    );

    document.querySelector("#distance-to-track").innerText = f / 1000;
    //notification
    // Check if the main marker's accuracy is below 22
    if (mainmarker.accuracy < 22) {
      // Add the current value of f to the closest_average array
      closest_average.push(f);
    }

    // Log the main marker's accuracy to the console
    console.log(mainmarker.accuracy);

    // Calculate the average of the closest_average array if it has more than 48 elements
    if (closest_average.length > 48) {
      let sum = closest_average.reduce((acc, cur) => acc + cur);
      let result = sum / 40;

      // Reset the closest_average array and sum if it has more than 50 elements
      if (closest_average.length > 50) {
        closest_average.length = 0;
        sum = 0;
        result = 0;
      }

      // If the routing_notification setting is off, exit early
      if (!setting.routing_notification) {
        return false;
      }

      // If the average is above 0.5, trigger a vibration and show a toaster message
      if (result > 0.5) {
        try {
          navigator.vibrate([1000, 500, 1000]);
        } catch (e) {}
        helper.toaster("Too far " + result, 3000);
      }
    }
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
      return nminutes + ":" + nseconds;
    }
    return nhours + ":" + nminutes + ":" + nseconds;
  };

  //calc distance between markers
  let calc_distance = function (from_lat, from_lng, to_lat, to_lng, unit) {
    if (
      to_lat == undefined ||
      to_lng == undefined ||
      from_lat == undefined ||
      from_lng == undefined
    )
      return false;

    let d = map.distance([from_lat, from_lng], [to_lat, to_lng]);
    if (unit == "mil") {
      d = d * 3.28084;
    }

    d = Math.ceil(d);

    return d;
  };

  let calcDistance = function (polyline) {
    let dis = L.GeometryUtil.length(polyline);

    if (general.measurement_unit == "km") {
      dis = dis / 1000;
    }
    if (general.measurement_unit == "mil") {
      dis = dis / 1000;
      let dis = dis / 1.60934;
    }
    return dis;
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

  function elevation(t) {
    let up_e = 0;
    let down_e = 0;

    for (let i = 1; i < t.length; i++) {
      const diff = t[i] - t[i - 1];
      if (Math.abs(diff) > 15) {
        // The GPS data is too inaccurate; skip this point
        continue;
      }
      if (diff > 0) {
        up_e += diff;
      } else if (diff < 0) {
        down_e -= diff;
      }
    }
    let r = { up: up_e, down: down_e };

    return r;
  }

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
  let calc = 0;
  let tracking_distance;

  let polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
  let polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
    tracking_group
  );

  let updated_at=new Date().getTime() / 1000;
  const measure_distance = function (action) {
    if (action == "destroy") {
      status.path_selection = false;
      measure_group_path.clearLayers();
      measure_group.clearLayers();
      geoJSON_group.clearLayers();
      distances = [];

      polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
      calc = 0;
      return true;
    }

    if (action == "destroy_tracking") {
      tracking_altitude = [];
      document.getElementById("tracking-altitude").innerText = "";
      document.querySelector("div#tracking-distance").innerText = "";
      document.querySelector("div#tracking-evo-up span").innerText = "";
      document.querySelector("div#tracking-evo-down span").innerText = "";
      document.querySelector("div#tracking-moving-time span").innerText = "";
      document.querySelector("div#tracking-speed-average-time").innerText = "";
      distances = [];
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
      status.running=false;
      status.live_track=""

      return true;
    }

    if (action == "tracking") {
      status.tracking_running = true;

      if ("requestWakeLock" in navigator) {
        gps_lock = window.navigator.requestWakeLock("gps");
        if (setting.tracking_screenlock) screenWakeLock("lock", "screen");
      }

      if (localStorage.getItem("tracking_cache") !== null) {
        if (
          window.confirm(
            "looks like a tracking was aborted without saving it, would you like to continue?"
          )
        ) {
          let f = JSON.parse(localStorage.getItem("tracking_cache"));
          f.forEach((e) => {
            tracking_cache.push(e);
          });

          //restore path
          tracking_altitude = [];
          tracking_timestamp = [];
          tracking_latlngs = [];

          for (let i = 0; i < tracking_cache.length; i++) {
            polyline_tracking.addLatLng([
              tracking_cache[i].lat,
              tracking_cache[i].lng,
              tracking_cache[i].timestamp,
            ]);

            tracking_timestamp.push(tracking_cache[i].timestamp);
            tracking_altitude.push(tracking_cache[i].alt);
          }
        } else {
          localStorage.removeItem("tracking_cache");
          tracking_cache = [];
          tracking_altitude = [];
          tracking_timestamp = [];
        }
      }

      tracking_interval = setInterval(function () {
        if (mainmarker.accuracy > 10000) return false;
        // Only record data if accuracy is high enough

        //store time
        let ts = new Date();
        tracking_timestamp.push(ts.toISOString());
        //store altitude
        let alt = 0;

        if (mainmarker.device_alt) {
          alt = mainmarker.device_alt;
        }

        tracking_altitude.push(alt);

        polyline_tracking.addLatLng([
          mainmarker.device_lat,
          mainmarker.device_lng,
          alt,
        ]);

        tracking_cache.push({
          lat: mainmarker.device_lat,
          lng: mainmarker.device_lng,
          alt: alt,
          timestamp: ts.toISOString(),
        });

        // Update the view with tracking data

        if (tracking_cache.length > 2) {
          // Save tracking data to local storage

          localStorage.setItem(
            "tracking_cache",
            JSON.stringify(tracking_cache)
          );

          //get tracking data to display in view
          new L.GPX(toGPX(), { async: true }).on("loaded", function (e) {
            //meter
            if (general.measurement_unit == "km") {
              // Calculate the distance along the polyline
              let a = calcDistance(polyline_tracking);
              document.querySelector("div#tracking-distance").innerText =
                a.toFixed(2) + general.measurement_unit;

              let b = e.target._info.elevation.gain;
              document.querySelector("#tracking-evo-up span").innerText =
                elevation(tracking_altitude).up.toFixed(2);

              let c = e.target._info.elevation.loss;
              document.querySelector("#tracking-evo-down span").innerText =
                elevation(tracking_altitude).down.toFixed(2);

              document.getElementById("tracking-altitude").innerText =
                mainmarker.device_alt;

              let d = e.target.get_moving_speed();
              document.querySelector("#tracking-speed-average-time").innerText =
                d.toFixed(2);
            }
            //miles
            if (general.measurement_unit == "mil") {
              // Calculate the distance along the polyline
              let a = calcDistance(polyline_tracking);
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

              let d = e.target.get_moving_speed_imp();
              d ? d.toFixed(2) : "-";
              document.querySelector("#tracking-speed-average-time").innerText =
                d;
            }

            let d = e.target.get_duration_string(
              e.target.get_total_time(),
              false
            );
            document.querySelector("#tracking-moving-time span").innerText = d;
          });
        }

        if (status.live_track) {
          
          if (status.live_track_id!='') {
            osm.osm_server_upload_gpx("live_track.gpx", toGPX());
          } else {
            let calc_dif=(new Date().getTime() / 1000)-updated_at;
          if(calc_dif>20)
          {osm.osm_update_gpx(status.live_track_id, toGPX())
            updated_at=new Date().getTime() / 1000;
          
          }
            
          }
        }
        // Stop tracking if mainmarker.tracking is false
        if (mainmarker.tracking == false) {
          clearInterval(tracking_interval);
          if (setting.tracking_screenlock) screenWakeLock("unlock", "screen");
        }
      }, 3000);
    }

    if (action == "addMarker") {
      status.path_selection = true;
      L.marker([mainmarker.current_lat, mainmarker.current_lng])
        .addTo(measure_group)
        .setIcon(maps.select_icon);

      let l = measure_group.getLayers();

      polyline.addLatLng([mainmarker.current_lat, mainmarker.current_lng]);

      geoJSON_group.addLayer(measure_group);
      geoJSON_group.addLayer(polyline);

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

  //when the default value is always meter
  //setting.measurement == true = metric
  let convert_units = function (unit, value) {
    //metric
    let a;
    if (unit == "kilometer" && setting.measurement == true) {
      a = value / 1000;
    }

    if (unit == "meter" && setting.measurement == true) {
      a = value;
    }

    //imperial

    if (unit == "meter" && setting.measurement == false) {
      a = value * 3.280839895;
    }

    if (unit == "kilometer" && setting.measurement == false) {
      a = value * 0.6213711922;
    }
    return a.toFixed(2);
  };

  return {
    convert_units,
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

    get_closest_point,
    pushLocalNotification,
    uniqueId,
  };
})();
