const overpass = (() => {
  function getRandomRgbColor(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function generateRandomColor() {
    const minBrightness = 255; // Customize this threshold for darkness

    let r, g, b;

    do {
      r = getRandomRgbColor(0, 255);
      g = getRandomRgbColor(0, 255);
      b = getRandomRgbColor(0, 255);

      // Check if the color is too light (adjust this condition based on your needs)
    } while ((r + g + b) / 3 > minBrightness);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function call(map, overpassQuery, icon) {
    //clear group before ad new items
    if (general.zoomlevel > 13) {
      helper.side_toaster(
        "Please zoom, otherwise too much data will be loaded",
        2000
      );
      return false;
    }
    let public_transport = false;
    let relation_query = "[" + overpassQuery + "]";
    let way_query = overpassQuery;
    if (overpassQuery.indexOf("public_transport") > -1) {
      relation_query = "['type'='route']['route'='bus']";
      way_query = "public_transport=platform";
      public_transport = true;
    }

    //remove layer
    if (general.active_layer.includes(overpassQuery)) {
      helper.side_toaster("layer removed", 2000);

      overpass_group.eachLayer(function (layer) {
        if (layer.tag === overpassQuery) {
          console.log("try");
          overpass_group.removeLayer(layer._leaflet_id);
        }
      });

      general.active_layer.splice(
        general.active_layer.indexOf(overpassQuery),
        1
      );

      return false;
    }

    //boundingbox
    let e = map.getBounds().getEast();
    let w = map.getBounds().getWest();
    let n = map.getBounds().getNorth();
    let s = map.getBounds().getSouth();

    var bounds = s + "," + w + "," + n + "," + e;
    var nodeQuery = "(node[" + overpassQuery + "](" + bounds + ");";
    var wayQuery = "way[" + way_query + "](" + bounds + ");";
    var relationQuery = "relation" + relation_query + "(" + bounds + ");)";
    var query =
      "?data=[out:json][timeout:25];" +
      nodeQuery +
      wayQuery +
      relationQuery +
      ";out;>;out skel%3b";
    var baseUrl = "https://overpass-api.de/api/interpreter";
    var resultUrl = baseUrl + query;

    let segmentCoords = [];
    let history = "";
    fetch(resultUrl)
      .then((response) => response.json())
      .then(function (data) {
        let no_data = false;
        data.elements.forEach((element) => {
          // console.log(element);
          if (element.type == "node" && !public_transport) {
            no_data = true;
            let k = L.marker([element.lat, element.lon])
              .addTo(overpass_group)
              .setIcon(maps[icon]);

            k.tag = overpassQuery;
            try {
              k.bindPopup(element.tags.name);
            } catch (e) {}
          }

          if (element.type == "way" && !public_transport) {
            no_data = true;
          }

          if (element.type == "relation" && public_transport) {
            no_data = true;
            let f = element;
            element.members.forEach((e) => {
              //console.log(e.ref);
              data.elements.forEach((m) => {
                if (m.id == e.ref) {
                  if (m.type == "node") {
                    // console.log(f.tags.name);
                    let k = L.marker([m.lat, m.lon])
                      .addTo(overpass_group)
                      .setIcon(maps[icon]);

                    k.tag = overpassQuery;

                    try {
                      k.bindPopup(f.tags.name);
                    } catch (e) {}

                    segmentCoords.push([m.lat, m.lon]);

                    //draw line and reset
                    if (f.id != history) {
                      segmentCoords.pop();
                      let h = L.polyline(segmentCoords, {
                        color: generateRandomColor(),
                      });

                      h.tag = overpassQuery;
                      h.name = "test";

                      h.addTo(overpass_group);
                      segmentCoords = [];
                    }

                    history = f.id;
                  }
                }
              });
            });
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
