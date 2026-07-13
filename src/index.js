"use strict";

import {
  bottom_bar,
  side_toaster,
  load_ads,
  top_bar,
  getManifest,
  geolocation,
  list_files,
  get_file,
  downloadFile,
  pushLocalNotification,
  share,
  allowScreenOff,
  keepScreenOn,
} from "./assets/js/helper.js";
import localforage from "localforage";
import m from "mithril";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import L from "leaflet";
import { basic_maps, basic_layers, basic_pois } from "./assets/js/maps.js";
import "leaflet-gpx";
import * as turf from "@turf/turf";

import { v4 as uuidv4 } from "uuid";
import "leaflet-rotatedmarker";

import { createElement, Files, Upload } from "lucide";

//icons
import {
  Layers,
  MapPin,
  Search,
  Navigation,
  Route,
  Info,
  Settings,
  Upload,
  List,
  Navigation,
  Contact,
  Book,
  Clock,
  Download,
  MapPinPlus,
} from "lucide";

import {
  osm_get_user,
  osm_server_list_gpx,
  OAuth_osm,
  osm_server_load_gpx,
} from "./assets/js/osm.js";

dayjs.extend(duration);

const markerIcon = new URL(
  "./assets/css/images/marker-icon.png",
  import.meta.url,
).href;

const followIcon = new URL("./assets/css/images/follow.svg", import.meta.url)
  .href;

const markerPoi = new URL("./assets/css/images/marker-poi.png", import.meta.url)
  .href;

const startIcon = new URL("./assets/css/images/start.png", import.meta.url)
  .href;

const endIcon = new URL("./assets/css/images/end.png", import.meta.url).href;

function Icon(icon, size = 22) {
  const svg = createElement(icon, {
    size,
    color: "currentColor",
  });

  return m.trust(svg.outerHTML);
}

const sw_channel = new BroadcastChannel("sw-messages");

export let status = {
  debug: false,
  version: "",
  notKaiOS: true,
  trackigData: [],
  trackingStats: "",
  osm_files: [],
  selectedMarker: "",
  search_collection: [],
  poi_collection: [],
  routingData: [],
  osmLogged: false,
  kaiosGPX: [],
  kaiosGeoJSON: [],
  gpxFiles: [],
  loadedFiles: [],
  automapCenter: false,
  lastNotification: Date.now(),
};

const userAgent = navigator.userAgent || "";
if (userAgent && userAgent.includes("KAIOS")) {
  status.notKaiOS = false;
}

let tilesLayer = null;
let overLayer = null;
let gpxOverlayer = null;
let geoJsonLayer = null;
let map = null;
let mainmarker = null;
let mainmarkerGroup = null;
let markersGroup = null;

let trackingLine;

//load custom maps,layers and pois from user
if (!status.notKaiOS) {
  list_files("json").then((files) => {
    files.forEach((file) => {
      if (file.includes("omap_maps.json")) {
        get_file(file)
          .then((data) => {
            return data.text().then((result) => {
              let jdata = JSON.parse(result);

              jdata.forEach((item) => {
                if (item.type == "map") {
                  basic_maps.push(item);
                }

                if (item.type == "overlay") {
                  basic_layers.push(item);
                }

                if (item.type == "overpass") {
                  item.query = item.url;
                  basic_pois.push(item);
                }
              });
            });
          })

          .catch((e) => {
            side_toaster(e, 2000);
          });
      }
    });
  });
}

localforage.getItem("gpxFiles").then((data) => {
  if (data) {
    status.gpxFiles = data || [];
  } else {
    status.gpxfiles = [];
  }
});

localforage.getItem("search").then((value) => {
  if (value) {
    status.search_collection = value;
  } else {
    status.search_collection = [];
  }
});

localforage.getItem("pois").then((value) => {
  if (value) {
    status.poi_collection = value;
  } else {
    status.poi_collection = [];
  }
});

let markersLocal = [];
localforage.getItem("markersLocal").then((e) => {
  markersLocal = e || [];
});

//share
let test = () => {
  const query = window.location.hash.split("?")[1] || "";
  const params = new URLSearchParams(query);
  const poiQuery = params.get("poi");

  const share = params.get("share");
  if (share && params.get("lat") && params.get("lng")) {
    status.share = {
      lat: params.get("lat"),
      lng: params.get("lng"),
      zoom: params.get("zoom"),
    };
  }
};
test();

if (!status.notKaiOS) {
  list_files("gpx").then((e) => {
    if (e) {
      status.kaiosGPX = e;
    } else {
      status.kaiosGPX = [];
    }
  });

  list_files("geojson").then((e) => {
    if (e) {
      status.kaiosGeoJSON = e;
    } else {
      status.kaiosGeoJSON = [];
    }
  });
}

export let settings;

const DEFAULT_SETTINGS = {
  crosshair: true,
  scale: true,
  measurement: "metric",
  radarTime: "2000",
  routingNotification: true,
  screenlock: false,
  cacheTime: "6",
  cacheZoom: "14",
  orsKey: "",
  routingProfile: "cycling-road",
  trackingNotificationDistance: "5",
  trackingNotificationTime: "30",
  osmTag: "",
};

localforage.getItem("settings").then((value) => {
  settings = {
    ...DEFAULT_SETTINGS,
    ...(value || {}),
  };

  localforage.setItem("settings", settings);
});

//KaiOS ads
if (!status.notKaiOS) {
  const scripts = [
    "./assets/js/kaiads.v5.min.js",
    "http://127.0.0.1/api/v1/shared/core.js",
    "http://127.0.0.1/api/v1/shared/session.js",
    "http://127.0.0.1/api/v1/apps/service.js",
    "http://127.0.0.1/api/v1/audiovolumemanager/service.js",
    "https://static.kaiads.com/ads-sdk/ads-sdk.v5.min.js",
  ];

  scripts.forEach((src) => {
    const js = document.createElement("script");
    js.type = "text/javascript";
    js.src = src;
    document.head.appendChild(js);
  });
}

if (status.debug) {
  window.onerror = function (msg, url, linenumber) {
    alert(
      "Error message: " +
        msg +
        "\nURL: " +
        url +
        "\nLine Number: " +
        linenumber,
    );
    return true;
  };
}

//osm
osm_get_user().then((user) => {
  if (!user) return;
  status.osmLogged = true;

  osm_server_list_gpx()
    .then((files) => {
      status.osm_files = files;
    })
    .catch((error) => console.error("Failed:", error));
});

//kaios button delay
let key_delay = () => {
  setTimeout(() => {
    status.viewReady = true;
  }, 1500);

  top_bar("", "", "");
  bottom_bar("", "", "");
};

//move map
function MoveMap(direction) {
  document.querySelector("#map-container").focus();
  const baseStep = 0.01;
  const zoomFactor = Math.pow(2, map.getZoom());
  const step = baseStep / zoomFactor;

  let center = map.getCenter();

  if (direction === "left") {
    center.lng -= step;
  } else if (direction === "right") {
    center.lng += step;
  } else if (direction === "up") {
    center.lat += step;
  } else if (direction === "down") {
    center.lat -= step;
  }
  map.panTo(center);

  let mapState = {
    lat: center.lat,
    lng: center.lng,
    zoom: map.getZoom(),
  };
  localforage.setItem("lastPosition", mapState);
  getMarkers();
  status.selectedMarker = "";
}

let getMarkers = async () => {
  // Get the current bounds of the map
  const bounds = map.getBounds().pad(0.3);

  // Get the center of the map for distance calculations
  const mapCenter = map.getCenter();

  // Reset the list of markers in bounds
  status.markers_in_bounds = [];

  if (m.route.get() == "/mapView") {
    bottom_bar("", "<img class='menu-button' src='assets/image/menu.svg'>", "");
  }

  //close all popups
  map.closePopup();

  // Iterate over all layers on the map
  map.eachLayer(function (layer) {
    if (layer instanceof L.Marker) {
      const markerLatLng = layer.getLatLng();

      // Check if the marker is within the map bounds
      if (bounds.contains(markerLatLng)) {
        // Remove any previous "selected" class
        if (layer.getElement()) {
          layer.getElement().classList.remove("selected-marker");
        }

        // Calculate the distance from the map center
        const distance = mapCenter.distanceTo(markerLatLng);

        // Add the marker and its distance to the list
        status.markers_in_bounds.push({ layer, distance });
      }
    }
  });

  // Sort the markers by distance (ascending)
  status.markers_in_bounds.sort((a, b) => a.distance - b.distance);

  // Extract only the marker layers from the sorted list
  status.markers_in_bounds = status.markers_in_bounds.map((item) => item.layer);
};

let currentMarkerIndex = -1; // Initialize the index for tracking the current marker

let previousMarkerIndex = null;

function panToNextMarker() {
  const markers = status.markers_in_bounds;

  if (!markers || markers.length === 0) {
    console.warn("No markers in bounds to pan to.");
    return;
  }

  // Increment the index and loop back to the start if at the end of the list
  currentMarkerIndex = (currentMarkerIndex + 1) % markers.length;
  status.selectedMarker = markers[currentMarkerIndex];
  console.log(status.selectedMarker.feature.properties.type);
  if (status.selectedMarker.feature.properties.type) {
    if (status.selectedMarker.feature.properties.type == "start") {
      status.routeSelected = true;
    }

    if (status.selectedMarker.feature.properties.type == "end") {
      status.routeSelected = true;
    }
  }
  const markerLatLng = status.selectedMarker.getLatLng();

  // Open popup for the selected marker
  const popup = status.selectedMarker.getPopup();

  if (popup) {
    const content = popup.getContent();

    if (content != "") {
      status.selectedMarker.openPopup();
    }
  }

  // Pan the map to the selected marker
  map.panTo(markerLatLng);

  // Update classes for the current and previous markers
  if (
    previousMarkerIndex !== null &&
    previousMarkerIndex !== currentMarkerIndex
  ) {
    const previousMarker = markers[previousMarkerIndex];
    previousMarker.getElement().classList.remove("selected-marker");
  }

  status.selectedMarker.getElement().classList.add("selected-marker");
  previousMarkerIndex = currentMarkerIndex;

  if (m.route.get() == "/mapView" && !status.notKaiOS) {
    bottom_bar(
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
      "<img class='option-button' src='assets/image/option.svg'>",
    );
  }
}

//folloe Route

const followRoute = () => {
  if (status.followRoute) {
    status.followRoute = false;
    status.followRouteData = "";
    m.route.set("/mapView");
    side_toaster("following route stopped", 4000);
    return;
  }

  status.followRoute = true;
  let obj = gpxOverlayer._layers;
  Object.entries(obj).forEach(([key, value]) => {
    if (value._path) {
      status.followRouteData = value._latlngs;
    }
  });
  m.route.set("/mapView");
  side_toaster("following route started", 4000);
};

