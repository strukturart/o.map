const mozactivity = (() => {
  const share_position = function () {
    message_body =
      "https://www.openstreetmap.org/?mlat=" +
      current_lat +
      "&mlon=" +
      current_lng +
      "#map=13/" +
      current_lat +
      "/" +
      current_lng +
      "&layers=T";

    share(message_body);
  };

  function share(url) {
    let activity = new MozActivity({
      name: "share",
      data: {
        type: "url",
        url: url,
      },
    });

    activity.onsuccess = function () {};

    activity.onerror = function () {
      console.log("The activity encounter en error: " + this.error);
    };
  }

  const photo = function () {
    let activity = new MozActivity({
      name: "record",
      data: {
        type: ["photos", "videos"],
      },
    });

    activity.onsuccess = function () {
      toaster("back", 2000);
    };

    activity.onerror = function () {
      console.log("The activity encounter en error: " + this.error);
    };
  };

  return {
    photo,
    share_position,
  };
})();
