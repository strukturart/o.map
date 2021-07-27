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
    console.log(d);
    let distance;

    if (d < 2000) {
      console.log("m");

      distance = d.toFixed(0) + " m";
    } else {
      console.log("km");
      d = d / 1000;
      distance = d.toFixed(0) + " km";
    }

    return distance;
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

  return {
    ruler_toggle,
    select_marker,
    calc_distance,
    compass,
  };
})();
