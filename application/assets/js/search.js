"use strict";

let olc_lat_lng;

//////////////////////////
////SEARCH BOX////////////
/////////////////////////
const search = (() => {
  let showSearch = function () {
    bottom_bar("close", "select", "search");
    document.querySelector("div#search-box").style.display = "block";
    document.querySelector("div#search-box input").focus();
    document.querySelector("div#bottom-bar").style.display = "block";

    status.windowOpen = "search";
  };

  let hideSearch = function () {
    document.querySelector("div#bottom-bar").style.display = "none";
    document.querySelector("div#search-box").style.display = "none";
    document.querySelector("div#search-box input").value = "";
    document.querySelector("div#search-box input").blur();
    document.querySelector("div#olc").style.display = "none";

    setTimeout(function () {
      status.windowOpen = "map";
    }, 1000);
  };

  //SEARCH

  function search_nav(move) {
    const currentIndex = document.activeElement.tabIndex;
    const next = currentIndex + move;
    const items = document.querySelectorAll(".items");
    const targetElement = items[next];
    targetElement.focus();

    // smooth center scrolling
    const rect = document.activeElement.getBoundingClientRect();
    const elY =
      rect.top - document.body.getBoundingClientRect().top + rect.height / 2;

    document.activeElement.parentNode.scrollBy({
      left: 0,
      top: elY - window.innerHeight / 2,
      behavior: "smooth",
    });
  }

  let create_html = function () {
    var template = document.getElementById("template-search").innerHTML;
    var rendered = Mustache.render(template, { data: datalist });
    document.getElementById("result-container").innerHTML = rendered;
  };
  let datalist;

  let result_data = function (data) {
    document.querySelector("#search-info").style.display = "none";
    datalist = [];
    data.forEach(function (item, index) {
      datalist.push({
        lat: item.lat,
        lng: item.lon,
        name: item.display_name,
        index: index + 1,
      });
    });
    if (document.activeElement.id == "search") create_html();
  };

  //SEARCH

  let start_search = function () {
    let search_term = document.getElementById("search").value;
    if (search_term.length < 3) return false;
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&q=" +
      search_term;

    const options = { method: "GET" };

    fetch(url, options)
      .then((response) => response.json())
      .then((result) => result_data(result))
      .catch((error) => {
        console.error(
          "There has been a problem with your fetch operation:",
          error
        );
      });
  };

  let search_return_data = function () {
    search.hideSearch();
    let f = document.activeElement.getAttribute("data-latlng");
    f = f.split(",");

    map.setView([f[0], f[1]], 13);

    mainmarker.current_lat = f[0];
    mainmarker.current_lng = f[1];
    helper.toaster("press 9 to add an marker", 3000);
    document.getElementById("result-container").innerHTML = "";
    datalist = [];
    status.windowOpen = "map";
  };

  document.getElementById("search").addEventListener("keyup", function (e) {
    //if (e.key != "ArrowDown") start_search();
  });

  //////////////////////////
  ////OLC////////////
  /////////////////////////

  document.getElementById("search").addEventListener("input", function () {
    let input_val = document.querySelector("input#search").value;
    start_search();

    if (input_val.startsWith("/")) {
      document.getElementById("search-info").style.display = "none";

      input_val = input_val.replace("/", "");
      //$("#search").autocomplete().disable();

      document.querySelector("div#olc").style.display = "block";
      document.querySelector("#olc").innerText = OLC.decode(input_val);

      let ll = String(OLC.decode(input_val));

      if (ll.includes("NaN") == false) {
        olc_lat_lng = ll.split(",");
        map.setView([olc_lat_lng[0], olc_lat_lng[1]]);

        mainmarker.current_lat = olc_lat_lng[0];
        mainmarker.current_lng = olc_lat_lng[1];
      }

      helper.toaster("press 9 to add an marker", 3000);

      return true;
    }

    if (input_val.startsWith("+")) {
      let d = input_val.replace("+", "");
      d = d.split(",");

      mainmarker.current_lat = d[0];
      mainmarker.current_lng = d[1];

      map.setView([d[0], d[1]]);
      document.getElementById("search-info").style.display = "none";
      return true;
    }

    document.querySelector("div#olc").style.display = "none";
  });

  return {
    showSearch,
    hideSearch,
    start_search,
    search_return_data,
    search_nav,
  };
})();
