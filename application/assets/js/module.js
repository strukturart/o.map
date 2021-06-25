const module = (() => {
  ////////////////////
  ////RULER///////////
  ///////////////////
  var ruler_activ = false;

  let ruler_toggle = function () {
    if (ruler_activ) {
      $("div.leaflet-ruler").addClass("leaflet-ruler-clicked");

      $("div.leaflet-ruler").remove();

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
