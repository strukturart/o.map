"use strict";

import {
  bottom_bar,
  side_toaster,
  load_ads,
  top_bar,
  getManifest,
  geolocation,
  setTabindex,
} from "./assets/js/helper.js";
import localforage from "localforage";
import m from "mithril";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import L from "leaflet";
import "swiped-events";
import { basic_maps, basic_layers, basic_pois } from "./assets/js/maps.js";
import "leaflet-gpx";
import * as turf from "@turf/turf";

import { v4 as uuidv4 } from "uuid";

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
} from "lucide";

import {
  osm_server_upload_gpx,
  osm_delete_gpx,
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

let _selectedMarker = null;

export let status = {
  debug: false,
  version: "",
  notKaiOS: true,
  trackigData: [],
  trackingStats: "",
  osm_files: [],
  selectedMarker: "",
  get selectedMarker() {
    return _selectedMarker;
  },

  set selectedMarker(value) {
    _selectedMarker = value;

    // 👉 dein watcher
    console.log("selectedMarker geändert:", value);
  },
};

let tilesLayer = null;
let overLayer = null;
let gpxOverlayer = null;
let geoJsonLayer = null;
let map = null;
let mainmarker = null;
let mainmarkerGroup = null;
let markersGroup = null;
let trackingLine;

let gpxLocalFiles = localforage.getItem("gpxLocalFiles").then((e) => {
  return e || [];
});

let markersLocal = [];
localforage.getItem("markersLocal").then((e) => {
  markersLocal = e || [];
});

let gpx_files = localforage.getItem("gpx_files").then((e) => {
  return e || [];
});

export let settings;

const DEFAULT_SETTINGS = {
  crosshair: true,
  scale: true,
  measurement: "metric",
  pastRadar: "0",
  forecastRadar: "0",
  radarTime: "1000",
  routingNotification: false,
  useOnlyCache: false,
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

const userAgent = navigator.userAgent || "";
if (userAgent && userAgent.includes("KAIOS")) {
  status.notKaiOS = false;
}

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
  status.osmLogged = true;
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
}

let getMarkers = async () => {
  // Get the current bounds of the map
  const bounds = map.getBounds();

  // Get the center of the map for distance calculations
  const mapCenter = map.getCenter();

  // Reset the list of markers in bounds
  status.markers_in_bounds = [];

  if (m.route.get() == "/mapView") {
    bottom_bar("", "<img class='menu-button' src='assets/image/menu.svg'>", "");
  }

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
  const markerLatLng = status.selectedMarker.getLatLng();

  // Open popup for the selected marker
  const popup = status.selectedMarker.getPopup();

  if (popup) {
    const content = popup.getContent();
    console.log(content);

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

  if (m.route.get() == "/mapView") {
    bottom_bar(
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
      "<img class='option-button' src='assets/image/option.svg'>",
    );
  }
}

//load files
let loadFiles = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".gpx,.geojson,.json";
  input.multiple = false;

  input.addEventListener("change", async (event) => {
    const files = event.target.files;

    for (let file of files) {
      try {
        const content = await file.text();
        const fileName = file.name;
        const fileType = file.name.split(".").pop().toLowerCase();

        if (fileType === "gpx") {
          try {
            displayGPX(content);
            side_toaster("File loaded", 2000);
          } catch (error) {
            console.error(`Fehler bei GPX-Konvertierung: ${fileName}`, error);
          }
        } else if (fileType === "geojson" || fileType === "json") {
          const geoJsonData = JSON.parse(content);
          displayGeoJSONOnMap(geoJsonData, map);
          side_toaster("File loaded", 2000);
        }
      } catch (error) {
        console.error(`Fehler beim Laden der Datei: ${file.name}`, error);
        side_toaster("File not loaded", 2000);
      }
    }
  });

  input.click();
};

//display GeoJSON
let displayGeoJSONOnMap = (geoJsonData, map) => {
  geoJsonLayer = L.geoJSON(geoJsonData, {
    style: (feature) => {
      return {
        color: feature.properties.color || "#3388ff",
        weight: feature.properties.weight || 2,
        opacity: feature.properties.opacity || 0.8,
        fillOpacity: feature.properties.fillOpacity || 0.2,
        dashArray: feature.properties.dashArray || null,
      };
    },

    // Marker
    pointToLayer: (feature, latlng) => {
      // Popup-Text
      let popupText = '<div style="max-width: 300px;">';

      if (feature.properties) {
        for (const [key, value] of Object.entries(feature.properties)) {
          popupText += `<p><strong>${key}:</strong> ${value}</p>`;
        }
      }

      popupText += "</div>";

      // Marker
      return createPOIMarker(latlng.lat, latlng.lng, popupText);
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
    },
  }).addTo(map);

  // Fit
  const bounds = geoJsonLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return geoJsonLayer;
};

//display GPX

let displayGPX = async (gpxString) => {
  return new Promise((resolve, reject) => {
    gpxOverlayer = new L.GPX(gpxString, {
      async: true,
      polyline_options: { color: "red" },
      markers: {
        startIcon: null,
        endIcon: null,
        wptIcons: {},
      },
    })
      .on("loaded", function (e) {
        const gpx = e.target;
        const latlngs = gpx.getLayers()[0].getLatLngs();
        if (!latlngs || latlngs.length === 0) {
          reject("Keine Koordinaten gefunden");
          return;
        }

        const start = latlngs[0];
        const end = latlngs[latlngs.length - 1];

        let startMarker = createStartMarker(start.lat, start.lng);
        startMarker.addTo(markersGroup);

        let endMarker = createEndMarker(end.lat, end.lng);
        endMarker.addTo(markersGroup);

        map.fitBounds(gpx.getBounds());

        resolve(); // ← Signalisiert, dass alles fertig ist
      })
      .on("error", function (e) {
        reject(e);
      })
      .addTo(map);
  });
};

//overpass pois
let poiGroup = null;
function loadPOIs(tag) {
  const b = map.getBounds().pad(0.2);

  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

  const query = `
    [out:json][timeout:25];
    node[${tag}](${bbox});
    out;
  `;

  const url =
    "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  fetch(url)
    .then(async (r) => {
      const text = await r.text();

      try {
        return JSON.parse(text);
      } catch (e) {
        side_toaster("data not loaded", 2000);
        console.error("Overpass returned non-JSON:", text);
        throw e;
      }
    })
    .then((data) => renderPOIs(data))
    .catch((err) => console.error("Overpass error:", err));
}

function renderPOIs(data) {
  poiGroup.clearLayers();
  data.elements.forEach((el) => {
    if (el.type !== "node") return;
    const name = el.tags?.name || el.tags?.amenity || "POI";
    const marker = createPOIMarker(el.lat, el.lon, name);
    marker.addTo(poiGroup);
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
    maxZoom: maxzoom,
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

  localforage.setItem("lastOverLayer", {
    url: url,
    maxzoom: maxzoom,
    attribution: attribution,
  });
  status.current_overlayer = url;
};
//create default marker
let createMarker = (lat, lng, popupText = "", customData) => {
  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: markerIcon,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });

  if (popupText != null && popupText !== "") {
    if (typeof popupText !== "string") {
      console.warn("Invalid popupText type:", popupText);
    }
    marker.bindPopup(popupText);
  }

  marker.feature = {
    type: "Feature",
    properties: {
      type: "default",
      popupText,
      customData,
    },
  };

  marker.on("click", (e) => {
    const { popupText, type, id } = e.target.feature.properties;
    console.log("POI Marker:", { type, popupText, id });
    status.selectedMarker = marker;

    bottom_bar(
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
      "<img class='option-button' src='assets/image/option.svg'>",
    );
  });

  return marker;
};

//create poi marker
let createPOIMarker = (lat, lng, popupText) => {
  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: markerPoi,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  }).bindPopup(popupText);

  marker.feature = {
    type: "Feature",
    properties: {
      type: "poi",
      id: uuidv4(),
      popupText,
    },
  };

  marker.on("click", (e) => {
    const { popupText, type, id } = e.target.feature.properties;
    console.log("POI Marker:", { type, popupText, id });
    status.selectedMarker = marker;

    bottom_bar(
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
      "<img class='option-button' src='assets/image/option.svg'>",
    );
  });

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

  marker.on("click", (e) => {});

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

  marker.on("click", (e) => {});

  return marker;
};

