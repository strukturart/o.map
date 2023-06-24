const osm = (() => {
  let osm_server_upload_gpx = function (filename, gpx_data) {
    if (!general.osm_token) {
      helper.side_toaster(
        "looks like you are not connected to openstreetmap",
        5000
      );
      return false;
    }

    let n = "Bearer " + general.osm_token;
    const myHeaders = new Headers({
      Authorization: n,
    });

    var blob = new Blob([gpx_data], {
      type: "application/gpx",
    });

    helper.side_toaster("try uploading file", 2000);

    let formData = new FormData();
    formData.append("description", "uploaded from o.map");
    formData.append("visibility", "private");
    formData.append("file", blob, filename);

    fetch("https://api.openstreetmap.org/api/0.6/gpx/create", {
      method: "POST",
      body: formData,
      headers: myHeaders,
    })
      .then((data) => {
        if (data.status == 200) {
          alert(JSON.stringify(data));

          setTimeout(() => {
            helper.side_toaster("file uploaded", 4000);
          }, 2000);
        }
      })

      .catch((error) => {
        helper.side_toaster("error: " + error, 4000);
      });
  };

  let osm_update_gpx = function (id, gpx_data) {
    if (!general.osm_token) {
      helper.side_toaster(
        "looks like you are not connected to openstreetmap",
        5000
      );
      return false;
    }

    let n = "Bearer " + general.osm_token;
    const myHeaders = new Headers({
      Authorization: n,
    });

    var blob = new Blob([gpx_data], {
      type: "application/gpx",
    });

    helper.side_toaster("try uploading file", 2000);

    let formData = new FormData();
    formData.append("description", "uploaded from o.map");
    formData.append("visibility", "private");
    formData.append("file", blob, filename);

    fetch("https://api.openstreetmap.org/api//api/0.6/gpx/#" + id, {
      method: "POST",
      body: formData,
      headers: myHeaders,
    })
      .then((data) => {
        console.log(data.status);
        if (data.status == 200) {
          setTimeout(() => {
            helper.side_toaster("file uploaded", 4000);
          }, 2000);
        }
      })

      .catch((error) => {
        helper.side_toaster("error: " + error, 4000);
      });
  };

  const get_user = function () {
    if (!general.osm_token) {
      helper.side_toaster(
        "looks like you are not connected to openstreetmap",
        5000
      );
      return false;
    }

    let n = "Bearer " + general.osm_token;
    const myHeaders = new Headers({
      Authorization: n,
    });

    fetch("https://api.openstreetmap.org/api/0.6/user/details.json", {
      method: "GET",
      headers: myHeaders,
    })
      .then((data) => {
        if (data.status == 200) {
          setTimeout(() => {
            alert(JSON.stringify(data));
          }, 2000);
        }
      })

      .catch((error) => {
        alert("error: " + error, 4000);
      });
  };

  return {
    osm_server_upload_gpx,
    get_user,
    osm_update_gpx,
  };
})();
