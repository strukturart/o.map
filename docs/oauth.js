function getToken() {
  const code = location.search.split("?code=")[1];

  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

  var urlencoded = new URLSearchParams();
  urlencoded.append("code", code);
  urlencoded.append("grant_type", "authorization_code");
  urlencoded.append(
    "redirect_uri",
    "https://strukturart.github.io/o.map/oauth.html"
  );
  urlencoded.append("client_id", "KEcqDV16BjfRr-kYuOyRGmiQcx6YCyRz8T21UjtQWy4");

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow",
  };

  return fetch(
    "https://www.openstreetmap.org/oauth2/token",
    requestOptions
  ).then((response) => response.json());
}

getToken().then((result) => {
  localStorage.setItem("openstreetmap_token", result.access_token);
  document.getElementById("success").innerText =
    "you are now successfully connected to the osm service";

  if (result.access_token != null) {
    try {
      let activity = new WebActivity("omap-oauth", {
        type: "code",
        "code": code,
      });
      activity.start().then(
        (rv) => {
          // console.log("Results passed back from activity handler:");
          setTimeout(() => {
            window.close();
          }, 4000);
        },
        (err) => {
          alert(err);

          if (err === "NO_PROVIDER") {
            //window.close();
          }
        }
      );
    } catch (e) {
      alert(e);
    }
  }

  window.dispatchEvent(
    new CustomEvent("tokens", {
      detail: result,
    })
  );
  window.close();
});
