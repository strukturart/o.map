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
    distance = map.distance([from_lat, from_lng], [to_lat, to_lng]) / 1000;

    distance = Math.ceil(distance).toFixed(2);

    return distance;
  };

  return {
    ruler_toggle,
    select_marker,
    calc_distance,
  };
})();