//load files
let loadFiles = () => {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = "*/*";
  input.multiple = false;

  input.addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    try {
      const fileName = file.name || "";
      const extension = fileName.split(".").pop()?.toLowerCase();

      const allowed = ["gpx", "geojson", "json", "xml"];

      if (!allowed.includes(extension)) {
        side_toaster("Unsupported file", 2000);
        return;
      }

      const content = await new Response(file).text();

      if (extension === "gpx" || extension === "xml") {
        displayGPX(content, true, "loaded", { name: fileName }).then(() => {
          side_toaster("GPX loaded", 2000);
        });
      }

      if (extension === "geojson" || extension === "json") {
        const geoJsonData = JSON.parse(content);

        displayGeoJSONOnMap(geoJsonData, map, false);

        side_toaster("GeoJSON loaded", 2000);
      }

      m.route.set("/mapView");
    } catch (error) {
      console.error(error);

      side_toaster("File not loaded", 2000);
    }
  });

  input.click();
};

//display GeoJSON
let displayGeoJSONOnMap = (geoJsonData, map, addLineEndpoints = false) => {
  geoJsonLayer = L.geoJSON(geoJsonData, {
    style: (feature) => {
      return {
        color: feature.properties.color || "#fc0b1fff",
        weight: feature.properties.weight || 4,
        opacity: feature.properties.opacity || 0.8,
        fillOpacity: feature.properties.fillOpacity || 0.2,
        dashArray: feature.properties.dashArray || null,
      };
    },

    pointToLayer: (feature, latlng) => {
      let popupText = '<div style="max-width: 300px;">';

      if (feature.properties) {
        for (const [key, value] of Object.entries(feature.properties)) {
          popupText += `<p><strong>${key}:</strong> ${value}</p>`;
        }
      }

      popupText += "</div>";
      createPOIMarker(latlng.lat, latlng.lng, popupText).then((e) => {
        e.addTo(markersGroup);
      });
    },

    onEachFeature: (feature, layer) => {
      if (feature.properties) {
        let popupContent = "<div>";

        for (const [key, value] of Object.entries(feature.properties)) {
          popupContent += `<p><strong>${key}:</strong> ${value}</p>`;
        }

        popupContent += "</div>";
        layer.bindPopup(popupContent);
      }

      if (addLineEndpoints && feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates;
        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];

        createStartMarker(startCoord[1], startCoord[0]).addTo(markersGroup);
        createEndMarker(endCoord[1], endCoord[0]).addTo(markersGroup);
      }
    },
  }).addTo(geoJsonLayer);

  const bounds = geoJsonLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return geoJsonLayer;
};

//display GPX

const displayGPX = (gpxString, store = false, source, extension) => {
  return new Promise((resolve, reject) => {
    //clean gpx layer
    if (gpxOverlayer) {
      gpxOverlayer.clearLayers();
    }

    gpxOverlayer = new L.GPX(gpxString, {
      async: true,
      polyline_options: {
        color: "red",
      },
      markers: {
        startIcon: null,
        endIcon: null,
        wptIcons: {},
      },
    });

    gpxOverlayer
      .on("loaded", (e) => {
        const gpx = e.target;
        const latlngs = gpx.getLayers()[0]?.getLatLngs();
        let name;
        if (extension) {
          name = extension.name;
        }

        if (!name) {
          try {
            name = gpx.get_name();
          } catch (e) {
            console.warn("Fehler beim Abrufen des GPX-Namens:", e);
          }
        }

        if (!name) {
          name = "omap-" + dayjs().format("YYYY-MM-DD-HH-mm");
        }

        status.loadFileData = {
          timestamp: new Date(),
          name: name,
          distance: gpx.get_distance_imp() || "unknow",
        };

        if (store && status.notKaiOS) {
          let file = {
            date: new Date(),
            data: gpxString,
            name: name,
            type: "GPX",
            meta: {
              distance: gpx.get_distance_imp(),
            },
            source: source || "loaded",
          };

          //add more meta data
          if (extension) {
            Object.assign(file.meta, extension);
          }

          status.gpxFiles.unshift(file);

          // Keep max 5 per source

          const counts = {};

          status.gpxFiles = status.gpxFiles.filter((item) => {
            const src = item.source || "_unknown";
            counts[src] = (counts[src] || 0) + 1;
            return counts[src] <= 5;
          });

          localforage.setItem("gpxFiles", status.gpxFiles);
        }

        if (store && !status.notKaiOS) {
          downloadFile(name, gpxString, "", "gpx");
        }

        if (!latlngs?.length) {
          reject(new Error("Error"));
          return;
        }

        const start = latlngs[0];
        const end = latlngs[latlngs.length - 1];

        if (start.lat && start.lng) {
          createStartMarker(start.lat, start.lng).addTo(gpxOverlayer);
        }

        if (end.lat && end.lng) {
          createEndMarker(end.lat, end.lng).addTo(gpxOverlayer);
        }

        map.fitBounds(gpx.getBounds());
        map.addLayer(gpxOverlayer);

        //store to open at startup
        status.loadedFiles = [];
        localforage.setItem("last_gpx", {
          data: gpxString,
          timestamp: new Date(),
          source: source,
          extension: extension,
        });

        status.loadedFiles.push(name);

        resolve(gpx);
      })
      .on("error", reject);
  });
};

const loadLastGPX = async () => {
  try {
    const lastGpx = await localforage.getItem("last_gpx");

    if (lastGpx && lastGpx.data) {
      await displayGPX(lastGpx.data, false, lastGpx.source, lastGpx.extension);
    }
  } catch (error) {}
};

loadLastGPX();

//overpass pois
let poiGroup = null;
function loadPOIs(tag) {
  const b = map.getBounds().pad(0.2);
  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

  let query;
  if (tag.includes("~")) {
    const [key, values] = tag.split("~");
    const valueArray = values.split("|");
    const nwrQueries = valueArray
      .map((v) => `nwr[${key}=${v}](${bbox});`)
      .join("\n  ");

    query = `
[out:json][timeout:20];
(
  ${nwrQueries}
);
out center;
`;
  } else {
    query = `
[out:json][timeout:40];
nwr[${tag}](${bbox});
out center;
`;
  }

  const urls = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ];

  function tryFetch(urlIndex = 0) {
    if (urlIndex >= urls.length) {
      side_toaster("Data not loaded", 2000);
      document.querySelector("#info").textContent = "";
      return;
    }

    document.querySelector("#info").textContent = "load data..";
    const url = urls[urlIndex];

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "application/json",
      },
      body: "data=" + encodeURIComponent(query),
    })
      .then(async (response) => {
        // Behandle HTTP-Fehler explizit
        if (response.status === 504) {
          throw new Error("Server Timeout (504) - trying next endpoint");
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        return JSON.parse(text);
      })
      .then((data) => {
        if (data.elements && data.elements.length > 0) {
          renderPOIs(data);
          document.querySelector("#info").textContent = "";
        } else {
          document.querySelector("#info").textContent = "No data found";
          setTimeout(() => {
            document.querySelector("#info").textContent = "";
          }, 5000);
        }
      })
      .catch((err) => {
        console.error(`Error at ${url}: ${err.message}`);
        // Exponentielles Backoff: 2s, 4s, 8s zwischen Versuchen
        let delay = 2000 * Math.pow(2, urlIndex);
        console.log("delay: " + delay);
        setTimeout(() => tryFetch(urlIndex + 1), delay);
      });
  }

  tryFetch();
}

function renderPOIs(data) {
  poiGroup.clearLayers();

  console.log(JSON.stringify(data));
  data.elements.forEach((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    if (!lat || !lon) return;

    const name = el.tags?.name || el.tags?.amenity || "POI";

    createPOIMarker(lat, lon, name, el.tags).then((marker) => {
      marker.addTo(poiGroup);
    });
  });
}

//add tiles layer
let addTilesLayer = (url, maxzoom, attribution) => {
  if (tilesLayer) {
    map.removeLayer(tilesLayer);
    if (url == status.current_tilelayer) {
      status.current_tilelayer = "";
      localforage.removeItem("lastTilesLayer");
      return;
    }
  }

  tilesLayer = L.tileLayer(url, {
    maxNativeZoom: maxzoom,
    maxZoom: 24,
    attribution: attribution,
    useCache: true,
    cacheMaxAge: 2629800000,
    useOnlyCache: false,
    saveToCache: true,
  }).addTo(map);
  localforage.setItem("lastTilesLayer", {
    url: url,
    maxzoom: maxzoom,
    attribution: attribution,
  });

  status.current_tilelayer = url;
};

//add overlayer
let addOverLayer = (url, maxzoom, attribution) => {
  if (overLayer) {
    map.removeLayer(overLayer);
    if (url == status.current_overlayer) {
      status.current_overlayer = "";
      localforage.removeItem("lastOverLayer");
      return;
    }
  }

  overLayer = L.tileLayer(url, {
    maxZoom: maxzoom,
    attribution,
  }).addTo(map);
  // overLayer.bringToFront();

  localforage.setItem("lastOverLayer", {
    url: url,
    maxzoom: maxzoom,
    attribution: attribution,
  });
  status.current_overlayer = url;
};

//create poi marker
let createPOIMarker = async (
  lat,
  lng,
  popupText,
  tags = {},
  openPopup = false,
) => {
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch (e) {
      tags = {};
    }
  } else if (!tags || typeof tags !== "object") {
    tags = {};
  }

  let html = `<strong>${popupText}</strong>`;

  if (tags.website) {
    html += `<br><a href="${tags.website}" target="_blank" rel="noopener">Website</a>`;
  }

  if (tags.phone) {
    html += `<br><a href="tel:${tags.phone}">${tags.phone}</a>`;
  }

  if (tags.mobile) {
    html += `<br><a href="tel:${tags.mobile}">${tags.mobile}</a>`;
  }

  if (tags.opening_hours) {
    html += `<br><b>Opening hours</b><br>${tags.opening_hours.replace(/;/g, "<br>")}`;
  }

  if (status.notKaiOS) {
    html += '<br><br><button class="popup-save-marker">save</button>';
  }

  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: markerPoi,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });

  if (!status.notKaiOS) {
    marker.bindPopup(html);
  }

  marker.feature = {
    type: "Feature",
    properties: {
      type: "poi",
      id: uuidv4(),
      popupText: popupText,
      tags: tags,
    },
  };

  marker.on("click", (e) => {
    status.selectedMarker = marker;

    mapView.markerData = marker.feature;
    m.redraw();
    if (!status.notKaiOS) {
      bottom_bar(
        "",
        "<img class='menu-button' src='assets/image/menu.svg'>",
        "<img class='option-button' src='assets/image/option.svg'>",
      );
    }

    if (status.notKaiOS) {
      document.querySelectorAll(".popup-save-marker").forEach((button) => {
        if (button)
          button.addEventListener("click", (e) => {
            storeMarker(status.selectedMarker);
          });
      });
    }
  });

  if (openPopup) {
    marker.openPopup();

    status.selectedMarker = marker;

    mapView.markerData = marker.feature;
    m.redraw();
  }
  return marker;
};

//create start marker
let createStartMarker = (lat, lng) => {
  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: startIcon,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });

  marker.feature = {
    type: "Feature",
    properties: {
      type: "start",
    },
  };

  return marker;
};

//create end marker
let createEndMarker = (lat, lng) => {
  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: endIcon,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });

  marker.feature = {
    type: "Feature",
    properties: {
      type: "end",
    },
  };

  return marker;
};

//tracking