//tracking
let tracking = () => {
  if (status.tracking) {
    status.tracking = false;
  } else {
    status.tracking = true;
    side_toaster("tracking started", 2000);
  }
};
//store marker
let storeMarker = (data) => {
  const markerName = prompt("Name:", "New Marker");
  if (markerName === null) {
    side_toaster("Marker not stored", 2000);
    return;
  }

  const geoJsonData = data.toGeoJSON();
  geoJsonData.properties.name = markerName;
  geoJsonData.properties.id = uuidv4();

  markersLocal.push(geoJsonData);
  localforage
    .setItem("markersLocal", markersLocal)
    .then(() => {
      side_toaster("Marker '" + markerName + "' stored", 2000);
      m.route.set("/mapView");
    })
    .catch((error) => {
      console.error("Error storing marker:", error);
      side_toaster("Error storing marker", 2000);
    });
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

// Initialize the map and define the setup
const initMap = () => {
  map = L.map("map-container", {
    keyboard: true,
    zoomControl: false,
    minZoom: 3,
    worldCopyJump: true,
  });

  map.on("move", () => {
    // status.selectedMarker = "";
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

  map.setView([51.505, -0.09], 13);

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

  if (!status.notKaiOS) {
    setTimeout(() => {
      const attr = document.querySelector(".leaflet-control-attribution");
      if (attr) attr.style.display = "none";
    }, 0);
  }

  geolocation((e) => {
    if (!mainmarker) {
      mainmarker = L.marker([e.coords.latitude, e.coords.longitude], {
        draggable: false,
        icon: L.icon({
          iconUrl: markerIcon,
          shadowUrl: null,
          iconSize: [17, 27],
          iconAnchor: [9, 27],
          popupAnchor: [0, -14],
        }),
      }).addTo(mainmarkerGroup);
      setTimeout(() => {
        map.panTo([e.coords.latitude, e.coords.longitude], 16);
      }, 5000);
    }

    mainmarker.setLatLng([e.coords.latitude, e.coords.longitude]);

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

      if (status.tracking) {
        status.trackigData.push(point);
        console.log(JSON.stringify(status.trackigData));

        trackingLine.addLatLng([e.coords.latitude, e.coords.longitude]);

        status.trackingStats = analyzeTrack(status.trackigData);
      }
    }
  });
};

initMap();

////////////////
///VIEWS
///////////////

var root = document.getElementById("app");

///////////////
///INTRO//////
/////////////

var intro = {
  oninit: () => {
    key_delay();
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
            m.route.set("/mapView");
          }, 5000);
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

let mapView = {
  handler: function (e) {
    console.log(e);
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

    if (e.key === "2") {
      m.route.set("/searchView");
    }

    if (e.key === "5") {
      let center = map.getCenter();
      createPOIMarker(center.lat, center.lng, "", "").addTo(markersGroup);
    }
    if (e.key === "#") {
      panToNextMarker();
    }

    if (e.key === "*") {
      caching_tiles();
    }
  },

  oncreate: function () {
    bottom_bar("", "<img class='menu-button' src='assets/image/menu.svg'>", "");
    top_bar("", "", "");

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

        onremove: () => {
          if (settings.scale) status.scaleControl.remove();

          const center = map.getCenter();
          let mapState = {
            lat: center.lat,
            lng: center.lng,
            zoom: map.getZoom(),
          };

          localforage.setItem("lastPosition", mapState);

          document.querySelector("#map-container").style.display = "none";
        },

        oncreate: (vnode) => {
          document.querySelector("#map-container").style.display = "block";

          document
            .querySelector("#bottom-bar")
            .addEventListener("click", (e) => {
              console.log(e.target);
              if (e.target.classList == "option-button")
                m.route.set("/optionsView");
            });
        },
      },
      [
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
        class: "row panel",
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
          },
          Icon(Layers),
        ),
        m(
          "button",
          {
            tabIndex: 1,
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
            tabIndex: 2,
            class: "item col-xs-3",
            onclick: () => {
              m.route.set("/searchView");
            },
          },
          Icon(Search),
        ),
        m(
          "button",
          {
            tabIndex: 3,
            class: "item col-xs-3",
            onclick: () => {
              loadFiles();
            },
          },
          Icon(Upload),
        ),
        m(
          "button",
          {
            tabIndex: 4,
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
            tabIndex: 5,
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
            tabIndex: 6,
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
            tabIndex: 7,
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
            tabIndex: 8,
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
            tabIndex: 9,
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
        tabindex: 0,

        oncreate: (vnode) => {
          vnode.dom.focus();
        },

        onkeydown: (e) => {
          if (e.key === "ArrowRight") {
            m.route.set("/filesView");
          }
          if (e.key === "ArrowLeft") {
            m.route.set("/filesView");
          }
        },
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
                  class: buttonClass,
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
          m(
            "div",
            basic_layers.map((e) => {
              let buttonClass = "";
              if (status.current_overlayer == e.url) {
                buttonClass = "active";
              }

              return m(
                "button",
                {
                  class: buttonClass,
                  onclick: () => {
                    addOverLayer(e.url, e.maxzoom, e.attribution);
                    m.route.set("/mapView");
                  },
                },
                e.name,
              );
            }),
          ),
        ]),
      ],
    );
  },
};

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
        name: "Poi",
        id: "poi",
        tabindex: 0,

        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m("div", { class: "col-xs-8 col-md-3" }, [
          m(
            "button",
            {
              class: "item",
              onclick: () => {
                storeMarker(status.selectedMarker);
              },
            },
            "save",
          ),
          m("button", { class: "item", onclick: () => {} }, "delete"),
        ]),
      ],
    );
  },
};

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

        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m("div", { class: "col-xs-8 col-md-3" }, [
          m("h2", "POI"),
          m(
            "div",
            basic_pois.map((e) =>
              m(
                "button",
                {
                  onclick: () => {
                    loadPOIs(e.query);
                    m.route.set("/mapView");
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

var filesView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: function () {
    status.osm_files = [];

    osm_server_list_gpx()
      .then((files) => {
        status.osm_files = files;
        m.redraw();
      })
      .catch((error) => console.error("Failed:", error));

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
        name: "Files",
        id: "files",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m("div", [m("h2", "MARKERS")]),

        m("div", [
          m("div", [
            markersLocal.map((item, index) => {
              return m(
                "button",
                {
                  onclick: () => {
                    const [lng, lat] = item.geometry.coordinates;
                    createPOIMarker(lat, lng, item.properties.name)
                      .addTo(map)
                      .openPopup();

                    map.setView([lat, lng], 14);

                    m.route.set("/mapView");
                  },
                },
                item.properties.name,
              );
            }),
          ]),
        ]),

        m("div", [m("h2", "GPX")]),
        m("div", [
          m("h2", {}, "OSM FILES"),
          m("div", [
            status.osm_files.map((e) => {
              return m(
                "button",
                {
                  onclick: () => {
                    osm_server_load_gpx(e.id, e.name).then((data) => {
                      displayGPX(data)
                        .then(() => {
                          m.route.set("/mapView");
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
          ]),
        ]),
      ],
    );
  },
};

var trackingView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  onkeydown: (e) => {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    }

    if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
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

let searchView = {
  oninit: async () => {
    //cache last query
    const cachedResults = await localforage.getItem("search");
    const cachedQuery = await localforage.getItem("searchQuery");
    if (cachedResults) searchView.searchResults = cachedResults;
    if (cachedQuery) searchView.searchQuery = cachedQuery;
    m.redraw();
  },
  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
  },
  searchResults: [],
  searchQuery: "",
  selectedIndex: 0,

  search: async function (query) {
    if (query.length < 3) {
      this.searchResults = [];
      return;
    }

    this.searchQuery = query;
    await localforage.setItem("searchQuery", query);

    m.redraw();

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=json&limit=10`,
      );

      const data = await response.json();

      this.searchResults = data;
      this.selectedIndex = 0;

      await localforage.setItem("search", data);
    } catch (error) {
      console.error("Search error:", error);
    }

    m.redraw();
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel search-panel row center-xs",
        id: "search",
        oncreate: (vnode) => {
          key_delay();

          bottom_bar(
            "<img class='map-button' src='assets/image/map.svg'>",
            "",
            "<img class='menu-button' src='assets/image/menu.svg'>",
          );
          top_bar("", "", "");

          document
            .querySelector(".map-button")
            .addEventListener("click", () => {
              m.route.set("/mapView");
            });

          document
            .querySelector(".menu-button")
            .addEventListener("click", () => {
              m.route.set("/menuView");
            });
        },

        onkeydown: (e) => {
          if (e.key === "Enter") {
            let lat = document.activeElement.getAttribute("data-lat");
            let lng = document.activeElement.getAttribute("data-lng");
            let text = document.activeElement.getAttribute("data-text");

            let marker = createPOIMarker(lat, lng, text);
            map.setView([lat, lng], 15);

            marker.addTo(map);
            m.route.set("/mapView");
          }

          if (e.key === "SoftLeft" || e.key === "Control") {
            m.route.set("/mapView");
          }

          if (e.key === "SoftRight" || e.key === "Alt") {
            m.route.set("/menuView");
          }
        },
      },
      [
        m("div", { class: "col-xs-10 col-md-3" }, [
          m("input", {
            type: "search",
            placeholder: "search",
            class: "item",
            value: searchView.searchQuery,
            tabIndex: 0,
            oninput: (e) => {
              searchView.searchQuery = e.target.value;
              searchView.search(e.target.value);
            },
            oncreate: (vnode) => {
              vnode.dom.focus();
              localforage.getItem("search").then((data) => {
                searchView.searchResults = data;
              });
            },
          }),

          // Results
          m(
            "div",
            { class: "search-results" },
            (() => {
              return searchView.searchResults.length > 0
                ? searchView.searchResults.map((result, index) => {
                    return m(
                      "div",
                      {
                        "data-lat": result.lat,
                        "data-lng": result.lon,
                        "data-text": result.name,

                        tabIndex: index + 1,
                        class: "item result-item",
                        onclick: () => {
                          let lat =
                            document.activeElement.getAttribute("data-lat");
                          let lng =
                            document.activeElement.getAttribute("data-lng");
                          let text =
                            document.activeElement.getAttribute("data-text");

                          let marker = createPOIMarker(lat, lng, text);
                          map.setView([lat, lng], 15);

                          marker.addTo(map);
                          m.route.set("/mapView");
                        },
                      },
                      [
                        m(
                          "h3",
                          { class: "result-name" },
                          result.name || "Unnamed",
                        ),
                        m("div", { class: "" }, result.display_name),
                      ],
                    );
                  })
                : searchView.searchQuery.length >= 3
                  ? m("div", { class: "no-results" }, "")
                  : m("div", { class: "hint" }, "");
            })(),
          ),
        ]),
      ],
    );
  },
};

var routingView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  onkeydown: (e) => {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    }

    if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel",
        name: "Files",
        id: "files",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();
        },

        onkeydown: (e) => {
          if (e.key === "ArrowRight") {
            m.route.set("/imageryView");
          }
          if (e.key === "ArrowLeft") {
            m.route.set("/imageryView");
          }
        },
      },
      [
        m("div", [m("h2", "TRACKS & Markers")]),
        m("div", [m("h2", "GPX")]),
        m("div", [m("h2", "OSM SERVER GPX")]),
      ],
    );
  },
};

var keyView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  onkeydown: (e) => {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    }

    if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
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
          { class: "col-xs-10 col-md-3" },
          m("div", { class: "item row between-xs" }, [
            m("kbd", { class: "col-xs-1" }, "2"),
            m("span", "search"),
          ]),

          m("div", { class: "item row between-xs" }, [
            m("kbd", { class: "col-xs-1" }, "5"),
            m("span", "set marker"),
          ]),
          m("div", { class: "item row between-xs" }, [
            m("kbd", { class: "col-xs-1" }, "*"),
            m("span", "download tiles"),
          ]),
          m("div", { class: "item row between-xs" }, [
            m("kbd", { class: "col-xs-1" }, "#"),
            m("span", "select marker"),
          ]),
        ),
      ],
    );
  },
};

var aboutView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
  },

  onremove: function () {
    document.removeEventListener("keydown", this.handler);
  },

  onkeydown: (e) => {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    }

    if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },
  view: function () {
    return m(
      "div",
      {
        class: "panel row center-xs",
        name: "About",
        id: "about",
        tabindex: 0,
        oncreate: (vnode) => vnode.dom.focus(),
        onkeydown: (e) => {},
      },
      [
        m("div", { class: "col-xs-9" }, [
          m("div", [
            "Various software and map data are used in this app, please note the licenses.",
            m("br"),
          ]),

          // Maps and Layers
          m("div", [
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
          m("div", [
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
          m("div", [
            m("h2", "Privacy Policy"),
            m(
              "div",
              "This software uses KaiAds if it was installed via the KaiOS store. This is a third party service that may collect information used to identify you. Pricacy policy of KaiAds.",
            ),
          ]),

          // Thank You
          m("div", [
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

var settingsView = {
  handler: function (e) {
    if (e.key === "SoftLeft" || e.key === "Control") {
      m.route.set("/mapView");
    } else if (e.key === "SoftRight" || e.key === "Alt") {
      m.route.set("/menuView");
    }
  },

  oncreate: () => {
    bottom_bar(
      "<img class='map-button' src='assets/image/map.svg'>",
      "",
      "<img class='menu-button' src='assets/image/menu.svg'>",
    );
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });

    document.querySelector(".menu-button").addEventListener("click", () => {
      m.route.set("/menuView");
    });
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
        m("div", { class: "settings-container row center-xs" }, [
          m("div", { class: "col-xs-12 col-md-6 col-xs-center" }, [
            // ===== Crosshair =====
            m("section", [
              m("h2", "Crosshair"),
              m(
                "label",
                { class: "item input-parent row middle-xs between-xs" },
                [
                  m("div", { class: "label-text" }, "show crosshair ?"),
                  m("span", { class: "toggle" }, [
                    m("input", {
                      type: "checkbox",
                      checked: settings.crosshair,
                      onchange: (e) => (settings.crosshair = e.target.checked),
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
                { class: "item input-parent row middle-xs between-xs" },
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

              m("div", { class: "item input-parent" }, [
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
              m(
                "button",
                {
                  oncreate: (vnode) => {
                    if (status.osmLogged) {
                      vnode.dom.remove();
                    }
                  },
                  onclick: () => {
                    OAuth_osm();
                  },
                },
                "Login",
              ),

              m(
                "button",
                {
                  oncreate: (vnode) => {
                    if (!status.osmLogged) {
                      vnode.dom.remove();
                    }
                  },
                  onclick: () => {
                    localforage.removeItem("osm_user");
                    localforage.removeItem("osm_token");
                  },
                },
                "Logout",
              ),
            ]),

            // ===== Weather radar =====
            m("section", [
              m("h2", "Weather radar layer"),

              m("div", { class: "item input-parent" }, [
                m(
                  "label",
                  { for: "past-radar" },
                  "How many PAST radar images to display?",
                ),
                m(
                  "select",
                  {
                    id: "past-radar",
                    class: "select-box",
                    value: settings.pastRadar,
                    onchange: (e) => (settings.pastRadar = e.target.value),
                  },
                  [
                    m("option", { value: "0" }, "0"),
                    m("option", { value: "1" }, "1"),
                    m("option", { value: "2" }, "2"),
                    m("option", { value: "3" }, "3"),
                    m("option", { value: "4" }, "4"),
                    m("option", { value: "5" }, "5"),
                    m("option", { value: "6" }, "6"),
                    m("option", { value: "7" }, "7"),
                    m("option", { value: "8" }, "8"),
                    m("option", { value: "9" }, "9"),
                    m("option", { value: "10" }, "10"),
                    m("option", { value: "12" }, "12"),
                  ],
                ),
              ]),

              m("div", { class: "item input-parent" }, [
                m(
                  "label",
                  { for: "forecast-radar" },
                  "How many FORECAST radar images to display?",
                ),
                m(
                  "select",
                  {
                    id: "forecast-radar",
                    class: "select-box",
                    value: settings.forecastRadar,
                    onchange: (e) => (settings.forecastRadar = e.target.value),
                  },
                  [
                    m("option", { value: "0" }, "0"),
                    m("option", { value: "1" }, "1"),
                    m("option", { value: "2" }, "2"),
                    m("option", { value: "3" }, "3"),
                  ],
                ),
              ]),

              m("div", { class: "item input-parent" }, [
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
                    m("option", { value: "200" }, "200 ms"),
                    m("option", { value: "500" }, "500 ms"),
                    m("option", { value: "750" }, "750 ms"),
                    m("option", { value: "1000" }, "1 s"),
                    m("option", { value: "1500" }, "1.5 s"),
                    m("option", { value: "2000" }, "2 s"),
                    m("option", { value: "3000" }, "3 s"),
                    m("option", { value: "4000" }, "4 s"),
                  ],
                ),
              ]),
            ]),

            // ===== Network / Cache =====
            m("section", [
              m("h2", "Offline map"),
              m(
                "label",
                { class: "item input-parent row middle-xs between-xs" },
                [
                  m(
                    "div",
                    { class: "label-text" },
                    "only show the offline map ?",
                  ),
                  m("span", { class: "toggle" }, [
                    m("input", {
                      type: "checkbox",
                      checked: settings.useOnlyCache,
                      onchange: (e) =>
                        (settings.useOnlyCache = e.target.checked),
                    }),
                    m("span", { class: "slider" }),
                  ]),
                ],
              ),
            ]),

            // ===== Tracking =====
            m("section", [
              m("h2", "Tracking"),
              m(
                "label",
                { class: "item input-parent row middle-xs between-xs" },
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
                      onchange: (e) => (settings.screenlock = e.target.checked),
                    }),
                    m("span", { class: "slider" }),
                  ]),
                ],
              ),
            ]),
          ]),
        ]),
      ],
    );
  },
};

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

function scrollToCenter() {
  const activeElement = document.activeElement;
  if (!activeElement) return;

  const rect = activeElement.getBoundingClientRect();
  let elY = rect.top + rect.height / 2;

  let scrollContainer = activeElement.parentNode;

  // Find the first scrollable parent
  while (scrollContainer) {
    if (
      scrollContainer.scrollHeight > scrollContainer.clientHeight ||
      scrollContainer.scrollWidth > scrollContainer.clientWidth
    ) {
      // Calculate the element's offset relative to the scrollable parent
      const containerRect = scrollContainer.getBoundingClientRect();
      elY = rect.top - containerRect.top + rect.height / 2;
      break;
    }
    scrollContainer = scrollContainer.parentNode;
  }

  if (scrollContainer) {
    scrollContainer.scrollBy({
      left: 0,
      top: elY - scrollContainer.clientHeight / 2,
      behavior: "smooth",
    });
  } else {
    // If no scrollable parent is found, scroll the document body
    document.body.scrollBy({
      left: 0,
      top: elY - window.innerHeight / 2,
      behavior: "smooth",
    });
  }
}

let scrollToTop = () => {
  document.body.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });

  document.documentElement.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });
};

document.addEventListener("onbeforeunload", function (e) {
  cache_search();
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

  // ////////////////////////////
  // //KEYPAD HANDLER////////////
  // ////////////////////////////

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
    }
  }

  // ///////////////////////////////
  // //shortpress / longpress logic
  // //////////////////////////////

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
  console.error("Error during Service Worker setup:", e);
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
    setTimeout(() => {
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
              window.close();
              console.log(rv);
            },
            (err) => {
              alert(err);
            },
          );
        } catch (e) {}
      }
    }, 4000);
  }
};

try {
  navigator.mozSetMessageHandler("activity", function (activityRequest) {
    var option = activityRequest.source;

    if (option.name == "omap-oauth") {
      oauthRedirect(option.data);
    }
  });
} catch (e) {}

app_launcher();

//KaiOS3 handel mastodon oauth
sw_channel.addEventListener("message", (event) => {
  let result = event.data.oauth_success;
});
//reload detection
const isReload =
  performance && performance.navigation && performance.navigation.type === 1;

if (isReload) {
  status.wasReload = true;
  console.log("was reload");
  // m.route.set("/intro");
  //  initMap();
}
