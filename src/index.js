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
import L from "leaflet";
import "swiped-events";
import { basic_maps, basic_layers, basic_pois } from "./assets/js/maps.js";
import "leaflet-gpx";
import * as turf from "@turf/turf";

import { createElement, Files, Upload } from "lucide";

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

export let status = {
  debug: false,
  version: "",
  notKaiOS: true,
  selected_marker: "",
  trackigData: [],
  trackingStats: "",
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

export let settings;

localforage.getItem("settings").then((value) => {
  if (value === null) {
    settings = {};
    localforage.setItem("settings", settings);
  } else {
    settings = value;
    localforage.setItem("settings", value);
  }
});

let cache_search = () => {
  localforage.setItem("articles", articles);
};

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

//kaios button delay
let key_delay = () => {
  setTimeout(() => {
    status.viewReady = true;
  }, 1500);

  top_bar("", "", "");
  bottom_bar("", "", "");
};

//zoom
function ZoomMap(in_out) {
  if (!map) return;
  if (in_out === "in") {
    map.zoomIn();
  } else if (in_out === "out") {
    map.zoomOut();
  }
}

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

  // Iterate over all layers on the map
  map.eachLayer(function (layer) {
    console.log(layer);
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

  console.log(status.markers_in_bounds.length);
  // Return the markers in bounds
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
  const selectedMarker = markers[currentMarkerIndex];
  const markerLatLng = selectedMarker.getLatLng();

  // Open popup for the selected marker
  selectedMarker.openPopup();
  status.selected_marker_cragId = selectedMarker.options.id;

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

  selectedMarker.getElement().classList.add("selected-marker");

  previousMarkerIndex = currentMarkerIndex; // Update the previous marker index
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

let displayGPX = (gpxString) => {
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
      if (!latlngs || latlngs.length === 0) return;

      const start = latlngs[0];
      const end = latlngs[latlngs.length - 1];

      let startMarker = createStartMarker(start.lat, start.lng);
      startMarker.addTo(markersGroup);

      let endMarker = createEndMarker(end.lat, end.lng);
      endMarker.addTo(markersGroup);

      map.fitBounds(gpx.getBounds());
    })
    .addTo(map);
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

//create poi marker
function createPOIMarker(lat, lng, popupText) {
  return L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: markerPoi,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  }).bindPopup(popupText || "POI");
}

//create start marker
function createStartMarker(lat, lng) {
  return L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: startIcon,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });
}

//create end marker
function createEndMarker(lat, lng) {
  return L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: endIcon,
      shadowUrl: null,
      iconSize: [17, 27],
      iconAnchor: [9, 27],
      popupAnchor: [0, -14],
    }),
  });
}

//tracking
let tracking = () => {
  if (status.tracking) {
    status.tracking = false;
  } else {
    status.tracking = true;
    side_toaster("tracking started", 2000);
  }
};

function analyzeTrack(trackingData) {
  const geoJSONLine = turf.lineString(
    trackingData.map((p) => [p.longitude, p.latitude]),
  );

  const distanceMeters = turf.length(geoJSONLine, { units: "meters" });
  const distanceKm = turf.length(geoJSONLine, { units: "kilometers" });
  const distanceMiles = turf.length(geoJSONLine, { units: "miles" });

  const duration =
    (trackingData[trackingData.length - 1].timestamp -
      trackingData[0].timestamp) /
    1000; // Sekunden
  const avgSpeed = (distanceMeters / duration).toFixed(2); // m/s

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
    durationSeconds: duration.toFixed(0),
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

// Initialize the map and define the setup
const initMap = () => {
  map = L.map("map-container", {
    keyboard: true,
    zoomControl: false,
    minZoom: 3,
    worldCopyJump: true,
  });

  localforage.getItem("lastTilesLayer").then((e) => {
    if (e.url) {
      addTilesLayer(e.url, e.maxzoom, e.attribution);
    } else {
      addTilesLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        19,
        "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      );
    }
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
        console.log(status.trackingStats);
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

        oncreate() {
          setTimeout(() => {
            m.route.set("/mapView");
          }, 5000);
        },

        oninit: function () {},
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
  view: function () {
    return m(
      "div",
      {
        id: "",

        onremove: () => {
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

          document.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              m.route.set("/menuView");
            }

            if (e.key === "2") {
              m.route.set("/searchView");
            }

            if (e.key === "3") {
              loadFiles();
            }
            if (e.key === "4") {
              panToNextMarker();
            }
          });

          bottom_bar(
            "",
            "<img class='menu-button' src='assets/image/menu.svg'>",
            "",
          );

          if (status.notKaiOS) {
            top_bar("", "", "");

            document
              .querySelector(".search-button")
              .addEventListener("click", () => {
                m.route.set("/searchView");
              });
          }
        },
      },
      [
        m("div", { id: "cross" }, [
          m("div", { id: "cross-inner" }, [
            m("div"),
            m("div"),
            m("div"),
            m("div"),
          ]),
        ]),
      ],
    );
  },
};

