const overpass = (() => {
  function call(map, overpassQuery, icon) {
    console.log(general.zoomlevel);
    //clear group before ad new items
    if (general.zoomlevel > 13) {
      helper.side_toaster(
        "Please zoom, otherwise too much data will be loaded",
        2000
      );
      return false;
    }
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
        console.log(data);
        let no_data = false;
        data.elements.forEach((element) => {
          console.log(element);
          if (element.type == "node") {
            no_data = true;
            let k = L.marker([element.lat, element.lon])
              .addTo(overpass_group)
              .setIcon(maps[icon]);
            try {
              k.bindPopup(element.tags.name);
            } catch (e) {}
          }
        });

        if (!no_data) {
          helper.side_toaster("no data", 4000);
        } else {
          helper.side_toaster("layer loaded", 2000);
        }
      })
      .catch(function (err) {
        helper.side_toaster("something went wrong, try again" + err, 6000);
      });
  }

  return {
    call,
  };
})();
