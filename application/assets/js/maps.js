    ////////////////////
    ////MAPS////////////
    ///////////////////
    const maps = (() => {
        function moon_map() {
            tilesUrl =
                "https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-moon-basemap-v0-1/all/{z}/{x}/{y}.png";
            tilesLayer = L.tileLayer(tilesUrl, {
                maxZoom: 12,
                minZoom: 2,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            });

            map.addLayer(tilesLayer);
        }

        function toner_map() {
            tilesUrl = "https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png";
            tilesLayer = L.tileLayer(tilesUrl, {
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            });

            map.addLayer(tilesLayer);
        }

        function opentopo_map() {
            tilesUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
            tilesLayer = L.tileLayer(tilesUrl, {
                maxZoom: 17,
                attribution: "Map data &copy;<div> © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)</div>",
            });

            map.addLayer(tilesLayer);
        }

        function owm_map() {
            tilesUrl =
                "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" +
                openweather_api;
            tilesLayer = L.tileLayer(tilesUrl, {
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            });

            map.addLayer(tilesLayer);
        }

        function osm_map() {
            tilesUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
            tilesLayer = L.tileLayer(tilesUrl, {
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            });

            map.addLayer(tilesLayer);
        }


        function weather_map() {


            fetch('https://api.rainviewer.com/public/maps.json')
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {

                    let weather_url = "https://tilecache.rainviewer.com/v2/radar/" + data[data.length - 4] + "/256/{z}/{x}/{y}/2/1_1.png";
                    let weather_layer = L.tileLayer(weather_url);


                    let weather_url1 = "https://tilecache.rainviewer.com/v2/radar/" + data[data.length - 3] + "/256/{z}/{x}/{y}/2/1_1.png";
                    let weather_layer1 = L.tileLayer(weather_url1);

                    let weather_url2 = "https://tilecache.rainviewer.com/v2/radar/" + data[data.length - 2] + "/256/{z}/{x}/{y}/2/1_1.png";
                    let weather_layer2 = L.tileLayer(weather_url2);

                    let weather_url3 = "https://tilecache.rainviewer.com/v2/radar/" + data[data.length - 1] + "/256/{z}/{x}/{y}/2/1_1.png";
                    let weather_layer3 = L.tileLayer(weather_url3);


                    let tilesUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
                    let tilesLayer = L.tileLayer(tilesUrl, {
                        maxZoom: 18
                    });

                    map.addLayer(tilesLayer);
                    map.addLayer(weather_layer);
                    map.addLayer(weather_layer1);
                    map.addLayer(weather_layer2);
                    map.addLayer(weather_layer3);

                    let i = 0;
                    setInterval(() => {
                        i++;
                        if (i == 1) {
                            map.addLayer(weather_layer);
                            map.removeLayer(weather_layer1);
                            map.removeLayer(weather_layer2);
                            map.removeLayer(weather_layer3);

                        }

                        if (i == 2) {
                            map.removeLayer(weather_layer);
                            map.addLayer(weather_layer1);
                            map.removeLayer(weather_layer2);
                            map.removeLayer(weather_layer3);

                        }

                        if (i == 3) {
                            map.removeLayer(weather_layer);
                            map.removeLayer(weather_layer1);
                            map.addLayer(weather_layer2);
                            map.removeLayer(weather_layer3);

                        }
                        if (i == 4) {
                            map.removeLayer(weather_layer);
                            map.removeLayer(weather_layer1);
                            map.removeLayer(weather_layer2);
                            map.addLayer(weather_layer3);

                        }
                        if (i == 5) i = 0


                    }, 2000);


                    toaster(moment.unix(data[data.length - 1]).format("DD.MM.YYYY, HH:MM"), 3000)

                })
                .catch(function (err) {
                    toaster("Can't load weather data", 3000)
                })



        }
        return {
            moon_map,
            toner_map,
            opentopo_map,
            owm_map,
            osm_map,
            weather_map,
        };
    })();