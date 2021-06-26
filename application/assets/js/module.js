const module = (() => {
  ////////////////////
  ////RULER///////////
  ///////////////////
  var ruler_activ = false;
  let ruler_toggle = function () {
    if (ruler_activ) {
      $(".leaflet-interactive").remove();
      $("div.leaflet-ruler").addClass("leaflet-ruler-clicked");
      $(
        "div.leaflet-tooltip.result-tooltip.leaflet-zoom-animated.leaflet-tooltip-left"
      ).remove();
      $("div.leaflet-ruler").remove();
      $(".result-tooltip").remove();
      $(".moving-tooltip").remove();

      L.control.ruler().remove();

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
  let jump_to_layer = function () {
    let l = markers_group.getLayers();
    index = index + 1;

    console.log(l.length);

    if (index > l.length - 1) index = 0;

    map.setView(l[index]._latlng, current_zoom_level);
  };

  let calc_distance = function (from_lat, from_lng, to_lat, to_lng) {
    distance = map.distance([from_lat, from_lng], [to_lat, to_lng]) / 1000;

    distance = Math.ceil(distance).toFixed(2);

    return distance;
  };

  return {
    ruler_toggle,
    jump_to_layer,
    calc_distance,
  };
})();