var menuView = {
  oncreate: () => {
    bottom_bar("<img class='map-button' src='assets/image/map.svg'>", "", "");
    top_bar("", "", "");

    document.querySelector(".map-button").addEventListener("click", () => {
      m.route.set("/mapView");
    });
  },
  view: function () {
    return m("div", { class: "row panel", id: "menu" }, [
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
            m.route.set("/keysView");
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
    ]);
  },
};

var imageryView = {
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

var poiView = {
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
  view: function () {
    return m(
      "div",
      {
        class: "panel",
        name: "Poi",
        id: "poi",
        tabindex: 0,

        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m("div", [
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
        m("div", [m("h2", "GPX")]),
        m("div", [m("h2", "OSM SERVER GPX")]),
      ],
    );
  },
};

var trackingView = {
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
  view: function () {
    return m(
      "div",
      {
        class: "panel",
        name: "Files",
        id: "files",
        tabindex: 0,
      },
      [
        m(
          "button",
          {
            oncreate: (vnode) => {
              vnode.dom.focus();
            },
            onclick: () => {
              tracking();
            },
          },
          "Start tracking",
        ),
        m("div", { class: "tracking-stats" }, [
          // Distanz
          m("div", { class: "row" }, [
            m("div", { class: "col-xs-4" }, "Distance"),

            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.distanceKm + " km",
            ),
            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.distanceMiles + " mi",
            ),
          ]),

          // Dauer
          m("div", { class: "row" }, [
            m("div", { class: "col-xs-4" }, "Duration"),
            m("div", { class: "col-xs-8" }, 0),
          ]),

          // Durchschnittsgeschwindigkeit
          m("div", { class: "row" }, [
            m("div", { class: "col-xs-4" }, "Ø Speed"),

            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.averageSpeedKmh + " km/h",
            ),
            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.averageSpeedMph + " mph",
            ),
          ]),

          // Höchstgeschwindigkeit
          m("div", { class: "row" }, [
            m("div", { class: "col-xs-4" }, "Max Speed"),

            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.maxSpeedKmh + " km/h",
            ),
            m(
              "div",
              { class: "col-xs-2" },
              status.trackingStats.maxSpeedMph + " mph",
            ),
          ]),
        ]),
      ],
    );
  },
};

let searchView = {
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
  loading: false,
  selectedIndex: 0,

  search: async function (query) {
    if (query.length < 3) {
      this.searchResults = [];
      return;
    }

    this.searchQuery = query;

    const cached = await localforage.getItem("search");
    if (cached) {
      this.searchResults = cached;
      this.selectedIndex = 0;
      m.redraw();
    }

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

    this.loading = false;
    m.redraw();
  },

  selectResult: function (result) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Zoom zur gefundenen Position
    map.setView([lat, lng], 15);

    // Marker erstellen
    const marker = createPOIMarker(lat, lng, result.display_name);
    marker.addTo(map);

    m.route.set("/mapView");
  },

  view: function () {
    return m(
      "div",
      {
        class: "panel search-panel item",
        id: "search",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();

          key_delay();
        },

        onkeydown: (e) => {
          if (e.key === "ArrowRight") {
            if (
              document.activeElement.tagName !== "INPUT" ||
              vode.dom.value === ""
            ) {
              m.route.set("/mapView");
            }
          }
          if (e.key === "ArrowLeft") {
            if (
              document.activeElement.tagName !== "INPUT" ||
              vode.dom.value === ""
            ) {
              m.route.set("/mapView");
            }
          }

          // Navigation durch Ergebnisse
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (
              searchView.selectedIndex <
              searchView.searchResults.length - 1
            ) {
              searchView.selectedIndex++;
            }
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (searchView.selectedIndex > 0) {
              searchView.selectedIndex--;
            }
          }

          if (e.key === "Enter" && searchView.searchResults.length > 0) {
            e.preventDefault();
            searchView.selectResult(
              searchView.searchResults[searchView.selectedIndex],
            );
          }
        },
      },
      [
        m("input", {
          type: "search",
          placeholder: "search",
          value: searchView.searchQuery,
          oninput: (e) => {
            searchView.searchQuery = e.target.value;
            searchView.search(e.target.value);
          },
          oncreate: (vnode) => {
            vnode.dom.focus();
          },
        }),

        // Results
        m(
          "div",
          { class: "search-results" },
          (() => {
            console.log("Result:", searchView.searchResults);

            return searchView.searchResults.length > 0
              ? searchView.searchResults.map((result, index) => {
                  return m(
                    "div",
                    {
                      tabIndex: index + 1,
                      class: `item result-item ${
                        index === searchView.selectedIndex ? "selected" : ""
                      }`,
                      onclick: () => {
                        searchView.selectResult(result);
                      },
                    },
                    [
                      m(
                        "div",
                        { class: "result-name" },
                        result.name || "Unnamed",
                      ),
                      m(
                        "div",
                        { class: "result-address" },
                        result.display_name.substring(0, 60) + "...",
                      ),
                    ],
                  );
                })
              : searchView.searchQuery.length >= 3
                ? m("div", { class: "no-results" }, "Keine Ergebnisse gefunden")
                : m(
                    "div",
                    { class: "hint" },
                    "Mindestens 3 Zeichen eingeben zum Suchen",
                  );
          })(),
        ),
      ],
    );
  },
};

