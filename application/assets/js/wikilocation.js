//////////////////////////
////GET LOCATIONS FROM WIKIPEDIA////////////
/////////////////////////
const wikilocation = (() => {
  let load = function () {
    let source_url =
      "https://wikipedia.org/w/api.php?action=query&format=json&list=geosearch&gscoord=" +
      mainmarker.current_lat +
      "|" +
      mainmarker.current_lng +
      "&gsradius=10000&gslimit=5";
    let xhttp = new XMLHttpRequest({
      mozSystem: true,
    });

    xhttp.open("GET", source_url, true);
    xhttp.timeout = 5000;
    xhttp.onload = function () {
      if (xhttp.readyState === xhttp.DONE && xhttp.status === 200) {
        let data = xhttp.response;

        //check if json valid
        try {
          let p = JSON.parse(data);
          write_data(p);
        } catch (e) {
          return false;
        }
      }
    };

    xhttp.onerror = function () {
      write_error();
    };

    xhttp.send();
    let el = document.querySelector("div#wikilocation");
    let write_error = function () {
      el.insertAdjacentHTML("afterbegin", "<div>nothing to show</div>");
    };

    let write_data = function (json) {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
      json.query.geosearch.forEach(function (element) {
        el.insertAdjacentHTML(
          "afterbegin",
          "<button class='link item button' data-href='https://wikipedia.org/?curid=" +
            element.pageid +
            "'>" +
            element.title +
            "</button>"
        );
      });
    };
  };

  return {
    load,
  };
})();
