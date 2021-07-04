"use strict";

let olc_lat_lng;

//https://www.devbridge.com/sourcery/components/jquery-autocomplete/
$(document).ready(function () {
  const ac_selected_station = $("#search").autocomplete({
    serviceUrl:
      "https://nominatim.openstreetmap.org/search?format=json&addressdetails=0",
    minChars: 1,
    showNoSuggestionNotice: true,
    paramName: "q",
    lookupLimit: 10,
    deferRequestBy: 2000,
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
      addMarker(lat_lon[0], lat_lon[1]);
    },
  });

  //add marker
  function addMarker(lat, lng) {
    map.setView([lat, lng], 13);
    hideSearch();
    current_lat = Number(lat);
    current_lng = Number(lng);
 
    L.marker([current_lat, current_lng]).addTo(markers_group);
    toaster("press 5 to save the search result as marker");
  }

  //////////////////////////
  ////SEARCH BOX////////////
  /////////////////////////

  window.showSearch = function () {
    $("#search").autocomplete().enable();

    bottom_bar("close", "select", "");
    $("div#search-box").find("input").val("");

    $("div#search-box").css("display", "block");
    $("div#search-box").find("input").focus();
    $("div#bottom-bar").css("display", "block");
    toaster(
      "you can search for locations, names or OLC. To search for OLC, start your search query with /",
      3000
    );
    windowOpen = "search";
  };

  window.hideSearch = function () {
    $("div#bottom-bar").css("display", "none");
    $("div#search-box").css("display", "none");
    $("div#search-box").find("input").val("");
    $("div#search-box").find("input").blur();
    $("div#olc").css("display", "none");

    windowOpen = "map";
  };

  //////////////////////////
  ////OLC////////////
  /////////////////////////

  document.getElementById("search").addEventListener("input", function () {
    let input_val = $("#search").val();
    var n = input_val.startsWith("/");
    if (n) {
      input_val = input_val.replace("/", "");
      $("#search").autocomplete().disable();

      $("div.autocomplete-suggestions").css("display", "none");
      $("div.autocomplete-suggestion").css("display", "none");
      $("div#olc").css("display", "block");
      $("#olc").text(OLC.decode(input_val));

      let ll = String(OLC.decode(input_val));

      if (ll.includes("NaN") == false) {
        olc_lat_lng = ll.split(",");
        map.setView([olc_lat_lng[0], olc_lat_lng[1]], 13);
      }
    }

    if (n == false) {
      $("div.autocomplete-suggestions").css("display", "block");
      $("div#olc").css("display", "none");
      $("#search").autocomplete().enable();
    }
  });
});
