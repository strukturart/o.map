const geojson = ((_) => {
  ///////////
  //save geoJson file
  /////////////////
  const save_geojson = function (file_path_name, type) {
    let extData = "";

    if (type == "single-direct") {
      let l = markers_group.getLayers();
      let single = l[l.length - 1].toGeoJSON();
      extData = JSON.stringify(single);
    }

    if (type == "single") {
      let single = mainmarker.selected_marker.toGeoJSON();
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
      e.features[0].properties.software = "o.map";
      e.features[0].properties.timestamp = tracking_timestamp;

      extData = JSON.stringify(e);
    }

    if (type == "routing") {
      let e = routing.data;
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
      status.windowOpen = "finder";
      helper.side_toaster("<img src='./assets/image/E25C.svg'>", 5000);
      bottom_bar("", "", "");

      if (type == "tracking") {
        module.measure_distance("destroy_tracking");
        mainmarker.tracking = false;
        localStorage.removeItem("tracking_cache");
      }

      if (type == "path") {
        module.measure_distance("destroy");
      }

      setTimeout(function () {
        build_menu();
      }, 2000);
    };

    requestAdd.onerror = function () {
      helper.toaster(
        "Unable to write the file, the file name may already be used",
        10000
      );
      status.windowOpen = "finder";
    };
  };

  ///////////
  //save geoJson file
  /////////////////
  const save_gpx = function (file_path_name, type) {
    let extData = "";

    if (type == "tracking") {
      let e = tracking_group.toGeoJSON();
      e.features[0].properties.software = "o.map";
      e.features[0].properties.timestamp = tracking_timestamp;

      let option = { featureCoordTimes: "timestamp", creator: "o.map" };

      extData = togpx(e, option);
    }

    let geojson_file = new Blob([extData], {
      type: "application/gpx+xm",
    });

    let sdcard = navigator.getDeviceStorage("sdcard");

    let requestAdd = sdcard.addNamed(geojson_file, file_path_name);

    requestAdd.onsuccess = function () {
      status.windowOpen = "map";
      helper.side_toaster("<img src='./assets/image/E25C.svg'>", 3000);
      bottom_bar("", "", "");

      if (type == "tracking") {
        module.measure_distance("destroy_tracking");
        mainmarker.tracking = false;
        localStorage.removeItem("tracking_cache");
      }

      setTimeout(function () {
        build_menu();
        helper.side_toaster("the file was saved", 1000);
      }, 2000);
    };

    requestAdd.onerror = function () {
      helper.toaster(
        "Unable to write the file, the file name may already be used",
        10000
      );
      status.windowOpen = "map";
    };
  };

  return {
    save_geojson,
    save_gpx,
  };
})();