let tracking = () => {
  if (!status.geolocation) {
    side_toaster("The device cannot be geolocated", 2000);
    return;
  }
  if (status.tracking) {
    status.tracking = false;

    let ask = confirm("do you want save ?");
    if (ask) {
      const name = dayjs().format("DD-MM-YYYY-HH-mm-ss");
      let trackingData = trackingDataToGPXString(status.trackigData, name);
      downloadFile(name, trackingData, null, "gpx").then(() => {
        side_toaster("saved", 2000);
      });
    }
  } else {
    status.tracking = true;
    status.trackigData = [];
    side_toaster("tracking started", 2000);
  }

  localforage.removeItem("tempTracking");
};

async function saveTempTracking() {
  if (status.tracking && status.trackigData.length > 0) {
    try {
      await localforage.setItem("tempTracking", status.trackigData);
      console.log("backup");
    } catch (error) {
      console.error(error);
    }
  }
}

function trackingDataToGPXString(trackingData, trackName = "Track") {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1" creator="o.map">
  <metadata>
    <name>${trackName}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <trkseg>`;

  trackingData.forEach((point) => {
    // Korrekte Fallback-Logik
    let pointTime;
    try {
      pointTime = point.timestamp
        ? new Date(point.timestamp).toISOString()
        : new Date().toISOString();
    } catch (e) {
      pointTime = new Date().toISOString();
    }

    gpx += `
      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <ele>${point.altitude || 0}</ele>
        <time>${pointTime}</time>
        <extensions>
          <accuracy>${point.accuracy}</accuracy>
          <speed>${point.speed || 0}</speed>
          <heading>${point.heading || 0}</heading>
        </extensions>
      </trkpt>`;
  });

  gpx += `
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

//store marker
let storeMarker = async (data) => {
  let defaultName = "";
  if (status.selectedMarker) {
    defaultName =
      status.selectedMarker?.feature?.properties?.popupText || "New marker";
  }
  const markerName = prompt("Name:", defaultName);
  if (markerName === null) {
    side_toaster("Marker not stored", 2000);
    return false;
  }

  const geoJsonData = data.toGeoJSON();
  geoJsonData.properties.name = markerName;
  geoJsonData.properties.id = uuidv4();

  markersLocal.push(geoJsonData);

  try {
    await localforage.setItem("markersLocal", markersLocal);
    side_toaster("Marker '" + markerName + "' stored", 2000);

    m.route.set("/mapView");
    return geoJsonData;
  } catch (error) {
    side_toaster("Error storing marker", 2000);
    return false;
  }
};

function analyzeTrack(trackingData) {
  const geoJSONLine = turf.lineString(
    trackingData.map((p) => [p.longitude, p.latitude]),
  );

  const distanceMeters = turf.length(geoJSONLine, { units: "meters" });
  const distanceKm = turf.length(geoJSONLine, { units: "kilometers" });
  const distanceMiles = turf.length(geoJSONLine, { units: "miles" });

  const durationSeconds =
    (trackingData[trackingData.length - 1].timestamp -
      trackingData[0].timestamp) /
    1000;

  // Dauer mit dayjs formatieren
  const durationFormatted = dayjs
    .duration(durationSeconds, "seconds")
    .format("HH:mm:ss");

  const avgSpeed = (distanceMeters / durationSeconds).toFixed(2);

  let maxSpeed = 0;
  for (let i = 1; i < trackingData.length; i++) {
    const segmentDistance = turf.distance(
      [trackingData[i - 1].longitude, trackingData[i - 1].latitude],
      [trackingData[i].longitude, trackingData[i].latitude],
      { units: "meters" },
    );
    const segmentTime =
      (trackingData[i].timestamp - trackingData[i - 1].timestamp) / 1000;
    const segmentSpeed = segmentDistance / segmentTime;
    maxSpeed = Math.max(maxSpeed, segmentSpeed);
  }

  const startPoint = [trackingData[0].longitude, trackingData[0].latitude];
  const endPoint = [
    trackingData[trackingData.length - 1].longitude,
    trackingData[trackingData.length - 1].latitude,
  ];
  const bearing = turf.bearing(startPoint, endPoint);

  return {
    distanceMeters: distanceMeters.toFixed(2),
    distanceKm: distanceKm.toFixed(2),
    distanceMiles: distanceMiles.toFixed(2),
    durationSeconds: durationSeconds.toFixed(0),
    durationFormatted: durationFormatted,
    averageSpeedMs: avgSpeed,
    averageSpeedKmh: (avgSpeed * 3.6).toFixed(2),
    averageSpeedMph: (avgSpeed * 2.237).toFixed(2),
    maxSpeedMs: maxSpeed.toFixed(2),
    maxSpeedKmh: (maxSpeed * 3.6).toFixed(2),
    maxSpeedMph: (maxSpeed * 2.237).toFixed(2),
    bearing: bearing.toFixed(2),
    pointCount: trackingData.length,
  };
}

//caching

let caching_tiles = function () {
  let zoomlevel = map.getZoom();
  if (zoomlevel < 13) {
    alert("That would load too much data; please zoom in.");
    return;
  }
  // if (status.caching_tiles_started) return false;
  let swLat = map.getBounds()._southWest.lat;
  let swLng = map.getBounds()._southWest.lng;
  let neLat = map.getBounds()._northEast.lat;
  let neLng = map.getBounds()._northEast.lng;

  var bbox = L.latLngBounds(L.latLng(swLat, swLng), L.latLng(neLat, neLng));
  tilesLayer.seed(bbox, 0, 16);

  // Display seed progress on console
  tilesLayer.on("seedprogress", function (seedData) {
    status.caching_tiles_started = true;
    var percent =
      100 - Math.floor((seedData.remainingLength / seedData.queueLength) * 100);
    console.log("Seeding " + percent + "% done");
    if (percent > 90) status.caching_tiles_started = false;
  });
  tilesLayer.on("seedend", function (seedData) {
    status.caching_tiles_started = false;
    side_toaster("Downloaded", 3000);
  });

  tilesLayer.on("error", function (seedData) {
    status.caching_tiles_started = false;
  });

  tilesLayer.on("seedstart", function (seedData) {});
};

function handleDeviceOrientation(event) {
  const heading = event.webkitCompassHeading ?? event.alpha;

  if (typeof heading === "number") {
    mainmarker.setRotationAngle(heading);

    let followIconElement = document.querySelector("#follow-icon svg");

    if (followIconElement) {
      followIconElement.style.transform = `rotate(${heading}deg)`;
    }
  }
}

let deviceorientation = () => {
  if (typeof DeviceOrientationEvent !== "undefined") {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener(
              "deviceorientation",
              handleDeviceOrientation,
            );
          } else {
            side_toaster("fallback", 2000);
            status.fallbackToGeolocationHeading = true;
          }
        })
        .catch((error) => {
          side_toaster(error, 3000);
        });
    } else {
      console.log("Keine Permission-API vorhanden");

      window.addEventListener("deviceorientation", handleDeviceOrientation);
    }
  } else {
    console.log("heading fallback");

    status.fallbackToGeolocationHeading = true;
  }
};

// Initialize the map and define the setup
const initMap = () => {
  map = L.map("map-container", {
    keyboard: true,
    zoomControl: false,
    minZoom: 3,
    maxNativeZoom: 18,
    worldCopyJump: true,
  });

  map.on("zoomend", function () {
    const center = map.getCenter();
    let mapState = {
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
    };

    localforage.setItem("lastPosition", mapState).then((e) => {});
  });

  function updateUrlParams(mapState) {
    const hash = window.location.hash;
    const queryStart = hash.indexOf("?");

    let params;
    if (queryStart !== -1) {
      params = new URLSearchParams(hash.substring(queryStart + 1));
    } else {
      params = new URLSearchParams();
    }

    params.set("lat", mapState.lat.toFixed(6));
    params.set("lng", mapState.lng.toFixed(6));
    params.set("zoom", mapState.zoom);

    const route = queryStart !== -1 ? hash.substring(0, queryStart) : hash;
    const newUrl = `${route}?${params.toString()}`;

    window.history.replaceState(null, "", newUrl);
  }

  map.on("moveend", function () {
    const center = map.getCenter();
    let mapState = {
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
    };

    localforage.setItem("lastPosition", mapState).then((e) => {
      updateUrlParams(mapState);
    });
  });

  //last position
  localforage.getItem("lastPosition").then((e) => {
    if (e.zoom != undefined || e.zoom != NaN)
      map.setView([e.lat, e.lng], e.zoom);
  });

  const scripts = [
    "./assets/js/L.TileLayer.PouchDBCached.js",
    "./assets/js/pouchdb_7.3.0_pouchdb.min.js",
  ];

  scripts.forEach((src) => {
    const js = document.createElement("script");
    js.type = "text/javascript";
    js.src = src;
    document.head.appendChild(js);
  });

  localforage
    .getItem("lastTilesLayer")
    .then((e) => {
      if (e.url) {
        addTilesLayer(e.url, e.maxzoom, e.attribution);
      } else {
        addTilesLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          19,
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        );
      }
    })
    .catch(() => {
      addTilesLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        19,
        "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      );
    });

  localforage.getItem("lastOverLayer").then((e) => {
    if (e.url) addOverLayer(e.url, e.maxzoom, e.attribution);
  });

  poiGroup = L.layerGroup().addTo(map);
  mainmarkerGroup = L.layerGroup().addTo(map);
  gpxOverlayer = L.layerGroup().addTo(map);
  geoJsonLayer = L.layerGroup().addTo(map);
  markersGroup = L.layerGroup().addTo(map);
  trackingLine = L.polyline([], {
    color: "#3388ff",
    weight: 3,
    opacity: 0.8,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  setTimeout(() => {
    const attr = document.querySelector(".leaflet-control-attribution");
    if (attr) attr.style.display = "none";
  }, 2000);

  if (status.share)
    map.panTo([status.share.lat, status.share.lng], status.share.zoom);

  geolocation((e) => {
    let crosshair = document.querySelector("div#cross-inner");

    if (e == "error") {
      if (crosshair) {
        crosshair.classList.add("unavailable");
        status.geolocation = false;
      }
    } else {
      status.geolocation = true;

      if (crosshair) {
        crosshair.classList.remove("unavailable");
      }
      if (
        status.fallbackToGeolocationHeading &&
        e.coords.heading !== null &&
        e.coords.heading !== undefined
      ) {
        let iconElement = document.querySelector("#follow-icon svg");
        if (iconElement) {
          iconElement.style.transform = `rotate(${e.coords.heading}deg)`;
          iconElement.style.transformOrigin = "center";
        }
      }

      if (!mainmarker && e.coords.latitude) {
        mainmarker = L.marker([e.coords.latitude, e.coords.longitude], {
          draggable: false,
          icon: L.icon({
            iconUrl: followIcon,
            shadowUrl: null,
            iconSize: [21, 35],
            iconAnchor: [10, 17],
            popupAnchor: [0, -17],
          }),
          rotationOrigin: "center center",
        }).addTo(mainmarkerGroup);
        setTimeout(() => {
          if (status.share) {
            map.panTo([status.share.lat, status.share.lng], status.share.zoom);
          } else {
            map.panTo([e.coords.latitude, e.coords.longitude], 16);
          }
        }, 5000);
      }

      mainmarker.setLatLng([e.coords.latitude, e.coords.longitude]);
      if (status.automapCenter) {
        map.setView([e.coords.latitude, e.coords.longitude], map.getZoom());
      }

      if (e.coords.accuracy < 50) {
        const point = {
          latitude: e.coords.latitude,
          longitude: e.coords.longitude,
          timestamp: e.timestamp,
          accuracy: e.coords.accuracy,
          altitude: e.coords.altitude,
          speed: e.coords.speed,
          heading: e.coords.heading,
        };

        //follow route
        if (status.followRoute) {
          let routeCoordinates = status.followRouteData;

          const turfCoordinates = routeCoordinates.map((coord) => [
            coord.lng,
            coord.lat,
          ]);

          const isImperial = settings.measurement === "imperial";

          const unit = isImperial ? "miles" : "meters";

          const threshold = 50;

          const routeLine = turf.lineString(turfCoordinates);
          const userPoint = turf.point([point.longitude, point.latitude]);
          const distance = turf.pointToLineDistance(userPoint, routeLine, {
            units: unit,
          });

          if (distance > threshold) {
            let dif = Date.now() - status.lastNotification;
            if (dif > 60000) {
              status.lastNotification = Date.now();
              if (settings.routingNotification)
                pushLocalNotification("O.map", "Route warning!");
            }
          }

          try {
            if (settings.screenlock) {
              keepScreenOn();
            } else {
              allowScreenOff();
            }
          } catch (e) {
            alert(e);
          }
        }

        if (status.tracking) {
          try {
            if (settings.screenlock) {
              keepScreenOn();
            } else {
              allowScreenOff();
            }
          } catch (e) {
            alert(e);
          }
          status.trackigData.push(point);
          trackingLine.addLatLng([e.coords.latitude, e.coords.longitude]);
          status.trackingStats = analyzeTrack(status.trackigData);

          if (m.route.get() == "/trackingView") {
            m.redraw();
          }

          saveTempTracking();
        }
      }
    }
  });
};

initMap();

//overpass request
let OverpassQuery = async (osmId, osmType = "node") => {
  const query = `
[out:json];
${osmType}(${osmId});
out center;
`;

  const urls = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ];

  function tryFetch(urlIndex = 0) {
    return new Promise((resolve, reject) => {
      if (urlIndex >= urls.length) {
        reject(new Error("All Overpass servers failed"));
        return;
      }

      const url = urls[urlIndex];

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
        },
        body: "data=" + encodeURIComponent(query),
      })
        .then(async (response) => {
          const text = await response.text();

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}\n${text}`);
          }

          return JSON.parse(text);
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          tryFetch(urlIndex + 1)
            .then(resolve)
            .catch(reject);
        });
    });
  }

  return tryFetch();
};

//search comp
const searchService = {
  async search(query) {
    if (!query || query.length < 3) return [];

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`,
      );

      return await res.json();
    } catch (e) {
      console.error("Search error:", e);
      return [];
    }
  },
};

