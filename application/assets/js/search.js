"use strict";

//////////////////////////
////SEARCH BOX////////////
/////////////////////////
const search = (() => {
  let search_history = JSON.parse(
    localStorage.getItem("search_history") || "[]"
  );

  const save_search_history = function () {
    localStorage.setItem("search_history", JSON.stringify(search_history));
  };

  let showSearch = function () {
    helper.bottom_bar("close", "select", "");
    document.querySelector("div#search-box").style.display = "block";
    document.querySelector("div#search-box input").focus();
    document.querySelector("div#bottom-bar").style.display = "block";

    status.windowOpen = "search";

    document.querySelector("#search-info").style.display = "none";
    datalist = [];
    search_history.forEach(function (item, index) {
      datalist.push({
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        index: index + 1,
      });
    });
    create_html();
  };

  let hideSearch = function () {
    document.querySelector("div#bottom-bar").style.display = "none";
    document.querySelector("div#search-box").style.display = "none";
    document.querySelector("div#search-box input").value = "";
    document.querySelector("div#search-box input").blur();

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

  result_data(search_history);

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
        helper.side_toaster(
          "There has been a problem with your fetch operation:",
          5000
        );
      });
  };

  let search_return_data = function () {
    search.hideSearch();
    let f = document.activeElement.getAttribute("data-latlng");
    let g = document.activeElement.getAttribute("data-lat");
    let h = document.activeElement.getAttribute("data-lng");
    let i = document.activeElement.getAttribute("data-name");

    search_history.unshift({
      lat: g,
      lng: h,
      name: i,
      index: 0,
    });
    if (search_history.length > 100) array.splice(30);

    save_search_history();

    f = f.split(",");

    map.setView([f[0], f[1]], 13);

    mainmarker.current_lat = f[0];
    mainmarker.current_lng = f[1];
    helper.toaster("press 9 to add an marker", 3000);
    document.getElementById("result-container").innerHTML = "";
    datalist = [];
    status.windowOpen = "map";
  };

  document.getElementById("search").addEventListener("input", function () {
    start_search();
  });

  return {
    showSearch,
    hideSearch,
    start_search,
    search_return_data,
    search_nav,
  };
})();
