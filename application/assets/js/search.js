"use strict";

let olc_lat_lng;
let ac = "";

//https://www.devbridge.com/sourcery/components/jquery-autocomplete/
$(document).ready(function () {
  ac = $("#search").autocomplete({
    serviceUrl:
      "https://nominatim.openstreetmap.org/search?format=json&addressdetails=0",
    minChars: 1,
    showNoSuggestionNotice: true,
    paramName: "q",
    lookupLimit: 10,
    deferRequestBy: 1000,
    transformResult: function (response) {
      var obj = $.parseJSON(response);
      return {
        suggestions: $.map(obj, function (dataItem) {
          return {
            value: dataItem.display_name,
            data_lat: dataItem.lat,
            data_lon: dataItem.lon,
          };
        }),
      };
    },
    onSearchStart: function () {},
    onSearchError: function (query, jqXHR, textStatus, errorThrown) {
      toaster(JSON.stringify(jqXHR), 2000);
    },
    onSelect: function (suggestion) {
      let lat_lon = [suggestion.data_lat, suggestion.data_lon];
      map.setView([lat_lon[0], lat_lon[1]], 13);
      search.hideSearch();

      let n = map.getCenter();

      mainmarker.current_lat = n.lat;
      mainmarker.current_lng = n.lng;

      $("#search").autocomplete("clear");

      toaster("press 9 to add an marker", 3000);
    },
  });
});
//////////////////////////
////SEARCH BOX////////////
/////////////////////////
const search = (() => {
  let showSearch = function () {
    bottom_bar("close", "select", "");
    document.querySelector("div#search-box").style.display = "block";
    document.querySelector("div#search-box input").focus();
    document.querySelector("div#bottom-bar").style.display = "block";

    windowOpen = "search";
    setTimeout(function () {
      
    }, 3000);

    //$("#search").autocomplete().enable();
  };

  let hideSearch = function () {
    document.querySelector("div#bottom-bar").style.display = "none";
    document.querySelector("div#search-box").style.display = "none";
    document.querySelector("div#search-box input").value = "";
    document.querySelector("div#search-box input").blur();
    document.querySelector("div#olc").style.display = "none";
    windowOpen = "map";
  };

  //////////////////////////
  ////OLC////////////
  /////////////////////////

  document.getElementById("search").addEventListener("input", function () {
    let input_val = document.querySelector("input#search").value;

    if (input_val.startsWith("/")) {
      input_val = input_val.replace("/", "");
      $("#search").autocomplete().disable();

      document.querySelector("div#olc").style.display = "block";
      document.querySelector("#olc").innerText = OLC.decode(input_val);

      let ll = String(OLC.decode(input_val));

      if (ll.includes("NaN") == false) {
        olc_lat_lng = ll.split(",");
        map.setView([olc_lat_lng[0], olc_lat_lng[1]], 13);
      }

      return true;
    }

    document.querySelector("div.autocomplete-suggestions").style.display =
      "block";
    document.querySelector("div#olc").style.display = "none";
    ac.autocomplete().enable();
  });

  return {
    showSearch,
    hideSearch,
  };
})();
