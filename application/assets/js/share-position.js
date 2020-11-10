window.share_position = function() {

    message_body = "https://www.openstreetmap.org/?mlat=" + current_lat + "&mlon=" + current_lng + "#map=13/" + current_lat + "/" + current_lng + "&layers=T"

    let sms = new MozActivity({
        name: "new",
        data: {
            type: "websms/sms",
            number: "",
            body: message_body
        }
    });

}