// osm.js

import localforage from "localforage";
import { settings } from "../../index.js";
import { side_toaster } from "./helper.js";

export const osm_server_upload_gpx = async function (
  filename,
  gpx_data,
  notify = true,
) {
  const token = await localforage.getItem("osm_token");

  if (!token) {
    return false;
  }

  let n = "Bearer " + general.osm_token;
  const myHeaders = new Headers({
    Authorization: n,
  });

  var blob = new Blob([gpx_data], {
    type: "application/gpx",
  });

  let formData = new FormData();
  formData.append("description", "uploaded from o.map");
  formData.append("visibility", "private");
  formData.append("file", blob, filename);

  try {
    const response = await fetch(
      "https://api.openstreetmap.org/api/0.6/gpx/create",
      {
        method: "POST",
        body: formData,
        headers: myHeaders,
      },
    );
    const data = await response.text();
    if (notify) side_toaster("file uploaded", 4000);
    status.live_track_id.push(data);
    return data;
  } catch (error) {
    side_toaster("error: " + error, 4000);
    throw error;
  }
};

export const osm_delete_gpx = async function (id, notify) {
  const token = await localforage.getItem("osm_token");

  if (!token) {
    return false;
  }

  let n = "Bearer " + general.osm_token;
  const myHeaders = new Headers({
    Authorization: n,
  });
  if (notify) side_toaster("try deleting file", 2000);

  try {
    const response = await fetch(
      "https://api.openstreetmap.org/api/0.6/gpx/" + id,
      {
        method: "DELETE",
        headers: myHeaders,
      },
    );
    const data = await response.text();

    try {
      status.live_track_id = status.live_track_id.filter((item) => item !== id);
    } catch (e) {}

    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (notify) side_toaster("file deleted " + id, 4000);
    return data;
  } catch (error) {
    side_toaster("error: " + error, 4000);
    throw error;
  }
};

export const osm_update_gpx = async function (id, gpx_data) {
  const token = await localforage.getItem("osm_token");

  if (!token) {
    return false;
  }

  let n = "Bearer " + general.osm_token;
  const myHeaders = new Headers({
    Authorization: n,
  });

  var blob = new Blob([gpx_data], {
    type: "application/gpx",
  });

  side_toaster("try updating file" + id, 2000);

  let formData = new FormData();
  formData.append("description", "uploaded from o.map");
  formData.append("visibility", "private");
  formData.append("file", blob);

  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest({ mozSystem: true });
      const url = "https://api.openstreetmap.org/api/0.6/gpx/" + id;
      xhr.open("PUT", url);
      xhr.setRequestHeader("Authorization", n);

      xhr.onload = function () {
        if (xhr.status === 200) {
          side_toaster("file uploaded", 5000);
          resolve(xhr.responseText);
        } else {
          const error = "Error: " + xhr.status;
          side_toaster(error, 4000);
          reject(error);
        }
      };

      xhr.onerror = function () {
        const error = "Request failed";
        side_toaster(error, 4000);
        reject(error);
      };

      xhr.send(formData);
    } catch (e) {
      alert(e);
      reject(e);
    }
  });
};

export const osm_get_user = async function (notification = true) {
  const token = await localforage.getItem("osm_token");

  if (!token) {
    if (notification) {
    }
    return false;
  }

  try {
    const response = await fetch(
      "https://api.openstreetmap.org/api/0.6/user/details",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("OSM request failed: " + response.status);
    }

    const data = await response.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(data, "application/xml");

    const userEl = xml.getElementsByTagName("user")[0];

    if (!userEl) {
      throw new Error("No user element in response");
    }

    const username = userEl.getAttribute("display_name");

    await localforage.setItem("osm_user", username);

    return username;
  } catch (error) {
    console.error("OSM error:", error);
    throw error;
  }
};

export const OAuth_osm = function (callback) {
  const url = new URL("https://www.openstreetmap.org/oauth2/authorize");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", process.env.OSM_CLIENT_KEY);
  url.searchParams.append(
    "redirect_uri",
    "https://omap.strukturart.com/index.html",
  );
  url.searchParams.append("scope", "write_gpx read_gpx read_prefs");

  const windowRef = window.open(url.toString());
};

export const osm_server_load_gpx = async function (
  id,
  filename,
  download = false,
) {
  let token = await localforage.getItem("osm_token");
  let n = "Bearer " + token;

  const myHeaders = new Headers({
    Authorization: n,
    Accept: "application/gpx+xml",
  });

  try {
    const response = await fetch(
      "https://api.openstreetmap.org/api/0.6/gpx/" + id + "/data",
      {
        method: "GET",
        headers: myHeaders,
      },
    );
    const data = await response.text();

    return data;
  } catch (error) {
    throw error;
  }
};

export const osm_server_list_gpx = async function () {
  const token = await localforage.getItem("osm_token");

  let n = "Bearer " + token;
  if (!n) {
    console.log("no token");
    return;
  }

  const myHeaders = new Headers({
    Authorization: n,
  });

  try {
    const response = await fetch(
      "https://api.openstreetmap.org/api/0.6/user/gpx_files",
      {
        method: "GET",
        headers: myHeaders,
      },
    );
    const data = await response.text();

    let files = [];
    const parser = new DOMParser();
    const xml = parser.parseFromString(data, "application/xml");
    let s = xml.getElementsByTagName("gpx_file");

    for (let i = 0; i < s.length; i++) {
      if (settings.osmTag == null || settings.osmTag == "") {
        let m = {
          name: s[i].getAttribute("name"),
          id: s[i].getAttribute("id"),
        };

        if (!files.some((file) => file.id === m.id)) {
          files.push({
            name: m.name,
            path: m.id,
            id: m.id,
            type: "osm_sever",
          });
        }

        files.sort((a, b) => {
          return b.name.localeCompare(a.name);
        });
      } else {
        for (let n = 0; n < s[i].childNodes.length; n++) {
          if (s[i].childNodes[n].tagName == "tag") {
            if (s[i].childNodes[n].textContent == settings.osmTag) {
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
    return files;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
