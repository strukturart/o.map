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
        console.log("access forbidden");
      }
      // analyze HTTP status of the response
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

  let closest_average = [];

  let instructions = function (currentPosition) {
    if (routing.active == false) return false;
    gps_lock = window.navigator.requestWakeLock("gps");

    let latlng = [mainmarker.device_lat, mainmarker.device_lng];

    let k = L.GeometryUtil.closest(map, routing.coordinates, latlng);
    routing.closest = L.GeometryUtil.closest(map, routing.coordinates, latlng);

    //notification
    if (setting.routing_notification == false) return false;

    closest_average.push(k.distance);
    let result = 0;
    let sum = 0;
    if (closest_average.length > 48) {
      closest_average.forEach(function (e) {
        sum = sum + e;
      });

      if (closest_average.length > 50) {
        closest_average.length = 0;
        sum = 0;
        result = 0;
      }

      result = sum / 40;

      if (result > 1) {
        navigator.vibrate([1000, 500, 1000]);
        console.log("to far");
      } else {
        console.log("okay");
      }
    }
  };

  return {
    instructions,
    request,
    addPoint,
  };
})();