const SearchInput = {
  oninit(vnode) {
    vnode.state.query = "";
    vnode.state.results = [];
  },

  view(vnode) {
    const state = vnode.state;

    return m("div", { class: "col-xs-12" }, [
      m("input", {
        type: "search",
        class: "item",
        placeholder: vnode.attrs.placeholder || "search",
        value: state.query,

        oninput: async (e) => {
          state.query = e.target.value;

          state.results = await searchService.search(state.query);

          if (vnode.attrs.onResults) {
            vnode.attrs.onResults(state.results);
          }
          m.redraw();
        },
      }),

      state.results.length > 0 &&
        m(
          "div",
          { class: "search-results" },
          state.results.map((item) =>
            m(
              "div",
              {
                class: "item",
                tabIndex: 0,

                "data-lat": parseFloat(item.lat),
                "data-lng": parseFloat(item.lon),
                "data-text": item.name,

                onkeydown: (event) => {
                  if (event.key === "Enter") {
                    state.query = item.display_name;
                    state.results = [];

                    if (vnode.attrs.onSelect) {
                      vnode.attrs.onSelect({
                        lat: parseFloat(item.lat),
                        lng: parseFloat(item.lon),
                        name: item.name,
                        display_name: item.display_name,
                        addresstype: item.addresstype,
                        osm_id: item.osm_id,
                        osm_type: item.osm_type,
                      });

                      OverpassQuery(item.osm_id, item.osm_type).then(
                        (overpassData) => {
                          localforage
                            .getItem("search")
                            .then((searchResults) => {
                              const updatedResults = searchResults.map(
                                (result) => {
                                  if (result.osm_id === item.osm_id) {
                                    return {
                                      ...result,
                                      tags: JSON.stringify(
                                        overpassData.elements[0].tags,
                                      ),
                                    };
                                  }
                                  return result;
                                },
                              );

                              localforage.setItem("search", updatedResults);
                            });
                        },
                      );
                    }
                  }
                },

                onclick: () => {
                  state.query = item.display_name;
                  state.results = [];

                  if (vnode.attrs.onSelect) {
                    vnode.attrs.onSelect({
                      lat: parseFloat(item.lat),
                      lng: parseFloat(item.lon),
                      name: item.name,
                      display_name: item.display_name,
                      addresstype: item.addresstype,
                      osm_id: item.osm_id,
                      osm_type: item.osm_type,
                    });

                    OverpassQuery(item.osm_id, item.osm_type).then(
                      (overpassData) => {
                        console.log("DATA" + overpassData);
                        localforage.getItem("search").then((searchResults) => {
                          const updatedResults = searchResults.map((result) => {
                            if (result.osm_id === item.osm_id) {
                              return {
                                ...result,
                                tags: JSON.stringify(
                                  overpassData.elements[0].tags,
                                ),
                              };
                            }
                            return result;
                          });

                          localforage.setItem("search", updatedResults);
                        });
                      },
                    );
                  }
                },
              },
              [
                m("h3", { class: "result-name" }, item.name || "Unnamed"),
                m("div", { class: "" }, item.addresstype),
              ],
            ),
          ),
        ),
    ]);
  },
};

//routing api

let ors = async (from, to, apikey, profile) => {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest({
      mozSystem: true,
    });

    xhr.open(
      "POST",
      "https://api.openrouteservice.org/v2/directions/" + profile + "/gpx",
    );
    xhr.setRequestHeader("Authorization", apikey);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader(
      "Accept",
      "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    );

    xhr.timeout = 4000;

    xhr.ontimeout = function () {
      reject(new Error("Timeout"));
    };

    xhr.onload = function () {
      if (xhr.status === 200) {
        let test = xhr.response;
        resolve(test);
      } else if (xhr.status === 403) {
        reject(new Error("Forbidden"));
      } else if (xhr.status === 503) {
        reject(new Error("Service unavailable"));
      } else {
        reject(new Error("Unknown error"));
      }
    };

    xhr.onerror = function (err) {
      reject(err);
    };

    const body = {
      coordinates: [from, to],
      elevation: "true",
    };

    xhr.send(JSON.stringify(body));
  });
};

//weather api
status.weatherlayer = false;
let weatherLayer = null;

async function loadWeatherLayers() {
  try {
    // Animation stoppen
    if (status.layerLoopInterval) {
      clearInterval(status.layerLoopInterval);
      status.layerLoopInterval = null;

      const info = document.querySelector("#map-info");

      if (info) {
        info.textContent = "";
      }

      if (weatherLayer) {
        map.removeLayer(weatherLayer);
        weatherLayer = null;
        status.weatherlayer = false;
      }

      return;
    }

    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json",
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const radar = data.radar.past;

    if (!radar || !radar.length) {
      console.warn("Keine Radar-Daten vorhanden");
      return;
    }

    const attribution =
      "<a href='https://www.rainviewer.com/terms.html'>" +
      "weather data collected by rainviewer.com" +
      "</a>";

    let currentIndex = 0;

    const layerDuration = Number(settings.radarTime) || 1000;

    weatherLayer = L.tileLayer("", {
      opacity: 0.7,
      attribution: attribution,
      tileSize: 256,
    });

    weatherLayer.addTo(map);

    status.weatherlayer = true;

    function showRadarLayer() {
      const element = radar[currentIndex];

      const url = data.host + element.path + "/256/{z}/{x}/{y}/2/1_1.png";

      console.log("Radar:", currentIndex, url);

      weatherLayer.setUrl(url);

      const time = dayjs(element.time * 1000).format("HH:mm");

      const info = document.querySelector("#map-info");

      if (info) {
        info.textContent = time;
      }

      currentIndex = (currentIndex + 1) % radar.length;
    }

    showRadarLayer();

    status.layerLoopInterval = setInterval(showRadarLayer, layerDuration);
  } catch (err) {
    side_toaster("weather data could not loaded.", 3000);
  }
}

////////////////
///VIEWS
///////////////
window.addEventListener("pageshow", function () {
  const navigation = performance.getEntriesByType("navigation")[0];

  if (navigation && navigation.type === "reload") {
    m.route.set("/intro");
  }
});

var root = document.getElementById("app");

///////////////
///INTRO//////
/////////////

let startRoute = window.location.hash.slice(2);

if (!startRoute || startRoute === "/intro") {
  startRoute = "/mapView";
}

history.replaceState(
  null,
  "",
  window.location.pathname + window.location.search + "#!/intro",
);

var intro = {
  oninit: () => {
    key_delay();
    document.querySelector("body").style.background = "white";
    document.querySelector("html").style.background = "white";
  },
  onremove: () => {
    status.viewReady = false;
  },

  view: function () {
    return m(
      "div",
      {
        id: "intro",
        onremove: () => {
          localStorage.setItem("version", status.version);
        },

        oninit: function () {
          setTimeout(() => {
            document.querySelector("#map-container").style.display = "none";
            m.route.set(startRoute);
          }, 3000);
        },
      },
      [
        m("img", {
          src: "/assets/icons/navigation.svg",

          oncreate: () => {
            let get_manifest_callback = (e) => {
              try {
                status.version = e.manifest.version;
                document.querySelector("#version").textContent =
                  e.manifest.version;
              } catch (e) {}

              if ("b2g" in navigator || status.notKaiOS) {
                fetch("/manifest.webmanifest")
                  .then((r) => r.json())
                  .then((parsedResponse) => {
                    status.version = parsedResponse.b2g_features.version;
                    document.querySelector("#version").textContent =
                      status.version;
                  });
              }
            };
            getManifest(get_manifest_callback);
          },
        }),
        m(
          "div",
          {
            class: "row around-xs",
            id: "version-box",
          },
          [
            m(
              "kbd",
              {
                id: "version",
              },
              localStorage.getItem("version") || 0,
            ),
          ],
        ),
      ],
    );
  },
};

