const overpass = (() => {
  function call(map, overpassQuery, icon) {
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
    var baseUrl = "http://overpass-api.de/api/interpreter";
    var resultUrl = baseUrl + query;
    console.log(query);
    // return resultUrl;

    fetch(resultUrl)
      .then((response) => response.json())
      .then((data) =>
        data.elements.forEach((element) => {
          if (element.type == "node") {
            L.marker([element.lat, element.lon])
              .addTo(markers_group)
              .setIcon(maps[icon])
              .bindPopup(element.tags.name);
          }
        })
      )
      .then(helper.side_toaster("loaded", 2000))
      .catch(function (err) {
        console.log(err);
      });
  }

  return {
    call,
  };
})();
