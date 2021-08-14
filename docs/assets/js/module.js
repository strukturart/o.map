const module = (() => {
  let link_to_marker = function (url) {
    let url_split = url.split("/");
    current_lat = url_split[url_split.length - 2];
    current_lng = url_split[url_split.length - 1];

    //remove !numbers
    current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
    current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
    current_lat = Number(current_lat);
    current_lng = Number(current_lng);

    //myMarker = L.marker([current_lat, current_lng]).addTo(map);
    map.setView([current_lat, current_lng]);
  };

  ///////////////////
  //select marker
  ////////////////////

  let index = -1;
  let select_marker = function () {
    status.marker_selection = true;

    let l = markers_group.getLayers();
    index++;

    if (index > l.length - 1) index = 0;

    bottom_bar("cancel", "option", "");

    for (let t = 0; t < l.length; t++) {
      let p = l[t].getIcon();

      if (
        p.options.className != "follow-marker" &&
        p.options.className != "goal-marker"
      ) {
        l[t].setIcon(maps.default_icon);
      }

      l[t].closePopup();
    }
    let p = l[index].getIcon();
    if (
      p.options.className != "follow-marker" &&
      p.options.className != "goal-marker"
    ) {
      l[index].setIcon(maps.select_icon);
    }

    //popup
    document.querySelector("textarea#popup").value = "";
    let pu = l[index].getPopup();

    if (pu != undefined) {
      document.querySelector("textarea#popup").value = pu._content;
      //show popup

      l[index].bindPopup(pu._content, popup_option).openPopup();
    }

    map.setView(l[index]._latlng, map.getZoom());

    return l[index];
  };

  let calc_distance = function (from_lat, from_lng, to_lat, to_lng) {
    let d = map.distance([from_lat, from_lng], [to_lat, to_lng]);
    d = Math.ceil(d);

    return d;
  };

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
  ////PATH & TRACKING
  ///////////////////

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
      tracking_group.clearLayers();
      polyline_tracking = L.polyline(tracking_latlngs, path_option).addTo(
        tracking_group
      );
      mainmarker.tracking = false;
      localStorage.removeItem("tracking_cache");
      return true;
    }

    if (action == "tracking") {
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
            console.log(tracking_cache[i].lat);
            polyline_tracking.addLatLng([
              tracking_cache[i].lat,
              tracking_cache[i].lng,
            ]);
          }
        } else {
          localStorage.removeItem("tracking_cache");
          tracking_cache = [];
        }
      } else {
      }
      screenWakeLock("lock", "screen");
      screenWakeLock("lock", "gps");
      let calc = 0;

      tracking_interval = setInterval(function () {
        polyline_tracking.addLatLng([
          mainmarker.device_lat,
          mainmarker.device_lng,
        ]);

        tracking_cache.push({
          lat: mainmarker.device_lat,
          lng: mainmarker.device_lng,
          alt: mainmarker.device_alt,
        });

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
            calc.toFixed(2) + " km";

          //check if old tracking
          let k = JSON.stringify(tracking_cache);

          localStorage.setItem("tracking_cache", k);
        }
        if (mainmarker.tracking == false) {
          clearInterval(tracking_interval);
          screenWakeLock("unlock", "screen");
          screenWakeLock("unlock", "gps");
        }
      }, 10000);
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
        .bindPopup(calc.toString() + "km", popup_option)
        .openPopup();
    }
  };

  return {
    select_marker,
    calc_distance,
    compass,
    measure_distance,
    link_to_marker,
  };
})();
