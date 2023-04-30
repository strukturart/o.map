const rs = ((_) => {
  let request = function (from, to, apikey, profile, callback) {
    let xhr = new XMLHttpRequest({
      mozSystem: true,
      "Content-Type": "application/json",
    });

    xhr.open(
      "GET",
      "https://api.openrouteservice.org/v2/directions/" +
        profile +
        "?api_key=" +
        apikey +
        "&" +
        "start=" +
        from +
        "&" +
        "end=" +
        to
    );

    xhr.timeout = 4000;

    xhr.ontimeout = function (e) {};

    xhr.onload = function () {
      if (xhr.status == 200) {
        callback(JSON.parse(xhr.responseText), false);
      }
      if (xhr.status == 403) {
        helper.side_toaster("The API key is invalid", 2000);
      }
      if (xhr.status != 200) {
        helper.side_toaster("the route could not be loaded.", 2000);
      }
    };

    xhr.onerror = function (err) {
      console.log(err);
    };
    xhr.send(null);
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

  let instructions = function () {};

  let routing_profile = ["cycling-road", "foot-hiking", "driving-car"];
  let m = routing_profile.indexOf(settings.profile);

  let change_type = function () {
    m < 2 ? m++ : (m = 0);

    setting.routing_profil = routing_profile[m];
    document.activeElement.innerText = setting.routing_profil;
  };

  return {
    change_type,
    instructions,
    request,
    addPoint,
  };
})();
