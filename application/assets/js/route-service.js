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
        callback(JSON.parse(xhr.responseText));
      }
      if (xhr.status == 403) {
        console.log("access forbidden");
      }
      // analyze HTTP status of the response
      if (xhr.status != 200) {
        console.log(xhr.status);
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
      }

      if (type == "end") {
        routing.end = latlng.lng + "," + latlng.lat;
      }
    }
  };

  return {
    request,
    addPoint,
  };
})();
