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

  fetch("https://www.openstreetmap.org/oauth2/token", requestOptions)
    .then((response) => response.json())
    .then(function (p) {
      alert(urlencoded);
      alert(JSON.stringify(p));
      localStorage.setItem("openstreetmap_token", p.access_token);
    });
}
getToken();
/*
getToken().then((result) => {
  alert(result);
  localStorage.setItem("openstreetmap_token", result.access_token);
  window.dispatchEvent(
    new CustomEvent("tokens", {
      detail: result,
    })
  );
  // window.close();
});

*/
