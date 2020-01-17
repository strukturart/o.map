$(document).ready(function() {


    //Global lets
    let step = 0.001;
    let current_lng = 0;
    let current_lat = 0;
    let current_alt = 0;
    let accuracy = 0;
    let altitude = 0;



    let zoom_level = 18;
    let current_zoom_level = 18;
    let new_lat = 0;
    let new_lng = 0;
    let curPos = 0;
    let myMarker = "";
    let i = 0;
    let map_or_track;
    let windowOpen = "";
    let message_body = "";
    let openweather_api = "";
    let default_position_lat = "";
    let default_position_long = "";
    let tabIndex = 0;
    let debug = "false";

    let tilesLayer;
    let tileLayer;
    let myLayer;
    let tilesUrl;
    let state_geoloc = "not-activ";






    //remove leaflet attribution to have more space
    $('.leaflet-control-attribution').hide();

    //welcome message
    $('div#message div').text("Welcome");
    setTimeout(function() {
        $('div#message').css("display", "none")
        getLocation("init");
        ///set default map
        opentopo_map();
        windowOpen = "map";

    }, 4000);


    //leaflet add basic map
    let map = L.map('map-container', {
        zoomControl: false,
        dragging: false,
        keyboard: true
    }).fitWorld();

    L.control.scale({ position: 'topright', metric: true, imperial: false }).addTo(map);


    ////////////////////
    ////MAPS////////////
    ///////////////////

    function toner_map() {
        tilesUrl = 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
        tilesLayer = L.tileLayer(tilesUrl, {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
        });

        map.addLayer(tilesLayer);

    }

    function opentopo_map() {
        tilesUrl = 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
        tilesLayer = L.tileLayer(tilesUrl, {
            maxZoom: 18,
            attribution: 'Map data &copy;<div> © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)</div>'
        });

        map.addLayer(tilesLayer);

        setTimeout(function() {
            $('.leaflet-control-attribution').hide()
        }, 4000);

    }


    function owm_map() {

        tilesUrl = 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=' + openweather_api;
        tilesLayer = L.tileLayer(tilesUrl, {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
        });

        map.addLayer(tilesLayer);
    }



    function osm_map() {
        tilesUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        tilesLayer = L.tileLayer(tilesUrl, {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
        });

        map.addLayer(tilesLayer);

    }




    //rain map
    /////////

    let rain_image_url = [];
    let rain_image_url_time = [];
    let loop = -1;
    let init = true;
    let rainlayer;

    function get_rain_images() {
        for (let i = 1; i < 270; i++) {
            let rain_weather_url = moment().subtract(i, 'minute').format('YYYYMMDD.HHmm')
            let rain_time = moment().subtract(i, 'minute').format('YYYY-MM-DD,HH:mm')

            let filter = moment().subtract(i, 'minute').format('mm')
            if (filter == 15 || filter == 30 || filter == 45 || filter == 0) {
                //first 8 not because no image exist 
                if (i > 8) {

                    //push urls's in array
                    rain_image_url.push("http://www.radareu.cz/data/radar/radar.anim." + rain_weather_url + ".0.png");
                    rain_image_url_time.push(rain_time);
                }
            }
        }
        rain_image_url.reverse()
        rain_image_url_time.reverse()

    }

    get_rain_images()



    function remove_layer() {
        map.eachLayer(function(layer) {
            map.removeLayer(layer);
            $("div#output").css("display", "none")
        });
    }

    let rainlayer0;
    let rainlayer1;
    let rainlayer2;
    let rainlayer3;
    let rainlayer4;


    function remove_rain_overlayers() {

        $('.leaflet-image-layer').css('display', 'none');
    }





    function rain_layer() {

        if (windowOpen == "map") {
            $('.leaflet-image-layer').css('display', 'block');


            loop++;
            imageBounds = [
                [72.62025190354672, -14.618225054687514],
                [30.968189526345665, 45.314636273437486]
            ];
            $("div#output").css("display", "block")

            if (loop == 0) {
                if (map.hasLayer(rainlayer0) == false) {
                    rainlayer0 = L.imageOverlay(rain_image_url[0], imageBounds).addTo(map);

                    rainlayer0.on("load", function(event) {
                        rainlayer0.setOpacity(0.5);
                    });
                    rainlayer0.on("error", function(event) {
                        toaster("image can't load")
                    });
                } else {
                    rainlayer4.setOpacity(0.0);
                    rainlayer0.setOpacity(0.5);
                }

                $("div#output").text("");
                $("div#output").text(rain_image_url_time[loop]);
            }




            if (loop == 1) {
                if (map.hasLayer(rainlayer1) == false) {
                    rainlayer1 = L.imageOverlay(rain_image_url[1], imageBounds).addTo(map);

                    rainlayer1.on("load", function(event) {
                        rainlayer0.setOpacity(0.0);
                        rainlayer1.setOpacity(0.5);
                    });
                    rainlayer1.on("error", function(event) {
                        alert("image can't load")
                    });
                } else {
                    rainlayer0.setOpacity(0.0);
                    rainlayer1.setOpacity(0.5);

                }

                $("div#output").text("");
                $("div#output").text(rain_image_url_time[loop]);
            }





            if (loop == 2) {
                if (map.hasLayer(rainlayer2) == false) {
                    rainlayer2 = L.imageOverlay(rain_image_url[2], imageBounds).addTo(map);

                    rainlayer2.on("load", function(event) {
                        rainlayer0.setOpacity(0.0);
                        rainlayer1.setOpacity(0.0);
                        rainlayer2.setOpacity(0.5);
                    });
                    rainlayer2.on("error", function(event) {
                        alert("image can't load")
                    });

                } else {
                    rainlayer0.setOpacity(0.0);
                    rainlayer1.setOpacity(0.0);
                    rainlayer2.setOpacity(0.5);
                }

                $("div#output").text("");
                $("div#output").text(rain_image_url_time[loop]);
            }


            if (loop == 3) {
                if (map.hasLayer(rainlayer3) == false) {
                    rainlayer3 = L.imageOverlay(rain_image_url[3], imageBounds).addTo(map);

                    rainlayer3.on("load", function(event) {
                        rainlayer2.setOpacity(0.0);
                        rainlayer3.setOpacity(0.5);
                    });
                    rainlayer3.on("error", function(event) {
                        alert("image can't load")
                    });
                } else {
                    rainlayer0.setOpacity(0.0);
                    rainlayer1.setOpacity(0.0);
                    rainlayer2.setOpacity(0.0);
                    rainlayer3.setOpacity(0.5);
                }

                $("div#output").text("");
                $("div#output").text(rain_image_url_time[loop]);
            }


            if (loop == 4) {
                if (map.hasLayer(rainlayer4) == false) {
                    rainlayer4 = L.imageOverlay(rain_image_url[4], imageBounds).addTo(map);

                    rainlayer4.on("load", function(event) {
                        rainlayer3.setOpacity(0.0);
                        rainlayer4.setOpacity(0.5);
                    });
                    rainlayer4.on("error", function(event) {
                        alert("image can't load")
                    });
                } else {
                    rainlayer0.setOpacity(0.0);
                    rainlayer1.setOpacity(0.0);
                    rainlayer2.setOpacity(0.0);
                    rainlayer3.setOpacity(0.0);
                    rainlayer4.setOpacity(0.5);
                }

                $("div#output").text("");
                $("div#output").text(rain_image_url_time[loop]);
            }



            if (loop == 4) {
                loop = -1
            }

        }

    }


    let rain_layer_animation;

    function rain_layer_animation_start() {
        rain_layer_animation = setInterval(rain_layer, 1500);
    }

    function rain_layer_animation_stop() {
        clearInterval(rain_layer_animation);
    }




    /////////////////////////
    //get Openweather Api Key
    /////////////////////////
    function read_json() {
        let finder = new Applait.Finder({ type: "sdcard", debugMode: false });
        finder.search("osm-map.json");


        finder.on("empty", function(needle) {
            toaster("no sdcard found");
            return;
        });

        finder.on("searchComplete", function(needle, filematchcount) {

            if (filematchcount == 0) {
                toaster("no osm-map.json found");
                return;
            }
        })

        finder.on("fileFound", function(file, fileinfo, storageName) {

            let markers_file = "";
            let reader = new FileReader()


            reader.onerror = function(event) {
                alert('shit happens')
                reader.abort();
            };

            reader.onloadend = function(event) {



                let data;
                //check if json valid
                try {
                    data = JSON.parse(event.target.result);
                } catch (e) {
                    toaster("Json is not valid")
                    return false;
                }



                $.each(data, function(index, value) {

                    if (value.markers) {
                        $.each(value.markers, function(index, item) {
                            $("div#markers").append('<div class="items" data-map="marker" data-lat="' + item.lat + '" data-lng="' + item.lng + '">' + item.marker_name + '</div>');
                        })
                    }

                    if (value.api_key) {
                        openweather_api = value.api_key;
                    }


                })

            };
            reader.readAsText(file)
        });
    }
    read_json()



    ////////////////////
    ////GEOLOCATION/////
    ///////////////////
    //////////////////////////
    ////MARKER SET AND UPDATE/////////
    /////////////////////////



    function getLocation(option) {

        toaster("seeking position");

        let options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        function success(pos) {
            let crd = pos.coords;

            current_lat = crd.latitude;
            current_lng = crd.longitude;
            current_alt = crd.altitude;
            accuracy = crd.accuracy;



            if (option == "save_position") {


                let sdcard = navigator.getDeviceStorages("sdcard");
                let filename = moment().format("DD.MM.YYYY, hh:mm");



                let request = sdcard[1].get("osm-map/osm-map.json");

                request.onsuccess = function() {

                    let fileget = this.result;
                    let reader = new FileReader();

                    reader.addEventListener("loadend", function(event) {


                        let data;
                        //check if json valid
                        try {
                            data = JSON.parse(event.target.result);
                        } catch (e) {
                            toaster("Json is not valid")
                            return false;
                        }

                        data[0].markers.push({ "marker_name": filename, "lat": current_lat, "lng": current_lng });
                        let extData = JSON.stringify(data);

                        deleteFile(1, "osm-map/osm-map.json", "")


                        setTimeout(function() {

                            let file = new Blob([extData], { type: "application/json" });
                            let requestAdd = sdcard[1].addNamed(file, "osm-map/osm-map.json");

                            requestAdd.onsuccess = function() {
                                toaster('Marker saved successfully');
                                L.marker([current_lat, current_lng]).addTo(map);
                                map.setView([current_lat, current_lng], 13);

                                $('div#finder').css('display', 'none');
                                windowOpen = "map";

                            }

                            requestAdd.onerror = function() {
                                toaster('Unable to write the file: ' + this.error);
                            }


                        }, 2000);

                    })
                    reader.readAsText(fileget);
                }
            }


            if (option == "share") {
                share_position()

            }

            if (option == "init") {

                myMarker = L.marker([current_lat, current_lng]).addTo(map);
                map.setView([current_lat, current_lng], 13);
                zoom_speed();
                $('div#message div').text("");
                return false;
            }

            if (option == "updateMarker") {

                myMarker.setLatLng([current_lat, current_lng]).update();
                map.flyTo(new L.LatLng(current_lat, current_lng), 16);
                zoom_speed()

                $('div#location div#lat').text("Lat " + current_lat.toFixed(5));
                $('div#location div#lng').text("Lng " + current_lng.toFixed(5));
                $('div#location div#altitude').text("alt " + altitude.toFixed(5));

            }





        }


        function error(err) {
            toaster("Position not found");
        }


        navigator.geolocation.getCurrentPosition(success, error, options);

    }


    function geolocationWatch() {
        let watchID;
        let geoLoc = navigator.geolocation;
        let state;


        if (state_geoloc == "not-activ") {

            function showLocation(position) {

                map.flyTo(new L.LatLng(position.coords.latitude, position.coords.longitude));
                state_geoloc = "activ";


            }

            function errorHandler(err) {
                if (err.code == 1) {
                    toaster("Error: Access is denied!");
                } else if (err.code == 2) {
                    toaster("Error: Position is unavailable!");
                }
            }


            if (navigator.geolocation) {

                let options = { timeout: 60000 };
                watchID = geoLoc.watchPosition(showLocation, errorHandler, options);
                toaster("watching postion started");
            } else {
                toaster("Sorry, browser does not support geolocation!");
            }
        }



        if (state_geoloc == "activ") {
            geoLoc.clearWatch(watchID);
            state_geoloc = "not-activ";
            toaster("watching postion stopped");

        }

    }






    ///////////////////////////////
    ////send current position by sms
    ///////////////////////////////

    function share_position() {

        message_body = "https://www.openstreetmap.org/?mlat=" + current_lat + "&mlon=" + current_lng + "&zoom=14#map=14/" + current_lat + "/" + current_lng;

        let sms = new MozActivity({
            name: "new",
            data: {
                type: "websms/sms",
                number: "",
                body: ".." + message_body
            }
        });

    }



    //////////////////////////////////
    ////LOAD GEOSON & SWITCH MAPS/////
    //////////////////////////////////



    function startFinder() {

        windowOpen = "finder";

        rain_layer_animation_stop()
        $("div#tracks").empty();
        $("div#maps").empty();
        $("div#layers").empty();
        $("div#output").css("display", "none")
            //get file list
        let finder = new Applait.Finder({ type: "sdcard", debugMode: false });
        finder.search(".geojson");

        finder.on("searchComplete", function(needle, filematchcount) {

            $("div#maps").append('<div class="items" data-map="toner">Toner <i>Map</i></div>');
            $("div#maps").append('<div class="items" data-map="osm">OSM <i>Map</i></div>');
            $("div#maps").append('<div class="items" data-map="otm">OpenTopo <i>Map</i></div>');

            $("div#layers").append('<div class="items" data-map="rain">Rain</div>');

            if (openweather_api != "") {
                $("div#maps").append('<div class="items" data-map="owm">Weather <i>Map</i></div>');
            }

            $('div.items').each(function(index, value) {
                let $div = $(this)
                $div.attr("tabindex", index);
            });


            $('div#finder').css('display', 'block');
            $('div#finder').find('div.items[tabindex=0]').focus();
            tabIndex = 0;


        });



        finder.on("fileFound", function(file, fileinfo, storageName) {
            $("div#tracks").append('<div class="items" data-map="geojson">' + fileinfo.name + '</div>');
        });

    }






    function addMapLayers() {
        if ($(".items").is(":focus") && windowOpen == "finder") {

            //switch online maps
            let item_value = $(document.activeElement).data('map');


            if (item_value == "toner") {
                map.removeLayer(tilesLayer);
                remove_rain_overlayers()
                toner_map();
                $('div#finder').css('display', 'none');
                windowOpen = "map";
            }


            if (item_value == "osm") {
                remove_rain_overlayers()
                map.removeLayer(tilesLayer);
                osm_map();
                $('div#finder').css('display', 'none');
                windowOpen = "map";
            }


            if (item_value == "otm") {
                remove_rain_overlayers()
                map.removeLayer(tilesLayer);
                opentopo_map();
                $('div#finder').css('display', 'none');
                windowOpen = "map";
            }

            if (item_value == "rain") {
                map.removeLayer(tilesLayer);
                osm_map();
                rain_layer_animation_start();
                map.setZoom(2);
                $('div#finder').css('display', 'none');
                windowOpen = "map";
            }


            if (item_value == "owm") {
                remove_rain_overlayers()
                map.removeLayer(tilesLayer);
                osm_map();
                owm_map();
                $('div#finder').css('display', 'none');
                $("div#output").css("display", "block")
                windowOpen = "map";
            }

            if (item_value == "share") {
                remove_rain_overlayers();
                osm_map();
                getLocation("share")

            }



            if (item_value == "disable-screenlock") {

                $("div.disable-screenlock").css('color', 'silver').css('font-style', 'italic');
                lockScreenDisabler();
                geolocationWatch();
            }




            if (item_value == "update-position") {

                getLocation("update")
            }


            if (item_value == "search") {
                windowOpen = "map";
                $('div#finder').css('display', 'none');
                showSearch();
            }

            if (item_value == "savelocation") {

                getLocation("save_position");
            }

            if (item_value == "marker") {
                current_lng = $(document.activeElement).data('lng');
                current_lat = $(document.activeElement).data('lat');



                L.marker([current_lat, current_lng]).addTo(map);
                map.setView([current_lat, current_lng], 13);

                $('div#finder').css('display', 'none');
                windowOpen = "map";
            }



            //add geoJson data
            if (item_value == "geojson") {
                let finder = new Applait.Finder({ type: "sdcard", debugMode: false });
                finder.search($(document.activeElement).text());


                finder.on("fileFound", function(file, fileinfo, storageName) {
                    //file reader

                    let geojson_data = "";
                    let reader = new FileReader();

                    reader.onerror = function(event) {
                        alert('shit happens')
                        reader.abort();
                    };

                    reader.onloadend = function(event) {

                        if (myLayer) {
                            L.removeLayer(myLayer)
                        }

                        geojson_data = event.target.result

                        //check if json valid
                        let printError = function(error, explicit) {
                            console.log("[${explicit ? 'EXPLICIT' : 'INEXPLICIT'}] ${error.name}: ${error.message}");
                        }


                        //if valid add layer
                        $('div#finder div#question').css('opacity', '1');
                        myLayer = L.geoJSON().addTo(map);
                        myLayer.addData(JSON.parse(geojson_data));
                        map.setZoom(8);
                        windowOpen = "map";

                    };


                    reader.readAsText(file)

                });
            }


        }

    }



    ////////////////////////////////////////
    ////SCREEN OFF ONLY Nokia8110////////////
    ///////////////////////////////////////




    function screenWakeLock(param1) {
        if (param1 == "lock") {
            lock = window.navigator.requestWakeLock("screen");
        }

        if (param1 == "unlock") {
            if (lock.topic == "screen") {
                lock.unlock();
            }
        }
    }






    function setScreenlockPasscode(state) {


        let lock = navigator.mozSettings.createLock();
        //getting lockscreen setting value on start the app
        // to know how to set the value on the same vaule on 
        //closing the app



        if (state == "get") {
            let setting = lock.get('lockscreen.enabled');
            setting.onsuccess = function() {
                if (setting.result["lockscreen.enabled"] == false) {
                    let lk_state = localStorageWriteRead("lockscreen_state", "disabled");
                }

                if (setting.result["lockscreen.enabled"] == true) {
                    let lk_state = localStorageWriteRead("lockscreen_state", "enabled");
                }
            }
        }




        //set setting
        let result = lock.set({

            'lockscreen.enabled': state

        });


        result.onsuccess = function() {
            //alert("The setting has been changed");
        }

        result.onerror = function() {
            //alert("An error occure, the setting remain unchanged");
        }
    }


    setTimeout(function() {
        setScreenlockPasscode("get")
    }, 4000);



    function lockScreenDisabler() {

        let power = window.navigator.mozPower;

        screenWakeLock("lock");
        setScreenlockPasscode(false);


        function screenLockListener(topic, state) {
            $("div.setting-screenlock").css('color', 'silver').css('font-style', 'italic');
        }
        power.addWakeLockListener(screenLockListener);




    }


    ///////////////////////////////////////
    ////SAVE POSITION AS MARKER////////////
    ///////////////////////////////////////

    function savePosition() {
        getLocation("save_position")
    }





    //////////////////////////
    ////SEARCH BOX////////////
    /////////////////////////


    function formatJSON(rawjson) {
        let json = {},
            key, loc, disp = [];

        for (let i in rawjson) {
            disp = rawjson[i].display_name.split(',');
            key = disp[0] + ', ' + disp[1];
            loc = L.latLng(rawjson[i].lat, rawjson[i].lon);
            json[key] = loc; //key,value format
        }

        return json;
    }

    let mobileOpts = {
        url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
        jsonpParam: 'json_callback',
        formatData: formatJSON,
        textPlaceholder: 'Search...',
        autoType: true,
        tipAutoSubmit: true,
        autoCollapse: true,
        collapsed: false,
        autoCollapseTime: 1000,
        delayType: 800,
        marker: {
            icon: true
        }
    };

    let searchControl = new L.Control.Search(mobileOpts);


    searchControl.on('search:locationfound', function(e) {


        curPos = e.latlng;

        current_lng = curPos.lng;
        current_lat = curPos.lat;

        killSearch()

    })

    map.addControl(searchControl);


    $('.leaflet-control-search').css('display', 'none')



    function showSearch() {
        if ($('.leaflet-control-search').css('display') == 'none' && windowOpen == "map") {

            $('.leaflet-control-search').css('display', 'block');
            setTimeout(function() {
                $('.leaflet-control-search').find("input").focus();
                $('.leaflet-control-search').find("input").val("");
            }, 1000);
            $('div#search').css('display', 'block');

        } else {
            $('.leaflet-control-search').css('display', 'none');
            $('.leaflet-control-search').find("input").val("");

        }
    }


    function killSearch() {

        if ($('.leaflet-control-search').css('display') == 'block') {
            $('div#search').css('display', 'none');
            $('.leaflet-control-search').css('display', 'none');
            $('.leaflet-control-search').find("input").val("");
            $('.leaflet-control-search').find("input").blur();
        }

    }





    function ZoomMap(in_out) {

        let current_zoom_level = map.getZoom();
        if (windowOpen == "map" && $('.leaflet-control-search').css('display') == 'none') {
            if (in_out == "in") {

                if (windowOpen == "rainmap" && current_zoom_level < 5) {
                    current_zoom_level = current_zoom_level + 1
                    map.setZoom(current_zoom_level);
                }


                if (windowOpen == "otm" && current_zoom_level < 16) {
                    current_zoom_level = current_zoom_level + 1
                    map.setZoom(current_zoom_level);
                }

                if (windowOpen == "map") {
                    current_zoom_level = current_zoom_level + 1
                    map.setZoom(current_zoom_level);
                }



            }

            if (in_out == "out") {
                current_zoom_level = current_zoom_level - 1
                map.setZoom(current_zoom_level);
            }

            zoom_level = current_zoom_level;
            zoom_speed();

        }

    }




    function zoom_speed() {
        if (zoom_level < 6) {
            step = 1;
        }


        if (zoom_level > 6) {
            step = 0.1;
        }


        if (zoom_level > 11) {
            step = 0.001;
        }

        document.getElementById("zoom-level").innerHTML = "level " + zoom_level + " step " + step;
        return step;
    }


    function unload_map(trueFalse) {
        if ($("div#finder").css('display') == 'block') {

            if (trueFalse == true) {
                map.removeLayer(tilesLayer);
                $('div#finder').css('display', 'none');
                $('div#finder div#question').css('opacity', '0');
                windowOpen = "map";
            }

            if (trueFalse == false) {
                $('div#finder').css('display', 'none');
                $('div#finder div#question').css('opacity', '0');
                windowOpen = "map";
            }
        }
    }


    /////////////////////
    //MAP NAVIGATION//
    /////////////////////


    function MovemMap(direction) {
        if (windowOpen == "map") {
            if (direction == "left") {
                zoom_speed()
                $('div#location div#lat').text(current_lat);
                $('div#location div#lng').text(current_lng);
                current_lng = current_lng - step;
                map.panTo(new L.LatLng(current_lat, current_lng));
            }

            if (direction == "right") {
                zoom_speed()
                $('div#location div#lat').text(current_lat);
                $('div#location div#lng').text(current_lng);
                current_lng = current_lng + step;
                map.panTo(new L.LatLng(current_lat, current_lng));
            }

            if (direction == "up") {
                zoom_speed()
                $('div#location div#lat').text(current_lat);
                $('div#location div#lng').text(current_lng);
                current_lat = current_lat + step;
                map.panTo(new L.LatLng(current_lat, current_lng));

            }

            if (direction == "down") {
                zoom_speed()
                $('div#location div#lat').text(current_lat);
                $('div#location div#lng').text(current_lng);
                current_lat = current_lat - step;
                map.panTo(new L.LatLng(current_lat, current_lng));

            }
        }

    }

    //////////////////////
    //FINDER NAVIGATION//
    /////////////////////

    function nav(move) {
        if (windowOpen == "finder") {



            let items = document.querySelectorAll('.items');
            if (move == "+1") {
                if (tabIndex < items.length - 1) {

                    tabIndex++
                    $('div#finder div.items[tabindex=' + tabIndex + ']').focus()

                    $('html, body').animate({
                        scrollTop: $(':focus').offset().top + 'px'
                    }, 'fast');

                }
            }


            if (move == "-1") {
                if (tabIndex > 0)

                {
                    tabIndex--
                    $('div#finder div.items[tabindex=' + tabIndex + ']').focus()

                    $('html, body').animate({
                        scrollTop: $(':focus').offset().top + 'px'
                    }, 'fast');

                }
            }
        }

    }




    //////////////////////////
    ////KEYPAD TRIGGER////////////
    /////////////////////////



    function handleKeyDown(evt) {


        switch (evt.key) {

            case 'Backspace':
                evt.preventDefault();
                if (windowOpen == "map") {
                    let lk_state = localStorageWriteRead("lockscreen_state", "");
                    toaster(lk_state)
                    if (lk_state == "disabled") {
                        setScreenlockPasscode(false);
                    }

                    if (lk_state == "enabled") {
                        setScreenlockPasscode(true);
                    }

                    toaster("Goodbye")

                    setTimeout(function() {
                        window.close();
                    }, 4000);

                }
                if (windowOpen == "finder") {
                    $('div#finder').css('display', 'none');
                    windowOpen = "map";

                }
                break;

            case 'SoftLeft':
                killSearch();
                ZoomMap("in");
                unload_map(false);
                break;

            case 'SoftRight':
                ZoomMap("out");
                unload_map(true);
                break;

            case 'Enter':
                addMapLayers();
                break;

            case '0':
                showMan();
                break;

            case '1':
                getLocation("updateMarker")
                break;

            case '2':
                evt.preventDefault()
                showSearch();
                break;

            case '3':
                evt.preventDefault()
                startFinder();

                break;

            case '4':
                lockScreenDisabler();
                geolocationWatch();
                break;

            case '5':
                savePosition();
                break;

            case 'ArrowRight':
                MovemMap("right")
                break;

            case 'ArrowLeft':
                MovemMap("left")
                break;

            case 'ArrowUp':
                MovemMap("up")
                nav("-1");
                break;

            case 'ArrowDown':
                MovemMap("down")
                nav("+1")
                break;

        }

    };


    function handleKeyUp(evt) {


        switch (evt.key) {
            case '4':

                break;

        }
    }



    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);


    //////////////////////////
    ////BUG OUTPUT////////////
    /////////////////////////


    $(window).on("error", function(evt) {

        console.log("jQuery error event:", evt);
        let e = evt.originalEvent; // get the javascript event
        console.log("original event:", e);
        if (e.message) {
            alert("Error:\n\t" + e.message + "\nLine:\n\t" + e.lineno + "\nFile:\n\t" + e.filename);
        } else {
            alert("Error:\n\t" + e.type + "\nElement:\n\t" + (e.srcElement || e.target));
        }
    });


});