const geojson = ((_) => {
  ///////////
  //save geoJson file
  /////////////////
  const save_geojson = function (file_path_name, type) {
    let extData;

    if (type == "single") {
      // Create a marker
      let n = markers_group.getLayers();
      var marker = n[n.length - 1];
      // Get the GeoJSON object
      var single = marker.toGeoJSON();
      // Log to console

      extData = JSON.stringify(single);
    }

    if (type == "collection") {
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

      extData = JSON.stringify(collection);
    }

    let geojson_file = new Blob([extData], {
      type: "application/json",
    });
    let sdcard = navigator.getDeviceStorage("sdcard");
    alert(file_path_name)
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

  return {
    save_geojson,
  };
})();
