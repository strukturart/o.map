const rs = ((_) => {
  let request = function (from, to, apikey, profile, callback) {
    let xhr = new XMLHttpRequest({
      mozSystem: true,
    });

    xhr.open(
      "POST",
      "https://api.openrouteservice.org/v2/directions/" + profile + "/geojson"
    );
    xhr.setRequestHeader("Authorization", apikey);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader(
      "Accept",
      "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8"
    );

    xhr.timeout = 4000;

    xhr.ontimeout = function (e) {
      helper.side_toaster("Timeout error", 5000);
    };

    xhr.onprogress = function () {};

    //https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/geojson/post
    xhr.onload = function () {
      if (xhr.status == 200) {
        callback(JSON.parse(xhr.responseText), false);
        document.querySelector(".loader").style.display = "none";
      }
      if (xhr.status == 403) {
        helper.side_toaster("The API key is invalid", 5000);
        document.querySelector(".loader").style.display = "none";
      }

      if (xhr.status == 503) {
        document.querySelector(".loader").style.display = "none";

        helper.side_toaster(
          "The server is currently unavailable due to overload or maintenance.The API key is invalid",
          5000
        );
      }
      if (xhr.status != 200) {
        document.querySelector(".loader").style.display = "none";

        helper.side_toaster("the route could not be loaded.", 5000);
        routing.active = false;
      }
    };

    xhr.onerror = function (err) {
      document.querySelector(".loader").style.display = "none";

      helper.side_toaster("Something going wrong" + err, 5000);
      routing.active = false;
    };

    let a = from.split(",");
    let b = to.split(",");

    const body = {
      coordinates: [a, b],
      elevation: "true",
    };
    xhr.send(JSON.stringify(body));
  };

  let addPoint = function (type, action, latlng) {
    if (action == "add") {
      if (type == "start") {
        routing.start = latlng.lng + "," + latlng.lat;
        status.selected_marker.setIcon(maps.start_icon);
        routing.start_marker_id = status.selected_marker._leaflet_id;
      }

      if (type == "end") {
        routing.end = latlng.lng + "," + latlng.lat;
        status.selected_marker.setIcon(maps.end_icon);
        routing.end_marker_id = status.selected_marker._leaflet_id;
      }
    }
    markers_group.eachLayer(function (e) {
      e.setIcon(maps.default_icon);
      if (e._leaflet_id == routing.start_marker_id) {
        e.setIcon(maps.start_icon);
      }
      if (e._leaflet_id == routing.end_marker_id) {
        e.setIcon(maps.end_icon);
      }
    });
  };

  let routing_profile = [
    "cycling-mountain",
    "cycling-road",
    "foot-hiking",
    "driving-car",
  ];
  let m = routing_profile.indexOf(settings.profile);

  let change_type = function () {
    m < 2 ? m++ : (m = 0);

    setting.routing_profil = routing_profile[m];
    document.activeElement.innerText = setting.routing_profil;
  };

  let reset_routing = () => {
    instructions = [];
    jsonLayer.clearLayers();
    //jsonLayer = L.geoJSON("", { color: "red" });
    routing.data = "";
    routing.active = false;
    routing.loaded = false;
    rs.routing_instructions(instructions);
    helper.side_toaster("Routing stopped", 5000);
  };

  //build html routing instructions
  function routing_instructions(datalist) {
    var template = document.getElementById("template-routing").innerHTML;
    var rendered = Mustache.render(template, { data: datalist });
    document.getElementById("routing-container").innerHTML = rendered;
  }

  return {
    change_type,
    request,
    addPoint,
    reset_routing,
    routing_instructions,
  };
})();
