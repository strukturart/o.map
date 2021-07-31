const module = (() => {
  ////////////////////
  ////RULER///////////
  ///////////////////
  var ruler_activ = false;
  let ruler_toggle = function () {
    if (ruler_activ) {
      ruler_activ = false;
      navigator.spatialNavigationEnabled = false;

      return false;
    }
    if (!ruler_activ) {
      L.control.ruler().addTo(map);
      $("div.leaflet-ruler").addClass("leaflet-ruler-clicked");

      navigator.spatialNavigationEnabled = true;
      ruler_activ = true;

      return false;
    }
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

  let measure_group = new L.FeatureGroup();
  map.addLayer(measure_group);
  map.addLayer(track_group);

  map.addLayer(measure_group_path);

  let distances = [];
  let latlngs = [];
  let tracking_latlngs = [];
let tracking_interval

  let polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
  let polyline_track = L.polyline(tracking_latlngs, path_option).addTo(track_group);


  const measure_distance = function (action) {
    if (action == "destroy") {
      status.path_selection = false;

      measure_group_path.clearLayers();
      measure_group.clearLayers();
      //polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);
      return true;
    }

    if (action == "tracking") {
      tracking_interval = setInterval(function(){
        console.log("tracking")

        polyline_track.addLatLng([mainmarker.device_lat, mainmarker.device_lng])
        if(mainmarker.tracking == false)clearInterval(tracking_interval);
      },10000)
      

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
    ruler_toggle,
    select_marker,
    calc_distance,
    compass,
    measure_distance,
  };
})();
