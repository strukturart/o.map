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
      .then((response) => response.text())
      .then((data) => {
        status.live_track_id = data;

        setTimeout(() => {
          helper.side_toaster("file uploaded", 4000);
        }, 2000);
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
    formData.append("file", blob);

    fetch("https://api.openstreetmap.org/api/0.6/gpx/#" + id, {
      method: "PUT",
      body: formData,
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        if (data.status == 200) {
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

    fetch("https://api.openstreetmap.org/api/0.6/user/details", {
      method: "GET",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then(function (data) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        let s = xml.getElementsByTagName("user");
        general.osm_user = s[0].getAttribute("display_name");
      })

      .catch((error) => {
        alert("error: " + error, 4000);
      });
  };

  let OAuth_osm = function (callback) {
    let n = window.location.href;
    const url = new URL("https://www.openstreetmap.org/oauth2/authorize");
    url.searchParams.append("response_type", "code");
    url.searchParams.append(
      "client_id",
      "KEcqDV16BjfRr-kYuOyRGmiQcx6YCyRz8T21UjtQWy4"
    );
    url.searchParams.append(
      "redirect_uri",
      "https://omap.strukturart.com/redirect.html"
    );
    url.searchParams.append("scope", "write_gpx read_gpx read_prefs");

    const windowRef = window.open(url.toString());

    windowRef.addEventListener("tokens", (ev) => callback());
  };

  return {
    OAuth_osm,
    osm_server_upload_gpx,
    get_user,
    osm_update_gpx,
  };
})();
