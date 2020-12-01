navigator.mozSetMessageHandler('activity', function(activityRequest) {
    alert("")
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
        alert(current_lat, current_lng)

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