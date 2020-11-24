const weather = (() => {


    let openweather_call = function(lat, lng, apikey, callback) {
        let xhr = new XMLHttpRequest({ mozSystem: true });
        xhr.open("GET", "https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lng + "&appid=" + apikey);
        xhr.timeout = 4000; // time in milliseconds

        xhr.ontimeout = function(e) {};

        xhr.onload = function() {
            if (xhr.status == 200) {
                callback(
                    alert(xhr.responseText)
                )
            }
            if (xhr.status == 403) {
                alert("access forbidden")
            }
            // analyze HTTP status of the response
            if (xhr.status != 200) {
                alert(xhr.status)
            }
        }

        xhr.onerror = function(err) {
            //err;
        }
        xhr.send();

    }

    return { openweather_call }


})();