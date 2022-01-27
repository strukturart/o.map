document.addEventListener("DOMContentLoaded", () => {
  getKaiAd({
    publisher: "4408b6fa-4e1d-438f-af4d-f3be2fa97208",
    app: "omap",
    slot: "omap",
    test: 0,
    timeout: 10000,
    h: 220,
    w: 220,
    container: document.getElementById("KaiOsAd"),
    onerror: (err) => console.error("Error:", err),
    onready: (ad) => {
      ad.on("close", () => console.log("close event"));

      // Ad is ready to be displayed
      // calling 'display' will display the ad
      ad.call("display", {
        // In KaiOS the app developer is responsible
        // for user navigation, and can provide
        // navigational className and/or a tabindex
        tabindex: 0,

        // if the application is using
        // a classname to navigate
        // this classname will be applied
        // to the container
        // navClass: "item",

        // display style will be applied
        // to the container block or inline-block
        display: "block",
      });
    },
  });
});
