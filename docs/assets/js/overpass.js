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
        if (data.elements.length === 0) {
          helper.side_toaster("no data", 4000);
          document.querySelector(".loading-spinner").style.display = "none";
          document.activeElement.classList.remove("");
          return false;
        }

        if (data.elements.length > 80000) {
          helper.side_toaster(
            "There is too much data to process, please use a different zoom level",
            6000
          );
          document.querySelector(".loading-spinner").style.display = "none";
        } else {
          for (let i = 0; i < data.elements.length; i++) {
            const element = data.elements[i];

            // Your existing logic here
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

            if (element.type === "relation" && public_transport) {
              let f = element;

              element.members.forEach((e) => {
                let m = data.elements.find((m) => m.id === e.ref);

                let hh = "";
                try {
                  hh = m.tags.name;
                } catch (e) {}

                if (m && m.type === "way") {
                }

                if (m && m.type === "node") {
                  //todo add tags.name as popoup
                  segmentCoords.push({
                    latlng: [m.lat, m.lon],
                    popup: hh,
                  });

                  if (f.id !== history) {
                    segmentCoords.pop();
                    let h = L.polyline(
                      segmentCoords.map((coord) => coord.latlng),
                      {
                        color: generateRandomColor(),
                      }
                    );

                    var popup = L.popup({
                      maxWidth: "80%",
                    });

                    popup.setContent(f.tags.name);

                    h.bindPopup(popup);
                    h.tag = overpassQuery;

                    h.addTo(overpass_group);
                    segmentCoords = [];
                  }

                  history = f.id;
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
        helper.side_toaster("something went wrong, try again" + err, 6000);
      }
    );
  }

  return {
    call,
  };
})();