/*/////////*/
/*MAP*/
/*/////////*/
let MarkerModal = {
  view: (vnode) => {
    const { data, onClose } = vnode.attrs;

    if (!data) return null;

    const properties = data.properties || {};
    const tags = properties.tags || {};

    const address = [
      tags["addr:street"] || tags["addr:housenumber"]
        ? {
            label: "Adresse",
            value: [tags["addr:street"], tags["addr:housenumber"]]
              .filter(Boolean)
              .join(" "),
            address: true,
          }
        : null,

      tags["addr:postcode"] || tags["addr:city"]
        ? {
            label: "",
            value: [tags["addr:postcode"], tags["addr:city"]]
              .filter(Boolean)
              .join(" "),
            address: true,
          }
        : null,
    ].filter(Boolean);

    const contact = [
      ...address,

      tags.phone
        ? {
            label: "Phone",
            value: tags.phone,
            href: `tel:${tags.phone}`,
          }
        : null,

      tags.mobile
        ? {
            label: "Mobile",
            value: tags.mobile,
            href: `tel:${tags.mobile}`,
          }
        : null,

      tags.email
        ? {
            label: "Email",
            value: tags.email,
            href: `mailto:${tags.email}`,
          }
        : null,

      tags.website
        ? {
            label: "Website",
            value: tags.website,
            href: tags.website,
            external: true,
          }
        : null,
    ].filter(Boolean);

    const tabs = [
      {
        id: "info",
        label: "Info",
        icon: Icon(Book),
        content: properties.popupText,
      },
      {
        id: "contact",
        label: "Kontakt",
        icon: Icon(Contact),
        content: contact,
      },
      {
        id: "opening_hours",
        label: "Öffnungszeiten",
        icon: Icon(Clock),
        content: tags.opening_hours
          ? m.trust(tags.opening_hours.replace(/;/g, "<br>"))
          : null,
      },
      {
        id: "save",
        label: "Save",
        icon: Icon(Download),
        content: "The marker will be stored in the app.",
      },
    ];

    const activeTab = vnode.state.activeTab || "info";

    const activeTabData = tabs.find((tab) => tab.id === activeTab);

    return m("div.marker-modal", [
      m("div.marker-modal-content", [
        // Header
        m("div.modal-header", [
          m("h3", properties.popupText || "POI"),

          m(
            "button.modal-close",
            {
              type: "button",
              "aria-label": "close",
              title: "close",
              onclick: onClose,
            },
            "×",
          ),
        ]),

        // Tab Navigation
        m(
          "nav.modal-tabs",
          {
            role: "tablist",
          },

          tabs.map((tab) =>
            m(
              "button.modal-tab",
              {
                type: "button",
                role: "tab",

                class: activeTab === tab.id ? "active" : "",

                "aria-label": tab.label,
                "aria-selected": activeTab === tab.id,
                title: tab.label,

                onclick: () => {
                  if (tab.id === "save") {
                    setTimeout(() => {
                      storeMarker(status.selectedMarker).then((value) => {
                        status.selectedMarker.remove();
                        const [lng, lat] = value.geometry.coordinates;
                        createPOIMarker(
                          lat,
                          lng,
                          value.properties.name,
                          value.properties.tags ?? {},
                          true,
                        ).then((e) => {
                          e.addTo(markersGroup);
                        });
                      });
                    }, 1000);
                  }

                  vnode.state.activeTab = tab.id;
                },
              },

              m("span.modal-tab-icon", tab.icon),
            ),
          ),
        ),

        // Tab Content
        m(
          "div.modal-tab-content",

          activeTab === "contact"
            ? activeTabData.content.length
              ? activeTabData.content.map((item) =>
                  m("div.contact-item", [
                    item.href
                      ? m(
                          "a",
                          {
                            href: item.href,
                            target: item.external ? "_blank" : undefined,
                            rel: item.external
                              ? "noopener noreferrer"
                              : undefined,
                          },
                          item.value,
                        )
                      : m("div", item.value),
                  ]),
                )
              : m("p", "No contact information.")
            : activeTabData?.content
              ? m("div", activeTabData.content)
              : m("p", "No content."),
        ),
      ]),
    ]);
  },
};

let mapView = {
  markerData: null,

  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      map.zoomIn();
      getMarkers();
    }
    if (e.key === "SoftRight" || e.key === "Alt") {
      let options = document.querySelector("img.option-button");
      if (options) {
        m.route.set("/optionsView");
      } else {
        map.zoomOut();
      }
    }

    if (e.key === "ArrowUp") {
      MoveMap("up");
      getMarkers();
    }
    if (e.key === "ArrowDown") {
      MoveMap("down");
      getMarkers();
    }

    if (e.key === "ArrowLeft") {
      MoveMap("left");
      getMarkers();
    }
    if (e.key === "ArrowRight") {
      MoveMap("right");
      getMarkers();
    }

    if (e.key === "Enter") {
      m.route.set("/menuView");
    }

    if (e.key === "0") {
      const center = map.getCenter();
      const url = `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=${map.getZoom()}/${center.lat}/${center.lng}`;
      share(url);
    }

    if (e.key === "1") {
      let f = mainmarker.getLatLng();
      map.setView(f);
    }

    if (e.key === "2") {
      m.route.set("/searchView");
    }

    if (e.key === "3") {
      m.route.set("/routingView");
    }

    if (e.key === "4") {
      if (status.automapCenter) {
        status.automapCenter = false;
      } else {
        status.automapCenter = true;
        side_toaster("Map centered on your position", 3000);
      }
    }

    if (e.key === "5") {
      let center = map.getCenter();
      createPOIMarker(center.lat, center.lng, "", "").then((e) => {
        e.addTo(markersGroup);
      });
    }
    if (e.key === "#") {
      panToNextMarker();
    }

    if (e.key === "*") {
      caching_tiles();
    }

    localforage.getItem("tempTracking").then((e) => {
      if (e && e.length > 0) {
        let ask = confirm(
          "It looks like the tracking was interrupted unintentionally. If you want to continue, you can — would you like to?",
        );
        if (ask) {
          status.trackigData = e;
          status.tracking = true;
        } else {
          localforage.removeItem("tempTracking");
        }
      }
    });
  },

  oncreate: function () {
    bottom_bar("", "<img class='menu-button' src='assets/image/menu.svg'>", "");
    top_bar("", "", "");
    document.querySelector("#map-container").style.display = "block";

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        id: "mapView",

        onclick: () => {
          deviceorientation();
        },

        onremove: () => {
          if (settings.scale) status.scaleControl.remove();

          document.querySelector("#map-container").style.display = "none";
        },

        oncreate: (vnode) => {
          document.querySelector("#map-container").style.display = "block";

          //overpass
          setTimeout(() => {
            const query = window.location.hash.split("?")[1] || "";
            const params = new URLSearchParams(query);
            const poiQuery = params.get("poi");

            if (poiQuery) {
              loadPOIs(poiQuery);
            }

            const share = params.get("share");
            if (share) {
              console.log("share");
            }
          }, 1000);

          document
            .querySelector("#bottom-bar")
            .addEventListener("click", (e) => {
              if (e.target.classList == "option-button")
                m.route.set("/optionsView");

              if (e.target.classList == "menu-button") m.route.set("/menuView");
            });
        },
      },
      [
        m("div", { class: "row", id: "icon-bar" }, [
          status.notKaiOS
            ? m(
                "button",
                {
                  id: "follow-icon",
                  onclick: () => {
                    if (status.automapCenter) {
                      status.automapCenter = false;
                    } else {
                      status.automapCenter = true;
                      side_toaster("Map centered on your position", 3000);
                    }
                  },
                },
                Icon(Navigation),
              )
            : null,

          status.notKaiOS
            ? m(
                "button",
                {
                  id: "search-icon",
                  onclick: () => {
                    m.route.set("/searchView");
                  },
                },
                Icon(Search),
              )
            : null,

          status.notKaiOS
            ? m(
                "button",
                {
                  id: "add-marker",
                  onclick: () => {
                    let center = map.getCenter();
                    createPOIMarker(center.lat, center.lng, "", "").then(
                      (e) => {
                        e.addTo(markersGroup);
                        e.fire("click");
                      },
                    );
                  },
                },
                Icon(MapPinPlus),
              )
            : null,

          m("button", { id: "map-info" }, ""),
          m("button", { id: "info" }, ""),
        ]),

        m(MarkerModal, {
          data: this.markerData,
          onClose: () => {
            mapView.markerData = null;
            m.redraw();
          },
        }),

        m(
          "div",
          {
            id: "cross",
            oncreate: (vnode) => {
              if (!settings.crosshair) {
                vnode.dom.style.opacity = 0;
              }

              if (settings.scale) {
                let imperial_value = true;
                let metric_value = true;

                if (settings.measurement == "metric") {
                  imperial_value = false;
                  metric_value = true;
                } else {
                  imperial_value = true;
                  metric_value = false;
                }

                status.scaleControl = L.control
                  .scale({
                    maxWidth: 100,
                    metric: metric_value,
                    imperial: imperial_value,
                    updateWhenIdle: false,
                    position: "topleft",
                  })
                  .addTo(map);
              }
            },
          },
          [
            m("div", { id: "cross-inner" }, [
              m("div"),
              m("div"),
              m("div"),
              m("div"),
            ]),
          ],
        ),
      ],
    );
  },
};

/*/////////*/
/*MENU*/
/*/////////*/

var menuView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar("<img class='map-button' src='assets/image/map.svg'>", "", "");
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  view: function () {
    return m(
      "div",
      {
        class: "row panel not-scroll",
        id: "menu",
      },
      [
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/imageryView");
            },
            oncreate: (vnode) => {
              if (!status.notKaiOS) vnode.dom.focus();
            },
          },
          Icon(Layers),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/poiView");
            },
          },
          Icon(MapPin),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/searchView");
            },
          },
          Icon(Search),
        ),
        status.notKaiOS
          ? m(
              "button",
              {
                tabIndex: 0,
                class: "item col-xs-3",
                onclick: () => {
                  loadFiles();
                },
              },
              Icon(Upload),
            )
          : null,
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/filesView");
            },
          },
          Icon(Files),
        ),

        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/trackingView");
            },
          },
          Icon(Navigation),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/routingView");
            },
          },
          Icon(Route),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/settingsView");
            },
          },
          Icon(Settings),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/keyView");
            },
          },
          Icon(List),
        ),
        m(
          "button",
          {
            tabIndex: 0,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/aboutView");
            },
          },
          Icon(Info),
        ),
      ],
    );
  },
};

/*/////////*/
/*LAYERS*/
/*/////////*/

var imageryView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel",
        name: "Imagery",
        id: "imagery",
      },
      [
        m("div", [
          m("h2", "MAPS"),
          m(
            "div",
            basic_maps.map((e) => {
              let buttonClass = "";
              if (status.current_tilelayer == e.url) {
                buttonClass = "active";
              }

              return m(
                "button",
                {
                  tabIndex: 0,
                  class: buttonClass + " item",
                  onclick: () => {
                    addTilesLayer(e.url, e.maxzoom, e.attribution);
                    m.route.set("/mapView");
                  },
                },
                e.name,
              );
            }),
          ),
        ]),
        m("div", [
          m("h2", "LAYERS"),
          m("div", [
            m(
              "button",
              {
                oncreate: (vnode) => {
                  if (status.weatherlayer) {
                    vnode.dom.classList.add("active");
                  }
                },
                onclick: () => {
                  loadWeatherLayers();
                  status.weatherlayer = !true;
                  m.route.set("/mapView");
                },
                class: "item",
              },
              "Weather Radar",
            ),
            basic_layers.map((e) => {
              let buttonClass = "";
              if (status.current_overlayer == e.url) {
                buttonClass = "active";
              }

              return m(
                "button",
                {
                  class: buttonClass + " item",
                  onclick: () => {
                    addOverLayer(e.url, e.maxzoom, e.attribution);
                    m.route.set("/mapView");
                  },
                },
                e.name,
              );
            }),
          ]),
        ]),
      ],
    );
  },
};

