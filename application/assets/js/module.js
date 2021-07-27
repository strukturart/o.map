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

  let index = 0;
  let select_marker = function () {
    let l = markers_group.getLayers();
    index = index + 1;

    if (index > l.length - 1) index = 0;

    map.setView(l[index]._latlng, map.getZoom());
    status.marker_selection = true;
    bottom_bar("cancel", "option", "");
    l[index].setIcon(maps.select_icon);

    if (index - 1 == -1) {
      l[l.length - 1].setIcon(maps.default_icon);

      l[l.length - 1].closePopup();
    } else {
      l[index - 1].setIcon(maps.default_icon);
      l[index - 1].closePopup();
    }

    //popup
    document.querySelector("textarea#popup").value = "";
    let pu = l[index].getPopup();

    if (pu != undefined) {
      document.querySelector("textarea#popup").value = pu._content;
      //show popup
      setTimeout(function () {
        //l[index].openPopup();
        l[index].bindPopup(pu._content, popup_option).openPopup();
      }, 1000);
    }

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

  let measure_group_path = new L.FeatureGroup();
  map.addLayer(measure_group_path);

  let distances = [];
  var latlngs = [];
  let polyline;

  const measure_distance = function (action) {
    if (action == "destroy") {
      measure_group_path.clearLayers();
      measure_group.clearLayers();

      if (map.hasLayer(measure_group_path)) {
        console.log(measure_group_path.length);
        measure_group_path.eachLayer(function (l) {
          measure_group_path.removeLayer(l);
          polyline = "";
          console.log("yes");
        });
      }

      return true;
    }

    if (action == "addMarker") {
      L.marker([mainmarker.current_lat, mainmarker.current_lng])
        .addTo(measure_group)
        .setIcon(maps.select_icon);

      let l = measure_group.getLayers();

      latlngs.push([mainmarker.current_lat, mainmarker.current_lng]);

      polyline = L.polyline(latlngs, path_option).addTo(measure_group_path);

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
