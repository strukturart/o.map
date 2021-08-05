const geojson = ((_) => {
  ///////////
  //save geoJson file
  /////////////////
  const save_geojson = function (file_path_name, type) {
    let extData = "";

    if (type == "single") {
      let single = selected_marker.toGeoJSON();
      // store popup content
      let a = document.querySelector("textarea#popup").value;
      if (a != "") {
        let a = document.querySelector("textarea#popup").value;
        single.properties.popup = a;
      }

      extData = JSON.stringify(single);
    }

    if (type == "path") {
      let single = tracking_group.toGeoJSON();
      extData = JSON.stringify(single);
    }

    if (type == "tracking") {
      let e = tracking_group.toGeoJSON();
      extData = JSON.stringify(e);
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

    let requestAdd = sdcard.addNamed(geojson_file, file_path_name);

    requestAdd.onsuccess = function () {
      windowOpen = "map";
      toaster("succesfull saved", 5000);
      bottom_bar("", "", "");

      if (type == "tracking") {
        module.measure_distance("destroy_tracking");
        mainmarker.tracking = false;
      }

      if (type == "path") {
        module.measure_distance("destroy");
      }

      setTimeout(function () {
        build_menu();
      }, 1000);
    };

    requestAdd.onerror = function () {
      toaster(
        "Unable to write the file, the file name may already be used",
        10000
      );
      windowOpen = "map";
    };
  };

  return {
    save_geojson,
  };
})();
