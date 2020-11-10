navigator.mozSetMessageHandler('activity', function(activityRequest) {
    var option = activityRequest.source;
    //gpx
    if (option.name == 'open') {
        loadGPX(option.data.url)
    }
    //link
    if (option.name == 'view') {
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

        toaster(current_lat + " /" + current_lng, 5000)
    }

})


/////////////////////////
/////Load GPX///////////
///////////////////////
function loadGPX(filename) {
    let finder = new Applait.Finder({ type: "sdcard", debugMode: false });
    finder.search(filename);


    finder.on("fileFound", function(file, fileinfo, storageName) {
        //file reader

        let reader = new FileReader();

        reader.onerror = function(event) {
            toaster("can't read file", 3000)
            reader.abort();
        };

        reader.onloadend = function(event) {

            var gpx = event.target.result; // URL to your GPX file or the GPX itself

            new L.GPX(gpx, { async: true }).on('loaded', function(e) {
                map.fitBounds(e.target.getBounds());
            }).addTo(map)

            map.setZoom(8);
            $('div#finder').css('display', 'none');
            windowOpen = "map";
        };


        reader.readAsText(file)

    })
}