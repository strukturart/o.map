const overpass = (() => {
  function call(map, overpassQuery, icon) {
    //clear group before ad new items

    if (overpass_group != "") {
      overpass_group.clearLayers();
      contained = [];
    }

    //remove layer
    if (overpass_query == overpassQuery) {
      helper.side_toaster("layer removed", 2000);
     
      overpass_group.clearLayers();
      contained = [];
      overpass_query = "";

      return false;
    }

    overpass_query = overpassQuery;

    //boundingbox
    let e = map.getBounds().getEast();
    let w = map.getBounds().getWest();
    let n = map.getBounds().getNorth();
    let s = map.getBounds().getSouth();

    var bounds = s + "," + w + "," + n + "," + e;
    var nodeQuery = "(node[" + overpassQuery + "](" + bounds + ");";
    var wayQuery = "way[" + overpassQuery + "](" + bounds + ");";
    var relationQuery = "relation[" + overpassQuery + "](" + bounds + ");)";
    var query =
      "?data=[out:json][timeout:25];" +
      nodeQuery +
      wayQuery +
      relationQuery +
      ";out;>;out skel%3b";
    var baseUrl = "https://overpass-api.de/api/interpreter";
    var resultUrl = baseUrl + query;

    fetch(resultUrl)
      .then((response) => response.json())
      .then(function (data) {
        if (data == "") {
          return false;
        }

        let no_data = false;
        data.elements.forEach((element) => {
          if (element.type == "node") {
            no_data = true;
            L.marker([element.lat, element.lon])
              .addTo(overpass_group)
              .setIcon(maps[icon])
              .bindPopup(element.tags.name);
          }
        });

        if (no_data == false) {
          helper.side_toaster("no data", 4000);
        } else {
          helper.side_toaster("layer loaded", 2000);
        }
      })
      .catch(function (err) {
        helper.side_toaster("something went wrong, try again", 6000);
      });
  }

  return {
    call,
  };
})();
