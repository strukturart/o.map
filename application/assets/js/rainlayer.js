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