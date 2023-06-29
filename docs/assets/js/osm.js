const osm = (() => {
  let osm_server_upload_gpx = function (filename, gpx_data, notify) {
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

    if (notify) helper.side_toaster("try uploading file", 2000);

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
        status.live_track_id.push(data);
        setTimeout(() => {
          if (notify)
            helper.side_toaster("file uploaded" + status.live_track_id, 4000);
        }, 2000);
      })

      .catch((error) => {
        helper.side_toaster("error: " + error, 4000);
      });
  };

  let osm_delete_gpx = function (id, notify) {
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
    if (notify) helper.side_toaster("try deleting file", 2000);

    fetch("https://api.openstreetmap.org/api/0.6/gpx/" + id, {
      method: "DELETE",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        setTimeout(() => {
          if (notify) helper.side_toaster("file deleted " + id, 4000);
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

    helper.side_toaster("try updating file" + id, 2000);

    let formData = new FormData();
    formData.append("description", "uploaded from o.map");
    formData.append("visibility", "private");
    formData.append("file", blob);
    try {
      let n = "Bearer " + general.osm_token;
      const xhr = new XMLHttpRequest({ mozSystem: true });
      const url = "https://api.openstreetmap.org/api/0.6/gpx/" + id;
      xhr.open("PUT", url);
      xhr.setRequestHeader("Authorization", n);

      xhr.onload = function () {
        if (xhr.status === 200) {
          const data = xhr.responseText;
          helper.side_toaster("file updated", 2000);
        } else {
          const error = "Error: " + xhr.status;
          helper.side_toaster(error, 4000);
        }
      };

      xhr.onerror = function () {
        const error = "Request failed";
        helper.side_toaster(error, 4000);
      };

      xhr.send(formData);

      /*
      fetch("https://api.openstreetmap.org/api/0.6/gpx/" + id, {
        method: "PUT",
        body: formData,
        headers: myHeaders,
      })
        .then((response) => response.text())
        .then((data) => {
          alert(data);
          if (data.status == 200) {
            alert(data);
            helper.side_toaster("file updated", 2000);
          }
        })

        .catch((error) => {
          helper.side_toaster("error: " + error, 4000);
        });*/
    } catch (e) {
      alert(e);
    }
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
    osm_delete_gpx,
  };
})();
