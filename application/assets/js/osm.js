const osm = (() => {
  let osm_server_upload_gpx = function (filename, gpx_data, notify = true) {
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

    if (notify) helper.side_toaster("try uploading file", 5000);

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
        if (notify == true) helper.side_toaster("file uploaded", 4000);
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
        //clean array after deleting, while live track mode
        try {
          status.live_track_id = status.live_track_id.filter(
            (item) => item !== id
          );
        } catch (e) {}

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
    } catch (e) {
      alert(e);
    }
  };

  const get_user = function (notification = true) {
    if (!general.osm_token && notification) {
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
        try {
          const parser = new DOMParser();
          const xml = parser.parseFromString(data, "application/xml");
          let s = xml.getElementsByTagName("user");
          general.osm_user = s[0].getAttribute("display_name");
        } catch (e) {}
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

  //load files

  //callback download file
  let callback_download = function (filename, filepath) {
    helper.side_toaster("downloaded successfully", 2000);

    document
      .querySelector("div#gpx")
      .nextSibling.insertAdjacentHTML(
        "afterend",
        "<div class='item' data-map='gpx' data-filename='" +
          filename +
          "' data-filepath='" +
          filepath +
          "'>" +
          filename +
          "</div>"
      );

    finder_tabindex();
  };

  let osm_server_load_gpx = function (id, filename, download) {
    let n = "Bearer " + localStorage.getItem("openstreetmap_token");

    const myHeaders = new Headers({
      Authorization: n,
      Accept: "application/gpx+xml",
    });

    return fetch("https://api.openstreetmap.org/api/0.6/gpx/" + id + "/data", {
      method: "GET",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        var gpx = data;

        //download file
        if (download == true) {
          helper.downloadFile(filename, data, callback_download);
        } else {
          new L.GPX(gpx, {
            async: true,
          })
            .on("loaded", function (e) {
              map.fitBounds(e.target.getBounds());
            })
            .addTo(gpx_group);

          document.querySelector("div#finder").style.display = "none";
          status.windowOpen = "map";
        }
      })

      .catch((error) => {
        helper.side_toaster(error, 2000);
      });
  };

  ///////////////
  ///List files
  /////////////

  let osm_server_list_gpx = function (callback) {
    let n = "Bearer " + localStorage.getItem("openstreetmap_token");

    const myHeaders = new Headers({
      Authorization: n,
    });

    return fetch("https://api.openstreetmap.org/api/0.6/user/gpx_files", {
      method: "GET",
      headers: myHeaders,
    })
      .then((response) => response.text())
      .then((data) => {
        let files = [];
        document.querySelector("div#osm-server-gpx").innerHTML = "";
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");
        let s = xml.getElementsByTagName("gpx_file");
        //filter by tag
        for (let i = 0; i < s.length; i++) {
          if (setting.osm_tag == null || setting.osm_tag == "") {
            let m = {
              name: s[i].getAttribute("name"),
              id: s[i].getAttribute("id"),
            };

            files.push({
              name: "_" + m.name,
              path: m.id,
              id: m.id,
              type: "osm_sever",
            });

            files.sort((a, b) => {
              return b.name.localeCompare(a.name);
            });
          } else {
            for (let n = 0; n < s[i].childNodes.length; n++) {
              if (s[i].childNodes[n].tagName == "tag") {
                if (s[i].childNodes[n].textContent == setting.osm_tag) {
                  let m = {
                    name: s[i].getAttribute("name"),
                    id: s[i].getAttribute("id"),
                  };

                  files.push({
                    name: m.name,
                    path: m.id,
                    id: m.id,
                    type: "osm_sever",
                  });

                  files.sort((a, b) => {
                    return b.name.localeCompare(a.name);
                  });
                }
              }
            }
          }
        }
        callback(files);
      })

      .catch((error) => {
        console.log(error);
      });
  };

  return {
    OAuth_osm,
    osm_server_upload_gpx,
    get_user,
    osm_update_gpx,
    osm_delete_gpx,
    osm_server_load_gpx,
    osm_server_list_gpx,
  };
})();