/*/////////*/
/*OPTIONS*/
/*/////////*/

var optionsView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "options",
        id: "options",
        tabindex: 0,
      },
      [
        m("div", { class: "col-xs-8 col-md-3" }, [
          status.routeSelected
            ? m(
                "button",
                {
                  oncreate: (vnode) => {
                    vnode.dom.focus();
                    if (status.followRoute) {
                      vnode.dom.textContent = "Stop follow route";
                    }
                  },
                  class: "item",
                  onclick: () => {
                    followRoute();
                  },
                },
                "Follow route",
              )
            : null,
          status.routeSelected
            ? null
            : m(
                "button",
                {
                  oncreate: (vnode) => {},
                  class: "item",
                  onclick: () => {
                    storeMarker(status.selectedMarker);
                  },
                },
                "save",
              ),
          status.routeSelected
            ? null
            : m("button", { class: "item", onclick: () => {} }, "delete"),
          status.routeSelected
            ? m("div", [
                m("div", { class: "bold", style: "margin-top:10px" }, "Name"),
                m("div", status.loadFileData.name),
              ])
            : null,
          status.routeSelected
            ? m("div", [
                m(
                  "div",
                  {
                    class: "bold",
                  },
                  "Distance",
                ),
                m(
                  "div",
                  {
                    oncreate: (vnode) => {
                      if (settings.measurement == "imperial") {
                        vnode.dom.textContent =
                          (status.loadFileData.distance * 0.621371).toFixed(2) +
                          " mi";
                      } else {
                        vnode.dom.textContent =
                          status.loadFileData.distance.toFixed(2) + " km";
                      }
                    },
                  },
                  status.loadFileData.distance,
                ),
              ])
            : null,
        ]),
      ],
    );
  },
};

/*/////////*/
/*POI*/
/*/////////*/

var poiView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "Poi",
        id: "poi",
        tabindex: 0,
      },
      [
        m("div", { class: "col-xs-11 col-md-3" }, [
          m("h2", "POI"),

          m(
            "div",
            basic_pois
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e, i) =>
                m(
                  "button",
                  {
                    class: "item",
                    oncreate: (vnode) => {
                      if (i == 0) vnode.dom.focus();
                    },
                    onclick: () => {
                      const encodedQuery = encodeURIComponent(e.query);
                      m.route.set("/mapView?poi=" + encodedQuery);
                    },
                  },
                  e.name,
                ),
              ),
          ),
        ]),
      ],
    );
  },
};

/*/////////*/
/*FILES*/
/*/////////*/

var filesView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "Files",
        id: "files",
        tabindex: 0,
        oncreate: (vnode) => {
          if (!status.notKaiOS) vnode.dom.focus();
        },
      },
      [
        m("div", { class: "col-xs-12 col-md-3" }, [
          m("div", { class: "col-xs-12" }, [m("h2", "MARKERS")]),
          m("div", { class: "col-xs-12" }, [
            m("div", [
              markersLocal.length
                ? markersLocal.map((item, index) => {
                    return m(
                      "button",
                      {
                        class: "item",
                        tabIndex: 0,
                        oncreate: (vnode) => {
                          if (index == 0 && !status.notKaiOS) {
                            vnode.dom.focus();
                          }
                        },
                        onclick: () => {
                          const [lng, lat] = item.geometry.coordinates;
                          createPOIMarker(
                            lat,
                            lng,
                            item.properties.name,
                            item.properties.tags ?? {},
                            true,
                          ).then((e) => {
                            e.addTo(markersGroup);
                            map.setView([lat, lng], 14);
                            m.route.set("/mapView");
                          });
                        },
                      },
                      item.properties.name || "unknow",
                    );
                  })
                : m("div", { class: "small" }, "No markers stored"),
            ]),
          ]),

          !status.notKaiOS && status.kaiosGPX.length
            ? m("div", { class: "col-xs-12" }, [
                m("h2", "GPX"),
                m(
                  "div",
                  status.kaiosGPX.map((item) => {
                    return m(
                      "button",
                      {
                        class: "item",

                        oncreate: (vnode) => {
                          if (
                            status.loadedFiles.includes(item.split("/").pop())
                          ) {
                            vnode.dom.classList.add("activ");
                          }
                        },

                        onclick: (e) => {
                          const button = e.currentTarget;

                          if (button.classList.contains("activ")) {
                            button.classList.remove("activ");
                            if (gpxOverlayer) {
                              gpxOverlayer.clearLayers();
                            }
                            return;
                          }

                          get_file(item)
                            .then((data) => {
                              return data.text().then((gpxText) => {
                                displayGPX(gpxText).then(() => {
                                  m.route.set("/mapView");

                                  button.classList.add("activ");
                                  status.loadedFiles = [];
                                  status.loadedFiles.push(
                                    item.split("/").pop(),
                                  );
                                });
                              });
                            })

                            .catch((e) => {
                              side_toaster(e, 2000);
                            });
                        },
                      },
                      item.split("/").pop(),
                    );
                  }),
                ),
              ])
            : null,

          status.notKaiOS && status.gpxFiles.length
            ? m("div", { class: "col-xs-12" }, [
                m("h2", "GPX"),
                m(
                  "div",
                  status.gpxFiles.map((item) => {
                    if (item.source != "routing")
                      return m(
                        "button",
                        {
                          class: "item",
                          oncreate: (vnode) => {
                            if (status.loadedFiles.includes(item.name)) {
                              vnode.dom.classList.add("activ");
                            }
                          },
                          onclick: (e) => {
                            const button = e.currentTarget;

                            if (button.classList.contains("activ")) {
                              console.log("yes active");
                              button.classList.remove("activ");
                              status.loadedFiles = [];

                              if (gpxOverlayer) {
                                localforage.removeItem("last_gpx");
                                gpxOverlayer.clearLayers();
                              }
                              return;
                            }

                            displayGPX(item.data, false)
                              .then(() => {
                                button.classList.add("activ");
                                status.loadedFiles = [];
                                status.loadedFiles.push(item.name);
                                m.route.set("/mapView");
                              })
                              .catch((e) => {
                                console.error(e);
                                side_toaster("Could not be loaded", 3000);
                              });
                          },
                        },
                        item.name,
                      );
                  }),
                ),
              ])
            : null,

          status.notKaiOS && status.gpxFiles.length
            ? m("div", { class: "col-xs-12" }, [
                m("h2", "Routing"),
                m(
                  "div",
                  status.gpxFiles.map((item) => {
                    if (item.source == "routing")
                      return m(
                        "button",
                        {
                          class: "item",

                          oncreate: (vnode) => {
                            if (status.loadedFiles.includes(item.name)) {
                              vnode.dom.classList.add("activ");
                            }
                          },

                          onclick: (e) => {
                            const button = e.currentTarget;

                            if (button.classList.contains("activ")) {
                              console.log("yes active");

                              button.classList.remove("activ");
                              if (gpxOverlayer) {
                                console.log("removed");
                                localforage.removeItem("last_gpx");

                                gpxOverlayer.clearLayers();
                              }
                              return;
                            }

                            displayGPX(item.data, false)
                              .then(() => {
                                m.route.set("/mapView");
                                button.classList.add("activ");
                                status.loadedFiles = [];
                                status.loadedFiles.push(item.name);
                              })
                              .catch((e) => {
                                side_toaster("Could not be loaded", 3000);
                              });
                          },
                        },
                        item.name,
                      );
                  }),
                ),
              ])
            : null,

          !status.notKaiOS && status.kaiosGeoJSON.length
            ? m("div", { class: "col-xs-12" }, [
                m("h2", "GeoJSON"),
                m(
                  "div",
                  status.kaiosGeoJSON.map((item) => {
                    return m(
                      "button",
                      {
                        class: "item",
                        onclick: () => {
                          get_file(item).then((blob) => {
                            blob.text().then((text) => {
                              const geoJsonData = JSON.parse(text);

                              displayGeoJSONOnMap(geoJsonData, map, false);
                              m.route.set("/mapView");
                            });
                          });
                        },
                      },
                      item.split("/").pop(),
                    );
                  }),
                ),
              ])
            : null,

          m("div", { class: "col-xs-12" }, [
            m("h2", {}, "OSM FILES"),

            status.osmLogged
              ? m("div", [
                  status.osm_files.map((e) => {
                    return m(
                      "button",
                      {
                        class: "item",

                        oncreate: (vnode) => {
                          if (status.loadedFiles.includes(e.name)) {
                            vnode.dom.classList.add("activ");
                          }
                        },

                        onclick: (event) => {
                          const button = event.currentTarget;

                          if (button.classList.contains("activ")) {
                            button.classList.remove("activ");
                            if (gpxOverlayer) {
                              gpxOverlayer.clearLayers();
                              localforage.removeItem("last_gpx");
                            }
                            return;
                          }
                          osm_server_load_gpx(e.id, e.name).then((data) => {
                            displayGPX(data)
                              .then(() => {
                                m.route.set("/mapView");
                                button.classList.add("activ");
                                status.loadedFiles = [];
                                status.loadedFiles.push(e.name);
                              })
                              .catch((e) => {
                                side_toaster("Could not be loaded", 3000);
                              });
                          });
                        },
                      },
                      e.name,
                    );
                  }),
                ])
              : m(
                  "div",
                  { class: "small" },
                  "You are not logged in to your OpenStreetMap account",
                ),
          ]),
        ]),
      ],
    );
  },
};

/*/////////*/
/*TRACKING*/
/*/////////*/

var trackingView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "Tracking",
        id: "tracking",
        tabindex: 0,
      },
      [
        m("div", { class: "col-xs-11 col-md-3" }, [
          m(
            "button",
            {
              oncreate: (vnode) => {
                vnode.dom.focus();
              },
              onclick: () => {
                tracking();
              },
              class: "vip",
            },
            status.tracking ? "Stop" : "Start",
          ),

          m("div", { class: "row around-xs" }, [
            // Distance
            m("div", { class: "col-xs-6 col-sm-3 item" }, [
              m("div", [
                m("div", [
                  settings.measurement === "metric"
                    ? (status.trackingStats.distanceKm || 0) + " km"
                    : (status.trackingStats.distanceMiles || 0) + " mi",
                ]),
                m("div", "Distance"),
              ]),
            ]),

            // Duration
            m("div", { class: "col-xs-6 col-sm-3 item" }, [
              m("div", [
                m("div", status.trackingStats.durationFormatted),
                m("div", "Duration"),
              ]),
            ]),

            // Average Speed
            m("div", { class: "col-xs-6 col-sm-3 item" }, [
              m("div", [
                m("div", [
                  settings.measurement === "metric"
                    ? (status.trackingStats.averageSpeedKmh || 0) + " km/h"
                    : (status.trackingStats.averageSpeedMph || 0) + " mph",
                ]),
                m("div", "Ø Speed"),
              ]),
            ]),

            // Max Speed
            m("div", { class: "col-xs-6 col-sm-3 item" }, [
              m("div", [
                m("div", [
                  settings.measurement === "metric"
                    ? (status.trackingStats.maxSpeedKmh || 0) + " km/h"
                    : (status.trackingStats.maxSpeedMph || 0) + " mph",
                ]),
                m("div", "Max Speed"),
              ]),
            ]),
          ]),
        ]),
      ],
    );
  },
};

