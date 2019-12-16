function notify(param_title, param_text, param_silent) {

    var options = {
            body: param_text,
            silent: true
        }
        // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        var notification = new Notification(param_title, options);

    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
                var notification = new Notification(param_title, options);


            }
        });
    }

}

function toaster(text) {

    $("div#toast").text(text)
    $("div#toast").animate({ top: "0px" }, 1000, "linear", function() {


        $("div#toast").delay(2000).animate({ top: "-100px" }, 1000);


    });

}