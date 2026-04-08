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

const sw_channel = new BroadcastChannel("sw-messages");

export let status = {
  debug: false,
  version: "",
  notKaiOS: true,
  selected_marker: "",
  previousView: "",
};

export let settings;

localforage
  .getItem("settings")
  .then((value) => {
    if (value === null) {
      settings = {
        grade: { climbing: "french", bouldering: "vscale" },
      };
      localforage.setItem("settings", settings);
    } else {
      settings = value;
      localforage.setItem("settings", value);
    }
  })
  .catch((err) => {
    settings = {
      grade: { climbing: "french", bouldering: "vscale" },
    };
    localforage.setItem("settings", settings);
  });

let cache_search = () => {
  localforage.setItem("articles", articles);
};

const show_success_animation = () => {
  setTimeout(() => {
    document.querySelector(".success-checkmark").style.display = "block";
  }, 2000);

  setTimeout(() => {
    document.querySelector(".success-checkmark").style.display = "none";
  }, 4000);
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

//map

let map;
const mainmarker = { current_lat: 20, current_lng: 0 };

const isReload =
  performance && performance.navigation && performance.navigation.type === 1;

if (isReload) {
  status.wasReload = true;
  console.log("was reload");
  m.route.set("/intro");
}

let key_delay = () => {
  setTimeout(() => {
    status.viewReady = true;
  }, 1500);
};

function ZoomMap(in_out) {
  if (!map) return;

  if (in_out === "in") {
    map.zoomIn();
  } else if (in_out === "out") {
    map.zoomOut();
  }
}

function MoveMap(direction) {
  document.querySelector("#map-container").focus();
  const baseStep = 0.01;
  const zoomFactor = Math.pow(2, map.getZoom());
  const step = baseStep / zoomFactor;

  // Aktuelle Mitte der Karte
  let center = map.getCenter();

  // Verschiebung berechnen
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

  localforage.setItem("lastPosition", center);

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

// Initialize the map and define the setup
function map_function(lat, lng, zoom = 10) {
  map = L.map("map-container", {
    keyboard: true,
    zoomControl: false,
    shadowUrl: "",
    minZoom: 3,
    worldCopyJump: true,
  }).setView([lat, lng], zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  document.getElementsByClassName(
    "leaflet-control-attribution",
  )[0].style.display = "none";

  let myMarker = null;

  let geolocation_cb = function (e) {
    if (!myMarker) {
      // Create the marker only once
      myMarker = L.marker([e.coords.latitude, e.coords.longitude])
        .addTo(map)
        .bindPopup("It's me");
      myMarker._icon.classList.add("myMarker");
      myMarker.options.shadowUrl = "";

      // Update the marker's position
      myMarker.setLatLng([e.coords.latitude, e.coords.longitude]);
    }
  };
  geolocation(geolocation_cb);
  map.setView([lat, lng]);
}

//open KaiOS app
let app_launcher = () => {
  var currentUrl = window.location.href;

  // Check if the URL includes 'id='
  if (!currentUrl.includes("code=")) return false;

  const params = new URLSearchParams(currentUrl.split("?")[1]);
  const code = params.get("code");

  if (!code) return false;

  let result = code.split("#")[0];

  setTimeout(() => {
    try {
      const activity = new MozActivity({
        name: "feedolin",
        data: result,
      });
      activity.onsuccess = function () {
        console.log("Activity successfuly handled");
        setTimeout(() => {
          window.close();
        }, 4000);
      };

      activity.onerror = function () {
        console.log("The activity encouter en error: " + this.error);
        alert(this.error);
      };
    } catch (e) {
      console.log(e);
    }

    if ("b2g" in navigator) {
      try {
        let activity = new WebActivity("feedolin", {
          name: "feedolin",
          data: result,
        });
        activity.start().then(
          (rv) => {
            setTimeout(() => {
              window.close();
            }, 3000);
          },
          (err) => {
            if (err == "NO_PROVIDER") {
            }
          },
        );
      } catch (e) {
        alert(e);
      }
    }
  }, 2000);
};
if (!status.notKaiOS) app_launcher();

////////////////
///VIEWS
///////////////

var root = document.getElementById("app");

let mapView = {
  view: function () {
    return m(
      "div",
      {
        id: "map-container",

        onremove: () => {
          const center = map.getCenter();
          localforage.setItem("lastPosition", center);
        },

        oncreate: (vnode) => {
          localforage.getItem("lastPosition").then((e) => {
            map_function(e.lat, e.lng, 16);
          });

          bottom_bar(
            "",
            "<img class='menu-button' src='../assets/image/menu.svg'>",
            "",
          );
          top_bar("", "", "");
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
          src: "./assets/icons/navigation.svg",

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

var about = {
  view: function () {
    return m(
      "div",
      {
        class: "scoll page",
        tabindex: 0,
        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m(
          "div",
          m.trust(
            "<strong>PicTick</strong> is an app with which you can search for climbing areas and climbing routes. you can also ‘tick’ your routes to create an overview of the routes you have climbed. The data that is searched comes from openbeta.io a free climbing database. <br><br>",
          ),
          m("li", "Version: " + status.version),
        ),
      ],
    );
  },
};

var privacy_policy = {
  view: function () {
    return m(
      "div",
      {
        id: "privacy_policy",
        class: "page scroll",
        tabindex: "0",
        oncreate: (vnode) => {
          vnode.dom.focus();
        },
      },
      [
        m(
          "h1",
          {
            oncreate: (vnode) => {
              vnode.dom.focus();
            },
          },
          "Privacy Policy for PicTick",
        ),
        m(
          "p",
          "PicTick is committed to protecting your privacy. This policy explains how data is handled within the app.",
        ),

        m("h2", "Data Collection and Storage"),
        m(
          "p",
          "PicTick does not collect, store, or transmit any personal data to external servers beyond what is necessary for core app functionality. All climbing data related to areas, crags, and climbs is fetched directly from openBeta.io and stored temporarily on your device for your convenience.",
        ),

        m("h2", "User Authentication and Data Access"),
        m("p", [
          "PicTick provides an option for users to connect their openBeta.io accounts through Auth0 authentication. By connecting your account, you allow PicTick to access specific personal data, including your profile information and your list of ticked climbs, directly from openBeta.io. This data is only used within the app to enhance your experience, such as by displaying your personal climbing records and preferences.",
        ]),
        m("p", [
          "No user data accessed from openBeta.io is stored on external servers or shared with third parties. This data remains temporarily stored on your device for the duration of your session.",
        ]),

        m("h2", "Third-Party Services"),
        m("p", [
          "PicTick uses data from ",
          m(
            "a",
            {
              href: "https://openbeta.io/",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            "openBeta.io",
          ),
          " for climbing information. The app also uses Auth0 for secure user authentication. For more details on how these services handle user data, please refer to the ",
          m(
            "a",
            {
              href: "https://auth0.com/privacy",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            "Auth0 Privacy Policy",
          ),
          " and the openBeta.io privacy policy.",
        ]),

        m("h2", "KaiOS Users"),
        m("p", [
          "If you are using PicTick on a KaiOS device, the app uses ",
          m("strong", "KaiOS Ads"),
          ", which may collect data related to your usage. The data collected by KaiOS Ads is subject to the ",
          m(
            "a",
            {
              href: "https://www.kaiostech.com/privacy-policy/",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            "KaiOS privacy policy",
          ),
          ".",
        ]),
        m("p", [
          "For users on all other platforms, ",
          m("strong", "no ads"),
          " are displayed, and no external data collection occurs.",
        ]),

        m("h2", "User Rights"),
        m(
          "p",
          "As a user, you have the right to access, manage, and delete any data that the app may temporarily store on your device. If you connect to openBeta.io, you can manage or revoke access to PicTick through your openBeta.io account settings.",
        ),

        m("h2", "Policy Updates"),
        m(
          "p",
          "This Privacy Policy may be updated periodically. Any changes will be communicated through updates to the app.",
        ),

        m(
          "p",
          "By using PicTick, you acknowledge and agree to this Privacy Policy.",
        ),
      ],
    );
  },
};

var settingsView = {
  view: function () {
    return m(
      "div",
      {
        class: "page flex ",
        id: "settings-page",
        oncreate: () => {
          if (status.notKaiOS)
            top_bar("<img src='assets/icons/back.svg'>", "", "");
          if (status.notKaiOS) bottom_bar("", "", "");
        },
      },
      [
        m("div", "Set your default grade type"),

        m("h2", {}, "Climbing"),
        m(
          "div",
          {
            class: "item input-parent",
            oncreate: (vnode) => {
              vnode.dom.focus();
            },
          },
          [
            m("label", { for: "climbing-grade" }, ""),
            m(
              "select",
              {
                name: "climbing-grade",
                class: "select-box",
                id: "climbing-grade",
                value: settings.grade.climbing,
                onchange: (e) => {
                  settings.grade.climbing = e.target.value;
                  m.redraw();
                },
              },
              [
                m("option", { value: "french" }, "French"),
                m("option", { value: "yds" }, "YDS"),
                m("option", { value: "uuia" }, "UIAA"),
              ],
            ),
          ],
        ),

        m("h2", {}, "Bouldering"),
        m("div", { class: "item input-parent" }, [
          m("label", { for: "bouldering-grade" }, ""),
          m(
            "select",
            {
              name: "bouldering-grade",
              class: "select-box",
              id: "bouldering-grade",
              value: settings.grade.bouldering,
              onchange: (e) => {
                settings.grade.bouldering = e.target.value;
                m.redraw();
              },
            },
            [
              m("option", { value: "fb" }, "Fontainebleau (FB)"),
              m("option", { value: "vscale" }, "V-Scale"),
            ],
          ),
        ]),

        m(
          "button",
          {
            class: "item button-save-settings",
            oncreate: () => {
              setTabindex();
            },
            onkeydown: (e) => {
              if (e.key === "Enter") {
                e.target.click();
              }
            },
            onclick: () => {
              localforage.setItem("settings", settings).then(() => {
                side_toaster("settings saved", 4000);
              });
            },
          },
          "Save",
        ),
      ],
    );
  },
};

m.route(root, "/intro", {
  "/mapView": mapView,
  "/settingsView": settingsView,
  "/intro": intro,
  "/privacy_policy": privacy_policy,
  "/about": about,
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

document.addEventListener("swiped", function (e) {
  let a = e.target.closest("article.area");

  // Check if the swipe happened on an article and in the correct direction
  if (a && (e.detail.dir == "left" || e.detail.dir == "right")) {
    e.preventDefault();

    let ask = confirm("Do you want to delete this area?");

    if (ask) {
      myAreasDeleteItem(a.getAttribute("data-id"));
    }
  }
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
    console.log(items);

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
    .querySelector("div.button-left")
    .addEventListener("click", function (event) {
      simulateKeyPress("SoftLeft");
    });

  document
    .querySelector("div.button-right")
    .addEventListener("click", function (event) {
      simulateKeyPress("SoftRight");
    });

  document
    .querySelector("div.button-center")
    .addEventListener("click", function (event) {
      simulateKeyPress("Enter");
    });

  //top bar

  document
    .querySelector("#top-bar div div.button-left")
    .addEventListener("click", function (event) {
      simulateKeyPress("Backspace");
    });

  document
    .querySelector("#top-bar div div.button-left")
    .addEventListener("click", function (event) {
      simulateKeyPress("*");
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
        if (r.startsWith("/start")) {
          m.route.set("/options");
        }

        if (r.startsWith("/article")) {
          m.route.set("/options");
        }

        if (r.startsWith("/myAreas")) {
          myAreasDeleteItem(focused_article);
        }

        if (r.startsWith("/map")) {
          ZoomMap("out");
        }

        break;

      case "SoftLeft":
      case "Control":
        if (r.startsWith("/map")) {
          ZoomMap("in");
        }

        if (r.startsWith("/start")) {
          if (current_article == undefined) {
            m.route.set("/mapView", {
              lat: 0,
              lng: 0,
              uuid: 0,
            });
            return;
          }
          //if (articles.length == 0) return false;
          if (focused_article != null) {
            m.route.set("/mapView", {
              lat: current_article.metadata.lat,
              lng: current_article.metadata.lng,
              uuid: current_article.uuid,
            });
          } else {
            m.route.set("/mapView", {
              lat: current_article.metadata.lat || 0,
              lng: current_article.metadata.lng || 0,
              uuid: current_article.uuid || 0,
            });
          }
        }

        if (r.startsWith("/article")) {
          m.route.set("/mapView", {
            lat: current_article.metadata.lat,
            lng: current_article.metadata.lng,
            uuid: current_article.uuid,
          });
        }

        if (r.startsWith("/detail")) {
          m.route.set("/tickView");
        }

        if (r.startsWith("/ticksView")) {
          jsonToCsvExport({ data: ticks });
        }

        break;

      case "Enter":
        if (document.activeElement.classList.contains("input-parent")) {
          document.activeElement.children[0].focus();
        }

        if (r.startsWith("/map")) {
          panToNextMarker();
        }

        break;

      case "#":
        break;

      case "Backspace":
        if (r.startsWith("/myAreasView")) {
          history.back();
        }
        if (r.startsWith("/mapView")) {
          m.route.set("/start", { "search": "" });
        }

        if (r.startsWith("/article")) {
          history.back();
        }

        if (r.startsWith("/detail")) {
          history.back();
        }

        if (r.startsWith("/options")) {
          history.back();
        }

        if (r.startsWith("/about")) {
          history.back();
        }

        if (r.startsWith("/settingsView")) {
          history.back();
        }

        if (r.startsWith("/privacy_policy")) {
          history.back();
        }

        if (r.startsWith("/tickView")) {
          history.back();
        }

        if (r.startsWith("/ticksView")) {
          history.back();
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
