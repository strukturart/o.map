const keepalive = (() => {
  const interval = 4;

  let add_alarm = function (date, message_text) {
    // KaiOs  2.xx
    if ("mozAlarms" in navigator) {
      // This is arbitrary data pass to the alarm
      var data = {
        note: message_text,
        event_id: module.uniqueId,
      };

      var request = navigator.mozAlarms.add(date, "honorTimezone", data);

      request.onsuccess = function (e) {};

      request.onerror = function () {
        console.log("An error occurred: " + this.error.name);
      };
    }

    // KaiOs  3.xx
    if ("b2g" in navigator) {
      try {
        let options = {
          date: date,
          data: { note: message_text },
          ignoreTimezone: false,
        };

        navigator.b2g.alarmManager.add(options).then(
          (id) => console.log("add id: " + id),
          (err) => console.log("add err: " + err)
        );
      } catch (e) {
        //alert(e);
      }
    }
  };

  let remove_alarm = function () {
    // KaiOs  2.xx

    try {
      let request = navigator.mozAlarms.getAll();

      request.onsuccess = function () {
        this.result.forEach(function (alarm) {
          let r = navigator.mozAlarms.remove(alarm.id);
          /*
          r.onsuccess = function () {
            console.log("removed");
          };

          r.onerror = function () {
            console.log("An error occurred: " + this.error.name);
          };
          */
        });
      };

      request.onerror = function () {
        console.log("An error occurred:", this.error.name);
      };
    } catch (e) {}

    // KaiOs  3.xx
    if ("b2g" in navigator) {
      try {
        let request = navigator.b2g.alarmManager.getAll();
        request.onsuccess = function () {
          this.result.forEach(function (alarm) {
            if (id == "all") {
              let req = navigator.b2g.alarmManager.remove(alarm.id);

              req.onsuccess = function () {
                console.log("removed");
              };

              req.onerror = function () {
                console.log("An error occurred: " + this.error.name);
              };
            } else {
              if (alarm.data.event_id == id) {
                let req = navigator.b2g.alarmManager.remove(alarm.id);

                req.onsuccess = function () {
                  console.log("removed");
                };

                req.onerror = function () {
                  console.log("An error occurred: " + this.error.name);
                };
              } else {
                console.log("no alarm founded");
              }
            }
          });
        };
      } catch (e) {
        console.log(e);
      }
    }
  };

  //restart alarm to check if the app  was closed by the system
  try {
    if ("mozAlarms" in navigator) {
      //set alarm
      let m = function () {
        var d = new Date();
        d.setMinutes(d.getMinutes() + interval);
        add_alarm(d, "keep alive");
      };

      //reset alarm or stop loop
      navigator.mozSetMessageHandler("alarm", function (message) {
        remove_alarm();
        //stop alarm when tracking is not active
        let k = JSON.parse(localStorage.getItem("status"));
        if (k.tracking_running === false) return false;

        let f = Math.round(Date.now() / 1000) - k.gps_data_received;
        //module.pushLocalNotification("O.map", String(f));
        if (k.tracking_running && k.closedByUser === false) {
          m();
        } else if (k.tracking_running && f > 360) {
          module.pushLocalNotification(
            "O.map",
            "Attention the tracking was aborted unexpectedly"
          );
        }
      });
    }
  } catch (e) {
    console.log(e);
  }
  return {
    add_alarm,
    remove_alarm,
  };
})();
