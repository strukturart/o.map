const mozactivity = (() => {
  let share_position = function () {
    let a =
      "https://www.openstreetmap.org/?mlat=" +
      current_lat +
      "&mlon=" +
      current_lng +
      "#map=13/" +
      current_lat +
      "/" +
      current_lng +
      "&layers=T";

    let activity = new MozActivity({
      name: "share",
      data: {
        type: "url",
        url: a,
      },
    });

    activity.onsuccess = function () {
      console.log("successfully shared");
    };

    activity.onerror = function () {
      console.log("The activity encounter en error: " + this.error);
    };
  };

  const photo = function () {
    let activity = new MozActivity({
      name: "record",
      data: {
        type: ["photos", "videos"],
      },
    });

    activity.onsuccess = function () {
      console.log("successfully");
    };

    activity.onerror = function () {
      console.log("The activity encounter en error: " + this.error);
    };
  };

  const getPath = function () {
    var a = new MozActivity({
      name: "pick",
    });
    a.onsuccess = function () {
      alert(a.result);
    };
    a.onerror = function () {
      alert("Failure when trying to pick");
    };
  };

  return {
    photo,
    share_position,
    getPath,
  };
})();