/*/////////*/
/*SEARCH*/
/*/////////*/

let searchView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        id: "search",

        onkeydown: (e) => {
          if (e.key === "Enter") {
            let lat = document.activeElement.getAttribute("data-lat");
            let lng = document.activeElement.getAttribute("data-lng");
            let text = document.activeElement.getAttribute("data-text");
            let tags = document.activeElement.getAttribute("data-tags");

            createPOIMarker(lat, lng, text, tags, true).then((e) => {
              e.addTo(markersGroup);
            });
            map.setView([lat, lng], 15);

            m.route.set("/mapView");
          }
        },
      },
      [
        m("div", { class: "col-xs-12 col-md-3" }, [
          m("div", { class: "item" }),
          m(SearchInput, {
            class: "col-xs-11",
            placeholder: "search",
            tabIndex: 0,
            oncreate: () => {
              document.querySelector("input").focus();
            },

            onSelect: (item) => {
              status.search_collection.unshift(item);
              localforage
                .setItem("search", status.search_collection)
                .then(() => {
                  // Warte kurz, bis das DOM aktualisiert ist, dann klick den Button
                  setTimeout(() => {
                    const firstButton = document.querySelector(
                      ".search-history button",
                    );
                    if (firstButton) {
                      firstButton.click();
                    }
                  }, 0);
                });
            },
          }),

          status.search_collection.length
            ? m("div", { class: "col-xs-12 search-history" }, [
                status.search_collection.map((e) => {
                  const handleAction = () => {
                    createPOIMarker(e.lat, e.lng, e.name, e.tags).then(
                      (marker) => {
                        marker.addTo(markersGroup);
                      },
                    );
                    map.setView([e.lat, e.lng], 14);
                    m.route.set("/mapView");
                  };

                  return m(
                    "button",
                    {
                      class: "item",
                      tabIndex: 0,
                      onclick: handleAction, // ← Hier direkt auf dem Button
                      onkeydown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.target.click(); // Triggert einfach den Click des fokussierten Elements
                        }
                      },
                    },
                    [m("h3", e.name), m("div", e.addresstype)],
                  );
                }),
              ])
            : null,
        ]),
      ],
    );
  },
};

/*/////////*/
/*ROUTING*/
/*/////////*/

var routingView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "Routing",
        id: "routing",
        tabindex: 0,
      },
      [
        m("div", { class: "col-xs-12 col-md-3" }, [
          // 🔹 PROFILE
          m("div", { class: "row center-xs" }, [
            m("div", { class: "col-xs-11" }, [
              m("h2", "Profile"),

              m("div", { class: "item input-parent", tabIndex: 0 }, [
                m("label", { for: "routing-profile" }, "choose profile"),

                m(
                  "select",
                  {
                    id: "routing-profile",
                    class: "select-box",
                    value: settings.routinge_profile || "foot-hiking",
                    onchange: (e) => {
                      settings.routinge_profile = e.target.value;
                    },
                  },
                  [
                    m(
                      "option",
                      { value: "cycling-mountain" },
                      "cycling-mountain",
                    ),
                    m("option", { value: "cycling-road" }, "cycling-road"),
                    m("option", { value: "foot-hiking" }, "foot-hiking"),
                    m("option", { value: "driving-car" }, "driving-car"),
                  ],
                ),
              ]),
            ]),
          ]),

          m("div", { class: "row center-xs" }, [
            m("div", { class: "col-xs-12" }, [
              m("label", "From"),
              m(SearchInput, {
                placeholder: "search from",
                onSelect: (item) => {
                  status.routingFrom = item;
                },
                oncreate: () => {
                  document.querySelector("input").focus();
                },
              }),
            ]),
          ]),

          m("div", { class: "row center-xs" }, [
            m("div", { class: "col-xs-12" }, [
              m("label", "To"),
              m(SearchInput, {
                placeholder: "search to",
                onSelect: (item) => {
                  status.routingTo = item;
                  let from = [status.routingFrom.lng, status.routingFrom.lat];
                  let to = [status.routingTo.lng, status.routingTo.lat];

                  ors(
                    from,
                    to,
                    process.env.ORS_KEY,
                    settings.routingProfile,
                  ).then((e) => {
                    let data = {
                      "from": status.routingFrom.name,
                      "to": status.routingTo.name,
                      "name":
                        status.routingFrom.name + "-" + status.routingTo.name,
                    };

                    displayGPX(e, true, "routing", data).then((e) => {
                      m.route.set("/mapView");
                    });
                  });
                },
              }),
            ]),
          ]),
        ]),
      ],
    );
  },
};

/*/////////*/
/*KEYS*/
/*/////////*/

var keyView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "Keys",
        id: "keys",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m(
          "div",
          { class: "col-xs-12 col-md-3" },

          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "0"),
            m("span", "share position"),
          ]),
          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "1"),
            m("span", "center map"),
          ]),
          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "2"),
            m("span", "search"),
          ]),

          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "3"),
            m("span", "Routing"),
          ]),

          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "4"),
            m("span", "Auto center map"),
          ]),

          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "5"),
            m("span", "set marker"),
          ]),
          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "*"),
            m("span", "download tiles"),
          ]),
          m("div", { class: "item row between-xs no-background-item" }, [
            m("kbd", { class: "col-xs-2" }, "#"),
            m("span", "select marker"),
          ]),
          m("div", {
            id: "KaiOSads-Wrapper",
            class: "",
            tabindex: 0,

            oncreate: () => {
              load_ads();
            },
          }),
        ),
      ],
    );
  },
};

/*/////////*/
/*ABOUT*/
/*/////////*/

var aboutView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.addEventListener("keydown", this.handler);

    document.querySelector("html").style.overflow = "scroll";
    document.querySelector("body").style.overflow = "scroll";
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "About",
        id: "about",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();
          document.querySelector("body").style.overflow = "scroll";
          document.querySelector("html").style.overflow = "scroll";
          document.querySelector("#app").style.overflow = "scroll";
        },
        onremove: () => {
          document.querySelector("body").style.overflow = "hidden";
          document.querySelector("html").style.overflow = "hidden";
          document.querySelector("#app").style.overflow = "hidden";
        },
      },
      [
        m("div", { class: "col-xs-9 col-md-3" }, [
          m("div", [
            "Various software and map data are used in this app, please note the licenses.",
            m("br"),
          ]),

          // Maps and Layers
          m("div", { style: "margin-top:10px" }, [
            m("h2", "Maps and Layers"),
            m(
              "div",
              m(
                "a",
                { href: "https://www.openstreetmap.org/copyright" },
                "OpenStreetMap®",
              ),
            ),
            m(
              "div",
              m("a", { href: "https://opentopomap.org" }, "opentopomap"),
            ),
            m(
              "div",
              m(
                "a",
                { href: "https://www.rainviewer.com/terms.html" },
                "waether layer data collected by rainviewer.com",
              ),
            ),
          ]),

          // License
          m("div", { style: "margin-top:10px" }, [
            m("h2", "License"),
            m(
              "div",
              m(
                "a",
                { href: "https://www.openstreetmap.org/copyright" },
                "OpenStreetMap®",
              ),
            ),
            m(
              "div",
              m(
                "a",
                {
                  href: "https://github.com/drolbr/Overpass-API/blob/master/COPYING",
                },
                "Overpass",
              ),
            ),
            m("div", ["o.map ", m("span", "UNLICENSE")]),
            m("div", ["Leaflet ", m("span", "BSD-2-Clause License")]),
            m("div", [
              "leaflet.tilelayer.pouchdbcached ",
              m("span", "MIT license"),
            ]),
            m("div", ["gpx.js ", m("span", "MIT License")]),
          ]),

          // Privacy Policy
          m("div", { style: "margin-top:10px" }, [
            m("h2", "Privacy Policy"),
            m(
              "div",
              "This software uses KaiAds if it was installed via the KaiOS store. This is a third party service that may collect information used to identify you. Pricacy policy of KaiAds.",
            ),
          ]),

          // Thank You
          m("div", { style: "margin-top:10px" }, [
            m("h2", "Thank You!"),
            m(
              "div",
              "I thank the people who provide this data and take care of their maintenance.",
            ),
          ]),
        ]),
      ],
    );
  },
};

/*/////////*/
/*SETTINGS*/
/*/////////*/

var settingsView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    const mapBtn = document.querySelector(".map-button");
    const menuBtn = document.querySelector(".menu-button");

    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        m.route.set("/mapView");
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        m.route.set("/menuView");
      });
    }

    document.addEventListener("keydown", this.handler);
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);

    localforage.setItem("settings", settings).then((value) => {
      settings = value;
    });
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel",
        name: "Settings",
        id: "settings",
      },
      [
        m(
          "div",
          {
            class: "settings-container row center-xs",
            style: "padding-bottom:200px",
          },
          [
            m("div", { class: "col-xs-12 col-md-3" }, [
              // ===== Crosshair =====
              m("section", [
                m("h2", "Crosshair"),
                m(
                  "label",
                  {
                    class: "item input-parent row middle-xs between-xs",
                    tabIndex: 0,
                    oncreate: (vnode) => {
                      setTimeout(() => {
                        vnode.dom.focus();
                      }, 1000);
                    },
                  },
                  [
                    m("div", { class: "label-text" }, "show crosshair ?"),
                    m("span", { class: "toggle" }, [
                      m("input", {
                        type: "checkbox",
                        checked: settings.crosshair,
                        onchange: (e) =>
                          (settings.crosshair = e.target.checked),
                      }),
                      m("span", { class: "slider" }),
                    ]),
                  ],
                ),
              ]),

              // ===== Scale =====
              m("section", [
                m("h2", "Scale"),
                m(
                  "label",
                  {
                    class: "item input-parent row middle-xs between-xs",
                    tabIndex: 0,
                  },
                  [
                    m("div", { class: "label-text" }, "show scale ?"),
                    m("span", { class: "toggle" }, [
                      m("input", {
                        type: "checkbox",
                        checked: settings.scale,
                        onchange: (e) => (settings.scale = e.target.checked),
                      }),
                      m("span", { class: "slider" }),
                    ]),
                  ],
                ),
              ]),

              // ===== Unit =====
              m("section", [
                m("h2", "Unit of measurement"),

                m("div", { class: "item input-parent", tabIndex: 0 }, [
                  m("label", { for: "measurement-unit" }, "choose unit system"),

                  m(
                    "select",
                    {
                      id: "measurement-unit",
                      class: "select-box",
                      value: settings.measurement,
                      onchange: (e) => {
                        settings.measurement = e.target.value;
                      },
                    },
                    [
                      m("option", { value: "metric" }, "metric"),
                      m("option", { value: "imperial" }, "imperial"),
                    ],
                  ),
                ]),
              ]),

              // ===== OSM =====

              m("section", [
                m("h2", "Openstreetmap"),
                !status.osmLogged
                  ? m(
                      "button",
                      {
                        class: "item",
                        tabIndex: 0,

                        oncreate: (vnode) => {},
                        onclick: () => {
                          OAuth_osm();
                        },
                      },
                      "Login",
                    )
                  : null,

                status.osmLogged
                  ? m(
                      "button",
                      {
                        class: "item",
                        tabIndex: 0,

                        onclick: () => {
                          localforage.removeItem("osm_user");
                          localforage.removeItem("osm_token");
                          status.osmLogged = false;
                          m.redraw();
                        },
                      },
                      "Logout",
                    )
                  : null,
              ]),

              // ===== Weather radar =====
              m("section", [
                m("h2", "Weather radar layer"),

                m("div", { class: "item input-parent", tabIndex: 0 }, [
                  m(
                    "label",
                    { for: "radar-time" },
                    "After what time to switch radar images?",
                  ),
                  m(
                    "select",
                    {
                      id: "radar-time",
                      class: "select-box",
                      value: settings.radarTime,
                      onchange: (e) => (settings.radarTime = e.target.value),
                    },
                    [
                      m("option", { value: "2000" }, "2 s"),
                      m("option", { value: "3000" }, "3 s"),
                      m("option", { value: "4000" }, "4 s"),
                    ],
                  ),
                ]),
              ]),

              // ===== Tracking =====
              m("section", { class: "" }, [
                m("h2", "Tracking"),
                m(
                  "label",
                  {
                    class: "item input-parent row middle-xs between-xs",
                    tabIndex: 0,
                  },
                  [
                    m(
                      "div",
                      { class: "label-text" },
                      "The screen should not be switched off during tracking ?",
                    ),
                    m("span", { class: "toggle" }, [
                      m("input", {
                        type: "checkbox",
                        checked: settings.screenlock,
                        onchange: (e) =>
                          (settings.screenlock = e.target.checked),
                      }),
                      m("span", { class: "slider" }),
                    ]),
                  ],
                ),
              ]),

              // ===== Routing =====
              m("section", { class: "", style: "margin-bottom:180px" }, [
                m("h2", "Routing"),
                m(
                  "label",
                  {
                    class: "item input-parent row middle-xs between-xs",
                    tabIndex: 0,
                  },
                  [
                    m(
                      "div",
                      { class: "label-text" },
                      "Receive notifications when following a route ?",
                    ),
                    m("span", { class: "toggle" }, [
                      m("input", {
                        type: "checkbox",
                        checked: settings.routingNotification,
                        onchange: (e) =>
                          (settings.routingNotification = e.target.checked),
                      }),
                      m("span", { class: "slider" }),
                    ]),
                  ],
                ),
              ]),
            ]),
          ],
        ),
      ],
    );
  },
};

