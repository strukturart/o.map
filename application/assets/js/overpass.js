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

    let public_transport = false;
    let relation_query = "[" + overpassQuery + "]";
    let way_query = "[" + overpassQuery + "]";
    let node_query = "[" + overpassQuery + "]";

    if (overpassQuery.indexOf(",") > -1) {
      // Split the query by comma
      let parts = overpassQuery.split(",");

      // Trim whitespace from each part
      let part1 = parts[0].trim();
      let part2 = parts[1].trim();

      // Construct the queries
      relation_query = `[${part1}][${part2}]`;
      way_query = `[${part1}][${part2}]`;
      node_query = `[${part1}][${part2}]`;
    }

    if (overpassQuery.indexOf("public_transport") > -1) {
      node_query = "['public_transport'='stop_position']['bus'='yes']";
      relation_query = "['type'='route']['route'='bus']";
      way_query = "['public_transport'='stop_platform']['bus'='yes']";
      public_transport = true;
    }

    //remove layer
    if (general.active_layer.includes(overpassQuery)) {
      helper.side_toaster("layer removed", 2000);

      overpass_group.eachLayer(function (layer) {
        if (layer.tag === overpassQuery) {
          overpass_group.removeLayer(layer._leaflet_id);
        }
      });

      general.active_layer.splice(
        general.active_layer.indexOf(overpassQuery),
        1
      );

      return false;
    }

    let currentBounds = map.getBounds();

    // Apply 20% padding to the bounds
    let paddedBounds = currentBounds.pad(0.2);

    // Extract the padded bounds
    let e = paddedBounds.getEast();
    let w = paddedBounds.getWest();
    let n = paddedBounds.getNorth();
    let s = paddedBounds.getSouth();

    // Create the bounding box string
    var bounds = s + "," + w + "," + n + "," + e;

    // Construct the queries using the padded bounds
    var nodeQuery = "(node" + node_query + "(" + bounds + ");";
    var wayQuery = "way" + way_query + "(" + bounds + ");";
    var relationQuery = "relation" + relation_query + "(" + bounds + ");)";

    var query =
      "?data=[out:json][timeout:25];" +
      nodeQuery +
      wayQuery +
      relationQuery +
      ";out body;>;out skel%3b";
    var baseUrl = "https://overpass-api.de/api/interpreter";
    var resultUrl = baseUrl + query;

    let segmentCoords = [];
    let segmentCoordsMarker = [];
    function fetchDataWithXHR(resultUrl, callback, errorCallback) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", resultUrl, true);
      xhr.responseType = "json";

      var timeoutId; // Variable to store the timeout ID

      // Set up a function to handle the timeout event
      // Set up a one-time timeout using setTimeout
      timeoutId = setTimeout(function () {
        xhr.abort();
        document.querySelector(".loading-spinner").style.display = "none";
        helper.side_toaster("Too much data, loading was aborted", 6000);
      }, 20000); // Set the timeout duration in milliseconds

      xhr.onload = function () {
        if (xhr.status === 200) {
          callback(xhr.response);
          clearInterval(timeoutId); // Clear the interval if the request is successful
        } else {
          errorCallback(
            new Error(`Failed to fetch: ${xhr.status} ${xhr.statusText}`)
          );
        }
      };

      xhr.onprogress = function (event) {
        document.querySelector(".loading-spinner").style.display = "block";

        if (event.lengthComputable) {
          // If total size is known, you can calculate the progress percentage
          var progress = (event.loaded / event.total) * 100;
          console.log(`Download Progress: ${progress}% (${event.loaded})`);
        } else {
          // If total size is not known, just track the downloaded size
          downloadedSize = event.loaded / (1024 * 1024); // Convert bytes to megabytes
          console.log(`Downloaded Size: ${downloadedSize} megabytes`);
        }
      };

      xhr.onerror = function () {
        errorCallback(new Error("Network error occurred"));
        document.querySelector(".loading-spinner").style.display = "none";
        clearTimeout(timeoutId); // Clear the timeout if there is an error
      };

      xhr.send();
    }

    fetchDataWithXHR(
      resultUrl,
      function (data) {
        console.log(data);
        if (data.elements.length === 0) {
          helper.side_toaster("no data", 4000);
          document.querySelector(".loading-spinner").style.display = "none";
          document.activeElement.classList.remove("");
          return false;
        }

        if (data.elements.length > 50000) {
          helper.side_toaster(
            "There is too much data to process, please use a different zoom level",
            6000
          );
          document.querySelector(".loading-spinner").style.display = "none";
        } else {
          // console.log(data);

          for (let i = 0; i < data.elements.length; i++) {
            const element = data.elements[i];

            if (element.type === "node" && !public_transport) {
              let k = L.marker([element.lat, element.lon])
                .addTo(overpass_group)
                .setIcon(maps[icon]);

              k.tag = overpassQuery;
              try {
                k.bindPopup(element.tags.name);
              } catch (e) {}
            }

            if (element.type === "way" && !public_transport) {
              // Your logic for ways
            }

            if (element.type === "way" && public_transport) {
              //  if (element.tags.name) console.log(element);
            }

            //public transport
            if (element.type === "relation" && public_transport) {
              let f = element;

              //relation name
              let relation_name =
                f.tags.name !== undefined && f.tags.name !== null
                  ? f.tags.name
                  : "";
              //color
              let color =
                f.tags.colour !== undefined && f.tags.colour !== null
                  ? f.tags.colour
                  : generateRandomColor();

              element.members.forEach((e, index) => {
                let m = data.elements.find((m) => m.id === e.ref);

                if (m && m.type === "node") {
                  if (e.role == "stop") {
                    segmentCoordsMarker.push({
                      id: m.id,
                      latlng: [m.lat, m.lon],
                    });
                  }
                }

                if (m && m.type === "way") {
                  m.nodes.forEach((e) => {
                    let m = data.elements.find((m) => m.id === e);

                    segmentCoords.push({
                      id: m.id,
                      latlng: [m.lat, m.lon],
                      color: color,
                      name: relation_name,
                    });
                  });
                }

                if (index === element.members.length - 1) {
                  let h = L.polyline(
                    segmentCoords.map((coord) => coord.latlng),
                    {
                      color: color,
                      weight: 4,
                    }
                  );

                  var popup = L.popup({
                    maxWidth: "80%",
                  });

                  popup.setContent(relation_name);

                  h.bindPopup(popup);
                  h.tag = overpassQuery;
                  h.markers = segmentCoordsMarker;

                  h.addTo(overpass_group);
                  segmentCoords = [];
                  segmentCoordsMarker = [];
                }
              });
            }
          }
          helper.side_toaster(
            "You can select the line with key 0 and the stops with key 3",
            6000
          );
          document.querySelector(".loading-spinner").style.display = "none";
        }
      },
      function (err) {
        document.querySelector(".loading-spinner").style.display = "none";

        helper.side_toaster("something went wrong, try again" + err, 6000);
      }
    );
  }

  return {
    call,
  };
})();
