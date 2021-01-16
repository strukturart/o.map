"use strict";

let step = 0.001;
let current_lng;
let current_lat;
let current_alt;
let accuracy = 0;
let altitude;
let current_heading;

let zoom_level;
let current_zoom_level;
let new_lat = 0;
let new_lng = 0;
let curPos = 0;
let myMarker = "";
let i = 0;
let windowOpen;
let message_body = "";
let openweather_api = "";
let tabIndex = 0;
let debug = false;

let tilesLayer;
let tileLayer;
let myLayer;
let tilesUrl;
let state_geoloc = false;
let savesearch = false;

let search_current_lng;
let search_current_lat;

let map;
let open_url = false;
let marker_latlng = false;

let file_path;
let storage_name;
let json_modified = false;

let markers_group = new L.FeatureGroup();

let save_mode; // to check save geojson or update json

if (!navigator.geolocation) {
    toaster("Your browser does't support geolocation!", 2000);
}

$(document).ready(function() {
    //welcome message
    $("div#message div").text("Welcome");
    setTimeout(function() {
        $("div#message").css("display", "none");
        //get location if not an activity open url
        if (open_url === false) {
            read_json();
            getLocation("init");
            toaster("Press 3<br> to open the menu", 5000);

            setTimeout(function() {
                $(".leaflet-control-attribution").hide();
            }, 8000);
        }
        ///set default map
        maps.opentopo_map();
        setTimeout(() => {
            windowOpen = "map";
        }, 2000);
    }, 4000);

    //leaflet add basic map
    map = L.map("map-container", {
        zoomControl: false,
        dragging: false,
        keyboard: true,
    }).fitWorld();

    L.control
        .scale({
            position: "topright",
            metric: true,
            imperial: false,
        })
        .addTo(map);
    map.addLayer(markers_group);





    /////////////////////////
    //read json to build menu
    /////////////////////////
    function read_json() {
        $("div#tracks").empty();
        $("div#maps").empty();
        $("div#layers").empty();
        $("div#markers").empty();

        $("div#maps").append(
            '<div class="items" data-map="toner">Toner <i>Map</i></div>'
        );
        $("div#maps").append(
            '<div class="items" data-map="osm">OSM <i>Map</i></div>'
        );
        $("div#maps").append(
            '<div class="items" data-map="otm">OpenTopo <i>Map</i></div>'
        );
        $("div#maps").append(
            '<div class="items" data-map="moon">Moon <i>Map</i></div>'
        );

        $("div#layers").append(
            '<div class="items" data-map="weather">Weather <i>Map</i></div>'
        );

        find_gpx();
        find_geojson();

        let finder = new Applait.Finder({
            type: "sdcard",
            debugMode: false,
        });
        finder.search("omap.json");

        finder.on("empty", function(needle) {
            toaster("no sdcard found");
            return;
        });

        finder.on("searchComplete", function(needle, filematchcount) {
            if (filematchcount == 0) {
                toaster(
                    "no osm-map.json file found. Please create this file, otherwise you can only use the app to a limited extent.",
                    4000
                );
                return;
            }
        });

        finder.on("fileFound", function(file, fileinfo, storageName) {
            file_path = fileinfo.path + "/" + fileinfo.name;
            storage_name = storageName;

            let reader = new FileReader();

            reader.onerror = function(event) {
                toaster("can't read file");
                reader.abort();
            };

            reader.onloadend = function(event) {
                let data;
                //check if json valid
                try {
                    data = JSON.parse(event.target.result);
                } catch (e) {
                    toaster("File is not valid", 2000);
                    return false;
                }

                //add markers and openweatermap
                $.each(data, function(index, value) {
                    if (value.markers) {
                        $.each(value.markers, function(index, item) {
                            $("div#markers").append(
                                '<div class="items" data-map="marker" data-lat="' +
                                item.lat +
                                '" data-lng="' +
                                item.lng +
                                '">' +
                                item.marker_name +
                                "</div>"
                            );
                        });
                    }

                    if (value.api_key) {
                        openweather_api = value.api_key;
                        $("div#maps").append(
                            '<div class="items" data-map="owm">Open Weather <i>Map</i></div>'
                        );
                    }
                });

                if (json_modified) {
                    json_modified = false;
                }
            };
            reader.readAsText(file);
        });
    }

    //////////////////////////////////
    //READ GPX////////////////////////
    /////////////////////////////////
    let find_gpx = function() {
        //search gpx
        let finder_gpx = new Applait.Finder({
            type: "sdcard",
            debugMode: false,
        });

        finder_gpx.search(".gpx");
        finder_gpx.on("searchComplete", function(needle, filematchcount) {});

        finder_gpx.on("fileFound", function(file, fileinfo, storageName) {
            $("div#tracks").append(
                '<div class="items" data-map="gpx">' + fileinfo.name + "</div>"
            );
        });
    };

    //////////////////////////////////
    //READ GEOJSON////////////////////////
    /////////////////////////////////

    let find_geojson = function() {
        //search geojson
        let finder = new Applait.Finder({
            type: "sdcard",
            debugMode: false,
        });
        finder.search(".geojson");

        finder.on("searchComplete", function(needle, filematchcount) {});
        finder.on("fileFound", function(file, fileinfo, storageName) {
            $("div#tracks").append(
                '<div class="items" data-map="geojson">' + fileinfo.name + "</div>"
            );
        });
    };

    find_gpx();
    find_geojson();

    //////////////////////////////////
    ///MENU//////////////////////////
    /////////////////////////////////

    let show_finder = function() {
        if (json_modified) {
            read_json();
        } else {
            finder_tabindex();
            $("div#finder").find("div.items[tabindex=0]").focus();
            $("div#finder").css("display", "block");
            windowOpen = "finder";
        }
    };

    let finder_tabindex = function() {
        //set tabindex
        $("div.items").each(function(index, value) {
            let $div = $(this);
            $div.attr("tabindex", index);
        });

        $("div#finder").css("display", "block");
        $("div#finder").find("div.items[tabindex=0]").focus();
        tabIndex = 0;
    };

    ////////////////////
    ////RULER///////////
    ///////////////////
    var ruler_activ = "";

    function ruler() {
        if (ruler_activ == "") {
            L.control.ruler().addTo(map);
        }

        if (ruler_activ === true) {
            $("div.leaflet-ruler").remove();

            ruler_activ = false;
            navigator.spatialNavigationEnabled = false;
            L.control.ruler().remove();
            $("div.leaflet-ruler").removeClass("leaflet-ruler-clicked");

            return false;
        } else {
            L.control.ruler().remove();

            navigator.spatialNavigationEnabled = true;

            ruler_activ = true;
            $("div.leaflet-ruler").addClass("leaflet-ruler-clicked");
            return false;
        }
    }

    /////////////////////////
    /////Load GPX///////////
    ///////////////////////
    function loadGPX(filename) {
        let finder = new Applait.Finder({
            type: "sdcard",
            debugMode: false,
        });
        finder.search(filename);

        finder.on("fileFound", function(file, fileinfo, storageName) {
            //file reader

            let reader = new FileReader();

            reader.onerror = function(event) {
                toaster("can't read file", 3000);
                reader.abort();
            };

            reader.onloadend = function(event) {
                var gpx = event.target.result; // URL to your GPX file or the GPX itself

                new L.GPX(gpx, {
                        async: true,
                    })
                    .on("loaded", function(e) {
                        map.fitBounds(e.target.getBounds());
                    })
                    .addTo(map);

                map.setZoom(8);
                $("div#finder").css("display", "none");
                windowOpen = "map";
            };

            reader.readAsText(file);
        });
    }

    ////////////////////
    ////GEOLOCATION/////
    ///////////////////
    //////////////////////////
    ////MARKER SET AND UPDATE/////////
    /////////////////////////

    //set filename by user imput
    function saveMarker() {
        user_input("open", moment().format("DD.MM.YYYY, HH:MM"));
        document.getElementById("user-input-description").innerText = "Save marker position in omap.json"
    }

    let filename;

    function getLocation(option) {
        marker_latlng = false;

        if (option == "init" || option == "update_marker" || option == "share") {
            toaster("seeking position", 3000);
        }

        let options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        function success(pos) {
            let crd = pos.coords;
            current_lat = crd.latitude;
            current_lng = crd.longitude;
            current_alt = crd.altitude;
            current_heading = crd.heading;

            if (option == "share") {
                mozactivity.share_position();
            }

            if (option == "init") {
                myMarker = L.marker([current_lat, current_lng]).addTo(markers_group);
                myMarker._icon.classList.add("marker-1");

                map.setView([current_lat, current_lng], 12);
                zoom_speed();
                $("div#message div").text("");
                return false;
            }

            if (option == "update_marker" && current_lat != "") {
                myMarker.setLatLng([current_lat, current_lng]).update();
                map.flyTo(new L.LatLng(current_lat, current_lng), 10);
                zoom_speed();
            }
        }

        function error(err) {
            toaster("Position not found", 2000);
            current_lat = 0;
            current_lng = 0;
            current_alt = 0;

            map.setView([current_lat, current_lng], 13);
            zoom_speed();
            $("div#message div").text("");
            return false;
        }

        navigator.geolocation.getCurrentPosition(success, error, options);
    }

    ///////////
    //watch position
    //////////
    let watchID;

    function geolocationWatch() {
        marker_latlng = false;

        let geoLoc = navigator.geolocation;

        if (state_geoloc == false) {

            function showLocation(position) {
                let crd = position.coords;

                current_lat = crd.latitude;
                current_lng = crd.longitude;
                current_alt = crd.altitude;
                current_heading = crd.heading;

                map.flyTo(
                    new L.LatLng(position.coords.latitude, position.coords.longitude)
                );
                myMarker.setLatLng([current_lat, current_lng]).update();

                state_geoloc = true;
            }

            function errorHandler(err) {
                if (err.code == 1) {
                    toaster("Error: Access is denied!", 2000);
                } else if (err.code == 2) {
                    toaster("Error: Position is unavailable!", 2000);
                }
            }

            let options = {
                timeout: 60000
            };
            watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
            toaster("watching postion started", 2000);

            return true;
        }


        if (state_geoloc == true) {
            geoLoc.clearWatch(watchID);
            state_geoloc = false;
            toaster("watching postion stopped", 2000);
            return true
        }
    }

    ///////////
    //SET MARKER CROSS////
    //////////
    window.marker_cross = function() {
        let elem = document.getElementById("marker-target-cross");
        let style = getComputedStyle(elem);
        if (style.opacity == "0") {
            $("#marker-target-cross").animate({
                    width: "50px",
                    height: "50px",
                },
                2000,
                function() {}
            );

            elem.style.opacity = "1";

            elem.style.color = "red";
            toaster(
                "<br>press 5<br>to add a marker and save it<br>press 0 <br>to share this position by sms",
                5000
            );
            return true;
        } else {
            elem.style.opacity = "0";
            elem.style.width = "0px";
            elem.style.height = "0px";
            return true;
        }
    };

    ///////////
    //save/delete marker
    //////////

    function save_delete_marker(option) {
        if (option == "save_marker" || option == "delete_marker") {
            let sdcard = navigator.getDeviceStorages("sdcard");
            let request = sdcard[1].get(file_path);

            request.onsuccess = function() {
                let fileget = this.result;
                let reader = new FileReader();

                reader.addEventListener("loadend", function(event) {
                    let data;
                    //check if json valid
                    try {
                        data = JSON.parse(event.target.result);
                    } catch (e) {
                        toaster("Json is not valid", 3000);
                        return false;
                    }

                    if (option == "save_marker") {
                        data[0].markers.push({
                            marker_name: filename,
                            lat: current_lat,
                            lng: current_lng,
                        });
                        save();
                    }

                    if (option == "delete_marker") {
                        json_modified = true;

                        var markers = [];

                        $.each(data[0].markers, function(index, value) {
                            if (value.marker_name != $(document.activeElement).text()) {
                                markers.push(value);
                            }
                        });
                        data[0].markers = markers;

                        save();
                    }

                    function save() {
                        windowOpen = "save";
                        let extData = JSON.stringify(data);
                        deleteFile(1, file_path, "");

                        setTimeout(function() {
                            let file = new Blob([extData], {
                                type: "application/json",
                            });
                            let requestAdd = sdcard[1].addNamed(file, file_path);

                            requestAdd.onsuccess = function() {
                                json_modified = true;

                                if (option == "delete_marker") {
                                    toaster("Marker deleted", 2000);
                                    $(":focus").css("display", "none");
                                    //set tabindex
                                    $("div.items").each(function(index, value) {
                                        let $div = $(this);
                                        $div.attr("tabindex", index);
                                    });
                                    $("div#finder").find("div.items[tabindex=0]").focus();
                                    tabIndex = 0;
                                    windowOpen = "finder";
                                }
                                if (option == "save_marker") {
                                    toaster("Marker saved", 2000);

                                    var markerOptions = {
                                        keyboard: true,
                                    };
                                    let new_marker = L.marker(
                                        [current_lat, current_lng],
                                        markerOptions
                                    );
                                    markers_group.addLayer(new_marker);

                                    map.setView([current_lat, current_lng], 13);
                                    $("div#finder").css("display", "none");
                                    windowOpen = "map";
                                }
                            };

                            requestAdd.onerror = function() {
                                toaster("Unable to write the file: " + this.error, 2000);
                            };
                        }, 2000);
                    }
                });
                reader.readAsText(fileget);
            };
        }
    }

    /////////////////////////
    /////MENU///////////////
    ////////////////////////
    let marker_lng;
    let marker_lat;

    function addMapLayers(param) {
        if ($(".items").is(":focus") && windowOpen == "finder") {
            //switch online maps
            let item_value = $(document.activeElement).data("map");

            if (item_value == "weather") {
                //map.removeLayer(tilesLayer);
                maps.weather_map();
                $("div#finder").css("display", "none");
                windowOpen = "map";
            }

            if (item_value == "toner") {
                map.removeLayer(tilesLayer);
                maps.toner_map();
                $("div#finder").css("display", "none");
                windowOpen = "map";
            }

            if (item_value == "osm") {
                map.removeLayer(tilesLayer);
                maps.osm_map();
                $("div#finder").css("display", "none");
                windowOpen = "map";
            }

            if (item_value == "moon") {
                map.removeLayer(tilesLayer);
                maps.moon_map();
                $("div#finder").css("display", "none");
                map.setZoom(4);
                windowOpen = "map";
            }

            if (item_value == "otm") {
                map.removeLayer(tilesLayer);
                maps.opentopo_map();
                $("div#finder").css("display", "none");
                windowOpen = "map";
            }

            if (item_value == "owm") {
                map.removeLayer(tilesLayer);
                //maps.osm_map();
                maps.owm_map();
                $("div#finder").css("display", "none");
                windowOpen = "map";
            }

            if (item_value == "share") {
                maps.opentopo_map();
                getLocation("share");
            }

            if (item_value == "autoupdate-geolocation") {
                windowOpen = "map";
                $("div#finder").css("display", "none");
                geolocationWatch();
            }

            if (item_value == "update-position") {
                getLocation("update_marker");
            }

            if (item_value == "search") {
                windowOpen = "map";
                $("div#finder").css("display", "none");
                showSearch();
            }

            if (item_value == "coordinations") {
                coordinations("show");
            }

            if (item_value == "savelocation") {
                save_delete_marker("save_marker");
            }

            if (item_value == "export") {
                $("div#finder").css("display", "none");
                save_mode = "geojson";
                user_input("open");
            }

            if (item_value == "add-marker-icon") {
                toaster("please close the menu and press key 9 to set a marker.", 3000);
            }

            if (item_value == "photo") {
                mozactivity.photo();
            }

            let marker_array = [];
            if (item_value == "marker") {
                if (param == "add-marker") {
                    //to know it is not the current position
                    marker_latlng = true;

                    marker_lng = Number($(document.activeElement).data("lng"));
                    marker_lat = Number($(document.activeElement).data("lat"));

                    var new_marker = L.marker([marker_lat, marker_lng]);
                    new_marker.addTo(markers_group);

                    //var new_marker = L.marker([marker_lat, marker_lng]).addTo(map);
                    map.setView([marker_lat, marker_lng], 13);
                    $("div#finder").css("display", "none");

                    var distance = getDistance(
                        [marker_lat, marker_lng], [current_lat, current_lng]
                    );
                    distance = distance.toFixed(0) / 1000 + " km";

                    new_marker.bindTooltip(distance).openTooltip();

                    //update tooltip
                    //store lat lng in array
                    marker_array.push([marker_lat, marker_lng]);

                    setInterval(() => {
                        marker_array.forEach((marker) => {
                            var distance = getDistance(
                                [marker[0], marker[1]], [current_lat, current_lng]
                            );
                            distance = distance.toFixed(0) / 1000 + " km";
                            //new_marker.bindTooltip(distance).update();
                        });
                    }, 10000);

                    windowOpen = "map";
                }

                if (param == "delete-marker") {
                    save_delete_marker("delete_marker");
                }
            }

            //add geoJson data
            if (item_value == "geojson") {
                let finder = new Applait.Finder({
                    type: "sdcard",
                    debugMode: false,
                });
                finder.search($(document.activeElement).text());

                finder.on("fileFound", function(file, fileinfo, storageName) {
                    //file reader

                    let geojson_data = "";
                    let reader = new FileReader();

                    reader.onerror = function(event) {
                        alert("shit happens");
                        reader.abort();
                    };

                    reader.onloadend = function(event) {
                        if (myLayer) {
                            L.removeLayer(myLayer);
                        }

                        //check if json valid
                        try {
                            geojson_data = JSON.parse(event.target.result);
                        } catch (e) {
                            toaster("Json is not valid", 2000);
                            return false;
                        }

                        //if valid add layer
                        $("div#finder div#question").css("opacity", "1");
                        myLayer = L.geoJSON().addTo(map);
                        myLayer.addData(geojson_data);
                        map.setZoom(8);
                        windowOpen = "finder";
                    };

                    reader.readAsText(file);
                });
            }

            //add gpx data
            if (item_value == "gpx") {
                loadGPX($(document.activeElement).text());
            }
        }
    }

    ////////////////////////////////////////
    ////COORDINATIONS PANEL/////////////////
    ///////////////////////////////////////

    function coordinations(param) {
        let update_view;
        if ($("div#coordinations").css("display") == "none") {
            $("div#finder").css("display", "none");
            $("div#coordinations").css("display", "block");

            if (openweather_api != "") {
                $("div#coordinations div#weather").css("display", "block");

                function openweather_callback(some) {
                    document.getElementById("temp").innerText =
                        some.list[0].main.temp + " °C";
                    document.getElementById("icon").src =
                        "https://openweathermap.org/img/w/" +
                        some.list[0].weather[0].icon +
                        ".png";
                }

                weather.openweather_call(
                    current_lat,
                    current_lng,
                    openweather_api,
                    openweather_callback
                );
            }

            update_view = setInterval(() => {
                if (current_lat != "" && current_lng != "") {
                    //when marker is loaded from menu
                    if (marker_latlng) {
                        current_lat = marker_lng;
                        current_lng = marker_lat;
                    }

                    $("div#coordinations div#lat").text("Lat " + current_lat.toFixed(5));
                    $("div#coordinations div#lng").text("Lng " + current_lng.toFixed(5));
                    if (current_alt) {
                        $("div#coordinations div#altitude").style.display = "block";
                        $("div#coordinations div#altitude").text("alt " + current_alt);
                    } else {
                        $("div#coordinations div#altitude").style.display = "none";
                    }
                    if (current_heading) {
                        $("div#coordinations div#heading").style.display = "block";
                        $("div#coordinations div#heading").text(
                            "heading " + current_heading
                        );
                    } else {
                        $("div#coordinations div#heading").style.display = "none";
                    }
                }
            }, 1000);

            return true;
        }

        if ($("div#coordinations").css("display") == "block") {
            $("div#coordinations").css("display", "none");
            windowOpen = "map";
            clearInterval(update_view);
        }
    }

    //////////////////////////
    ////SEARCH BOX////////////
    /////////////////////////

    function showSearch() {
        bottom_bar("close", "select", "");
        $("div#search-box").css("display", "block");
        $("div#search-box").find("input").focus();
        $("div#bottom-bar").css("display", "block");
        windowOpen = "search";
    }

    function hideSearch() {
        $("div#bottom-bar").css("display", "none");
        $("div#search-box").css("display", "none");
        $("div#search-box").find("input").val("");
        $("div#search-box").find("input").blur();
        $("div#olc").css("display", "none");
        windowOpen = "map";
    }

    /////////////////////
    ////ZOOM MAP/////////
    ////////////////////

    function ZoomMap(in_out) {
        let current_zoom_level = map.getZoom();
        if (windowOpen == "map" && $("div#search-box").css("display") == "none") {
            if (in_out == "in") {
                map.setZoom(current_zoom_level + 1);
            }

            if (in_out == "out") {
                map.setZoom(current_zoom_level - 1);
            }

            zoom_speed();
        }
    }

    function zoom_speed() {
        zoom_level = map.getZoom();

        if (zoom_level < 6) {
            step = 1;
            return step;
        }
        if (zoom_level > 6) {
            step = 0.1;
        }

        if (zoom_level > 11) {
            step = 0.001;
        }

        if (zoom_level > 14) {
            step = 0.0001;
        }
        return step;
    }

    function unload_map(trueFalse) {
        if ($("div#finder").css("display") == "block") {
            if (trueFalse === true) {
                map.removeLayer(tilesLayer);
                $("div#finder").css("display", "none");
                $("div#finder div#question").css("opacity", "0");
                windowOpen = "map";
            }

            if (trueFalse === false) {
                $("div#finder").css("display", "none");
                $("div#finder div#question").css("opacity", "0");
                windowOpen = "map";
            }
        }
    }

    /////////////////////
    //MAP NAVIGATION//
    /////////////////////

    function MovemMap(direction) {
        if (!marker_latlng) {
            if (windowOpen == "map") {
                if (direction == "left") {
                    zoom_speed();

                    current_lng = current_lng - step;
                    map.panTo(new L.LatLng(current_lat, current_lng));
                }

                if (direction == "right") {
                    zoom_speed();

                    current_lng = current_lng + step;
                    map.panTo(new L.LatLng(current_lat, current_lng));
                }

                if (direction == "up") {
                    zoom_speed();

                    current_lat = current_lat + step;
                    map.panTo(new L.LatLng(current_lat, current_lng));
                }

                if (direction == "down") {
                    zoom_speed();

                    current_lat = current_lat - step;
                    map.panTo(new L.LatLng(current_lat, current_lng));
                }
            }
        }

        //when marker is not current location
        //to calculate distance between current position and marker
        if (marker_latlng) {
            if (windowOpen == "map") {
                if (direction == "left") {
                    zoom_speed();
                    marker_lng = marker_lng - step;
                    map.panTo(new L.LatLng(marker_lat, marker_lng));
                }

                if (direction == "right") {
                    zoom_speed();
                    marker_lng = marker_lng + step;
                    map.panTo(new L.LatLng(marker_lat, marker_lng));
                }

                if (direction == "up") {
                    zoom_speed();
                    marker_lat = marker_lat + step;
                    map.panTo(new L.LatLng(marker_lat, marker_lng));
                }

                if (direction == "down") {
                    zoom_speed();
                    marker_lat = marker_lat - step;
                    map.panTo(new L.LatLng(marker_lat, marker_lng));
                }
            }
        }
    }

    //////////////////////
    //FINDER NAVIGATION//
    /////////////////////

    function nav(move) {
        if (windowOpen == "finder") {
            let items = document.querySelectorAll(".items");
            if (move == "+1") {
                if (tabIndex < items.length - 1) {
                    tabIndex++;
                    $("div#finder div.items[tabindex=" + tabIndex + "]").focus();

                    $("html, body").animate({
                            scrollTop: $(":focus").offset().top + "px",
                        },
                        "fast"
                    );
                }
            }

            if (move == "-1") {
                if (tabIndex > 0) {
                    tabIndex--;
                    $("div#finder div.items[tabindex=" + tabIndex + "]").focus();

                    $("html, body").animate({
                            scrollTop: $(":focus").offset().top + "px",
                        },
                        "fast"
                    );
                }
            }
        }
    }

    //////////////////////////////
    ////MOZ ACTIVITY////////////
    //////////////////////////////

    if (navigator.mozSetMessageHandler) {
        navigator.mozSetMessageHandler("activity", function(activityRequest) {
            var option = activityRequest.source;
            //gpx
            if (option.name == "open") {
                loadGPX(option.data.url);
            }
            //link
            if (option.name == "view") {
                open_url = true;
                const url_split = option.data.url.split("/");
                current_lat = url_split[url_split.length - 2];
                current_lng = url_split[url_split.length - 1];

                //remove !numbers
                current_lat = current_lat.replace(/[A-Za-z?=&]+/gi, "");
                current_lng = current_lng.replace(/[A-Za-z?=&]+/gi, "");
                current_lat = Number(current_lat);
                current_lng = Number(current_lng);

                myMarker = L.marker([current_lat, current_lng]).addTo(map);
                map.setView([current_lat, current_lng], 13);
                zoom_speed();
            }
        });
    }

    //////////////////////////////
    ////KEYPAD HANDLER////////////
    //////////////////////////////

    let longpress = false;
    const longpress_timespan = 1000;
    let timeout;

    function repeat_action(param) {
        switch (param.key) {
            case "ArrowUp":
                MovemMap("up");
                break;

            case "ArrowDown":
                MovemMap("down");
                break;

            case "ArrowLeft":
                MovemMap("left");
                break;

            case "ArrowRight":
                MovemMap("right");
                break;

            case "Enter":
                break;
        }
    }

    //////////////
    ////LONGPRESS
    /////////////

    function longpress_action(param) {
        switch (param.key) {
            case "Enter":
                if (windowOpen == "finder") {
                    addMapLayers("delete-marker");
                }
                break;
        }
    }

    ///////////////
    ////SHORTPRESS
    //////////////

    function shortpress_action(param) {
        switch (param.key) {
            case "Backspace":
                param.preventDefault();

                if (windowOpen == "finder") {
                    $("div#finder").css("display", "none");
                    windowOpen = "map";
                    return false;
                }

                if (windowOpen == "coordinations") {
                    coordinations("hide");
                    break;
                }
                if (windowOpen == "map") {
                    windowOpen = "";
                    window.goodbye();
                }

                break;

            case "SoftLeft":
                if (windowOpen == "search") {
                    hideSearch();
                    break;
                }

                if (windowOpen == "finder") {
                    unload_map(false);
                    return false;
                }

                if (windowOpen == "map") {
                    ZoomMap("in");
                    return false;
                }

                if (windowOpen == "user-input") {
                    user_input("close");
                    save_mode = "";

                    break;
                }

                break;

            case "SoftRight":
                if (windowOpen == "finder") {
                    unload_map(true);
                }

                if (windowOpen == "map") {
                    ZoomMap("out");
                }

                if (windowOpen == "user-input" && save_mode == "geojson") {
                    geojson.save_geojson(user_input("return") + ".geojson");
                    save_mode = "";
                    break;
                }

                if (windowOpen == "user-input" && save_mode != "geojson") {
                    filename = user_input("return");
                    save_delete_marker("save_marker");
                }

                break;

            case "Enter":
                if (windowOpen == "search") {
                    L.marker([olc_lat_lng[0], olc_lat_lng[1]]).addTo(map);
                    map.setView([olc_lat_lng[0], olc_lat_lng[1]], 13);

                    hideSearch();

                    current_lat = Number(olc_lat_lng[0]);
                    current_lng = Number(olc_lat_lng[1]);

                    toaster("press 5 to save the marker", 2000);
                    break;
                }
                if (windowOpen == "map") {
                    marker_cross();
                    break;
                }

                addMapLayers("add-marker");

                break;

            case "1":
                getLocation("update_marker");
                break;

            case "2":
                param.preventDefault();
                showSearch();
                break;

            case "3":
                param.preventDefault();
                show_finder();
                break;

            case "4":
                geolocationWatch();
                screenWakeLock("lock");

                break;

            case "5":
                saveMarker();
                break;

            case "6":
                coordinations("show");
                break;

            case "7":
                ruler();
                break;

            case "8":
                save_mode = "geojson";
                user_input("open");
                document.getElementById("user-input-description").innerText = "Export markers as geojson file"

                break;

            case "9":
                L.marker([current_lat, current_lng]).addTo(markers_group);
                break;

            case "0":
                mozactivity.share_position();
                break;

            case "ArrowRight":
                MovemMap("right");
                break;

            case "ArrowLeft":
                MovemMap("left");
                break;

            case "ArrowUp":
                MovemMap("up");
                nav("-1");
                break;

            case "ArrowDown":
                MovemMap("down");
                nav("+1");
                break;
        }
    }

    /////////////////////////////////
    ////shortpress / longpress logic
    ////////////////////////////////

    function handleKeyDown(evt) {
        if (!evt.repeat) {
            evt.preventDefault();
            longpress = false;
            timeout = setTimeout(() => {
                longpress = true;
                longpress_action(evt);
            }, longpress_timespan);
        }

        if (evt.repeat) {
            longpress = false;
            repeat_action(evt);
        }
    }

    function handleKeyUp(evt) {
        evt.preventDefault();
        clearTimeout(timeout);
        if (!longpress) {
            shortpress_action(evt);
        }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);



    //////////////////////////
    ////BUG OUTPUT////////////
    /////////////////////////
    if (debug) {
        $(window).on("error", function(evt) {
            console.log("jQuery error event:", evt);
            var e = evt.originalEvent; // get the javascript event
            console.log("original event:", e);
            if (e.message) {
                alert(
                    "Error:\n\t" +
                    e.message +
                    "\nLine:\n\t" +
                    e.lineno +
                    "\nFile:\n\t" +
                    e.filename
                );
            } else {
                alert(
                    "Error:\n\t" + e.type + "\nElement:\n\t" + (e.srcElement || e.target)
                );
            }
        });
    }
});