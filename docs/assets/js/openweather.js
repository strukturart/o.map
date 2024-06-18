const weather = (() => {
  //todo > 2024 06 change to 3.O
  let openweather_call = function (lat, lng, apikey, callback) {
    let xhr = new XMLHttpRequest({
      mozSystem: true,
    });
    xhr.open(
      "GET",
      "https://api.openweathermap.org/data/2.5/onecall?units=metric&cnt=4&lat=" +
        lat +
        "&lon=" +
        lng +
        "&appid=" +
        apikey
    );
    xhr.timeout = 4000; // time in milliseconds

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
      }
    };

    xhr.onerror = function (err) {
      console.log(err);
    };
    xhr.send();
  };

  return {
    openweather_call,
  };
})();