//Routing

m.route(root, "/intro", {
  "/mapView": mapView,
  "/settingsView": settingsView,
  "/intro": intro,
  "/aboutView": aboutView,
  "/imageryView": imageryView,
  "/filesView": filesView,
  "/trackingView": trackingView,
  "/routingView": routingView,
  "/searchView": searchView,
  "/menuView": menuView,
  "/keyView": keyView,
  "/poiView": poiView,
  "/optionsView": optionsView,
});

document.addEventListener("DOMContentLoaded", function (e) {
  /////////////////
  ///NAVIGATION
  /////////////////

  let nav = function (move) {
    const active = document.activeElement;

    if (
      active.nodeName === "SELECT" ||
      active.type === "date" ||
      active.type === "time" ||
      active.classList.contains("scroll")
    ) {
      return false;
    }

    const items = Array.from(
      document.getElementById("app").querySelectorAll(".item"),
    );

    if (!items.length) return;

    let currentIndex = items.indexOf(active);
    console.log("currentIndex:", currentIndex, "active:", active);

    if (currentIndex === -1) currentIndex = 0;

    let next = currentIndex + move;

    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;

    const targetElement = items[next];

    if (targetElement) {
      targetElement.focus();
      scrollToCenter();
    }
  };

  function scrollToCenter() {
    var activeElement = document.activeElement;

    if (!activeElement) {
      return;
    }

    requestAnimationFrame(() => {
      var rect = activeElement.getBoundingClientRect();
      var scrollContainer = activeElement.parentNode;

      while (scrollContainer && scrollContainer !== document.body) {
        if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
          break;
        }
        scrollContainer = scrollContainer.parentNode;
      }

      if (
        scrollContainer &&
        scrollContainer !== document.body &&
        scrollContainer !== document.documentElement
      ) {
        var containerRect = scrollContainer.getBoundingClientRect();
        var relativeY =
          rect.top -
          containerRect.top +
          scrollContainer.scrollTop +
          rect.height / 2;

        scrollContainer.scrollTop =
          relativeY - scrollContainer.clientHeight / 2;
      } else {
        var targetY =
          window.pageYOffset +
          rect.top -
          window.innerHeight / 2 +
          rect.height / 2;

        window.scrollTo(0, targetY);
      }
    });
  }

  // ////////////////////////////
  // //KEYPAD HANDLER////////////
  // ////////////////////////////

  let isKeyDownHandled = false;

  document.addEventListener("keydown", function (event) {
    if (!isKeyDownHandled) {
      handleKeyDown(event); // Your keydown handler

      isKeyDownHandled = true;

      // Reset the flag after some time if needed, or based on your conditions
      setTimeout(() => {
        isKeyDownHandled = false;
      }, 300); // Optional timeout to reset the flag after a short delay
    }
  });

  let isKeyUpHandled = false;

  document.addEventListener("keyup", function (event) {
    if (!isKeyUpHandled) {
      handleKeyUp(event); // Your keydown handler

      isKeyUpHandled = true;

      // Reset the flag after some time if needed, or based on your conditions
      setTimeout(() => {
        isKeyUpHandled = false;
      }, 300); // Optional timeout to reset the flag after a short delay
    }
  });

  let longpress = false;
  const longpress_timespan = 2000;
  let timeout;

  function repeat_action(param) {
    switch (param.key) {
    }
  }

  //////////////
  ////LONGPRESS
  /////////////

  function longpress_action(param) {
    switch (param.key) {
      case "Backspace":
        window.close();
        break;
    }
  }

  // /////////////
  // //SHORTPRESS
  // ////////////

  function shortpress_action(param) {
    let r = m.route.get();

    switch (param.key) {
      case "ArrowUp":
        nav(-1);

        break;
      case "ArrowDown":
        nav(+1);
        break;

      case "Enter": {
        const el = document.activeElement;

        const container = el.closest(".input-parent");

        if (container) {
          const input = container.querySelector("input, select, textarea");

          if (!input) return;

          if (input.type === "checkbox") {
            input.checked = !input.checked;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }

          if (input.tagName === "SELECT") {
            input.focus();
            input.click();
          }
        }
        break;
      }
    }
  }

  /////////////////////////////////
  ////shortpress / longpress logic
  ////////////////////////////////

  function handleKeyDown(evt) {
    if (evt.key == "Backspace" && document.activeElement.tagName != "INPUT") {
      evt.preventDefault();
    }

    if (evt.key === "EndCall") {
      evt.preventDefault();
      window.close();
    }
    if (!evt.repeat) {
      longpress = false;
      timeout = setTimeout(() => {
        longpress = true;
        longpress_action(evt);
      }, longpress_timespan);
    }

    if (evt.repeat) {
      if (evt.key == "Backspace") evt.preventDefault();

      if (evt.key == "Backspace") longpress = false;

      repeat_action(evt);
    }
  }

  function handleKeyUp(evt) {
    if (evt.key == "Backspace") evt.preventDefault();

    if (status.visibility === false) return false;

    clearTimeout(timeout);
    if (!longpress) {
      shortpress_action(evt);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      status.visibility = true;
    } else {
      status.visibility = false;
    }
  });
});

window.addEventListener("online", () => {
  status.deviceOnline = true;
});
window.addEventListener("offline", () => {
  status.deviceOnline = false;
});

//webActivity KaiOS 3

try {
  navigator.serviceWorker
    .register(new URL("sw.js", import.meta.url), {
      type: "module",
    })
    .then((registration) => {
      console.log("Service Worker registered successfully.");

      // Check if a service worker is waiting to be activated
      if (registration.waiting) {
        console.log("A waiting Service Worker is already in place.");
        registration.update();
      }

      if ("b2g" in navigator) {
        // Subscribe to system messages if available
        if (registration.systemMessageManager) {
          registration.systemMessageManager.subscribe("activity").then(
            () => {
              console.log("Subscribed to general activity.");
            },
            (error) => {
              alert("Error subscribing to activity:", error);
            },
          );
        } else {
          alert("systemMessageManager is not available.");
        }
      }
    })
    .catch((error) => {
      alert("Service Worker registration failed:", error);
    });
} catch (e) {
  alert("Error during Service Worker setup:");
}

//redirect from openstreetmap

let oauthRedirect = async (code) => {
  const myHeaders = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
  });

  const urlencoded = new URLSearchParams({
    code: code,
    grant_type: "authorization_code",
    redirect_uri: "https://omap.strukturart.com/index.html",
    client_id: process.env.OSM_CLIENT_KEY,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow",
  };

  return fetch("https://www.openstreetmap.org/oauth2/token", requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      console.log(result);
      localforage.setItem("osm_token", result.access_token);

      return result;
    });
};

let app_launcher = () => {
  var currentUrl = window.location.href;

  if (!currentUrl.includes("code=")) {
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  let result = urlParams.get("code");

  if (!result) {
    return false;
  }

  if (status.notKaiOS) {
    oauthRedirect(result).then(() => {
      m.route.set("/settingsView");
      side_toaster("successfull", 3000);
    });
  } else {
    if (result) {
      try {
        const activity = new MozActivity({
          name: "omap-oauth",
          data: result,
        });
        activity.onsuccess = function () {
          console.log("Activity successfuly handled");
          window.close();
        };

        activity.onerror = function () {
          console.log("The activity encouter en error: " + this.error);
          alert(this.error);
        };
      } catch (e) {}
      if ("b2g" in navigator) {
        try {
          let activity = new WebActivity("omap-oauth", {
            name: "omap-oauth",
            type: "string",
            data: result,
          });
          activity.start().then(
            (rv) => {
              side_toaster("OK", 3000);
              setTimeout(() => {
                window.close();
              }, 2000);
            },
            (err) => {
              alert("Activity" + err);
              setTimeout(() => {
                window.close();
              }, 2000);
            },
          );
        } catch (e) {}
      }
    }
  }
};

try {
  navigator.mozSetMessageHandler("activity", function (activityRequest) {
    var option = activityRequest.source;

    if (option.name == "omap-oauth") {
      oauthRedirect(option.data).then(() => {
        m.route.set("/settingsView");
        side_toaster("successfull", 3000);
      });
    }
  });
} catch (e) {}

app_launcher();

//KaiOS3 handel openstreetmap oauth

sw_channel.addEventListener("message", (event) => {
  let result = event.data.oauth_success.data;

  oauthRedirect(result).then(() => {
    m.route.set("/settingsView");
    side_toaster("successfull", 3000);
  });
});
//reload detection
const isReload =
  performance && performance.navigation && performance.navigation.type === 1;

if (isReload) {
  status.wasReload = true;
  m.route.set("/intro");
  initMap();
}
