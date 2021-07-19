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

  let index = 0;
  let select_marker = function () {
    let l = markers_group.getLayers();
    index = index + 1;

    if (index > l.length - 1) index = 0;

    map.setView(l[index]._latlng, map.getZoom());
    //console.log(l[index]._leaflet_id);
    let p = l[index]._leaflet_id;

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

  return {
    ruler_toggle,
    select_marker,
    calc_distance,
  };
})();
