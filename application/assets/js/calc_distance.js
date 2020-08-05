function getDistance(origin, destination) {
    // return distance in meters
    var lon1 = toRadian(origin[1]);
    var lat1 = toRadian(origin[0]);
    var lon2 = toRadian(destination[1]);
    var lat2 = toRadian(destination[0]);

    var deltaLat = lat2 - lat1;
    var deltaLon = lon2 - lon1;

    var a = Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2);
    var c = 2 * Math.asin(Math.sqrt(a));
    var EARTH_RADIUS = 6371;
    return c * EARTH_RADIUS * 1000;
}

function toRadian(degree) {
    return degree * Math.PI / 180;
}
//var distance = getDistance([47, 7], [47, 7.1])