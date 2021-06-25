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

  return {
    ruler_toggle,
  };
})();