var routingView = {
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

var aboutView = {
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

var settingsView = {
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
    if (
      document.activeElement.nodeName == "SELECT" ||
      document.activeElement.type == "date" ||
      document.activeElement.type == "time" ||
      document.activeElement.classList.contains("scroll")
    )
      return false;

    const currentIndex = document.activeElement.tabIndex;

    let next = currentIndex + move;

    let items = 0;

    items = document.getElementById("app").querySelectorAll(".item");
    console.log("u" + items);

    if (document.activeElement.parentNode.classList.contains("input-parent")) {
      document.activeElement.parentNode.focus();
      return true;
    }

    let targetElement = 0;

    if (next <= items.length) {
      targetElement = items[next];
      targetElement.focus();
    }

    if (next >= items.length) {
      targetElement = items[0];
      targetElement.focus();
    }

    scrollToCenter();
  };

  // Add click listeners to simulate key events
  document
    .querySelector("div#bottom-bar div.button-left")
    .addEventListener("click", function (event) {
      simulateKeyPress("SoftLeft");
    });

  document
    .querySelector("div#bottom-bar div.button-right")
    .addEventListener("click", function (event) {
      simulateKeyPress("SoftRight");
    });

  document
    .querySelector("div#bottom-bar div.button-center")
    .addEventListener("click", function (event) {
      simulateKeyPress("Enter");
    });

  // Function to simulate key press events
  function simulateKeyPress(k) {
    shortpress_action({ key: k });
  }

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
      case "ArrowRight":
        if (r.startsWith("/mapView")) {
          MoveMap("right");
        }

        break;

      case "ArrowLeft":
        if (r.startsWith("/mapView")) {
          MoveMap("left");
        }
        break;
      case "ArrowUp":
        if (r.startsWith("/mapView")) {
          MoveMap("up");
        } else {
          nav(-1);
        }

        break;
      case "ArrowDown":
        if (r.startsWith("/mapView")) {
          MoveMap("down");
        } else {
          nav(+1);
        }

        break;

      case "SoftRight":
      case "Alt":
        if (r.startsWith("/map")) {
          ZoomMap("out");
        }

        break;

      case "SoftLeft":
      case "Control":
        if (r.startsWith("/map")) {
          ZoomMap("in");
        }

        break;

      case "Enter":
        if (document.activeElement.classList.contains("input-parent")) {
          document.activeElement.children[0].focus();
        }

        if (r.startsWith("/map")) {
          m.route.set("/menuView");
        }

        break;

      case "#":
        break;

      case "Backspace":
        if (r.startsWith("/mapView")) {
          m.route.set("/start", { "search": "" });
        }

        if (r.startsWith("/imagery")) {
          m.route.set("/mapView");
        }

        break;
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

//KaiOS3 handel mastodon oauth
sw_channel.addEventListener("message", (event) => {
  let result = event.data.oauth_success;

  if (result) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    var urlencoded = new URLSearchParams();
    urlencoded.append("code", result);
    urlencoded.append("scope", "read");

    urlencoded.append("grant_type", "authorization_code");
    urlencoded.append("redirect_uri", process.env.redirect);
    urlencoded.append("client_id", process.env.clientId);
    urlencoded.append("client_secret", process.env.clientSecret);

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    fetch(settings.mastodon_server_url + "/oauth/token", requestOptions)
      .then((response) => response.json()) // Parse the JSON once
      .then((data) => {
        settings.mastodon_token = data.access_token; // Access the token
        localforage.setItem("settings", settings);
        m.route.set("/start?index=0");

        side_toaster("Successfully connected", 10000);
      })
      .catch((error) => {
        console.error("Error:", error);
        side_toaster("Connection failed");
      });
  }
});
//reload detection
const isReload =
  performance && performance.navigation && performance.navigation.type === 1;

if (isReload) {
  status.wasReload = true;
  console.log("was reload");
  m.route.set("/intro");
  initMap();
}
