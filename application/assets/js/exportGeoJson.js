const geojson = ((_) => {
  ///////////
  //save geoJson file
  /////////////////
  const save_geojson = function (file_path_name) {
    let collection = markers_group.toGeoJSON();
    let bounds = map.getBounds();

    collection.bbox = [
      [
        bounds.getSouthWest().lng,
        bounds.getSouthWest().lat,
        bounds.getNorthEast().lng,
        bounds.getNorthEast().lat,
      ],
    ];

    let extData = JSON.stringify(collection);

    let geojson_file = new Blob([extData], { type: "application/json" });
    let sdcard = navigator.getDeviceStorage("sdcard");
    let requestAdd = sdcard.addNamed(geojson_file, file_path_name);

    requestAdd.onsuccess = function () {
      toaster("Export succesfull", 3000);
      windowOpen = "map";
    };

    requestAdd.onerror = function () {
      toaster("Unable to write the file: " + this.error, 2000);
      windowOpen = "map";
    };
  };

  return { save_geojson };
})();
