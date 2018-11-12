 
$(document).ready(function() {

    //leaflet
  var map = L.map('map', {
    zoomControl: false,
dragging: false,
keyboard: true
}).fitWorld();

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'

          
         
  }).addTo(map);

  
  function formatJSON(rawjson) {  //callback that remap fields name
    var json = {},
      key, loc, disp = [];
      
    for(var i in rawjson)
    { 
      disp = rawjson[i].display_name.split(',');  

      key = disp[0] +', '+ disp[1];
      
      loc = L.latLng( rawjson[i].lat, rawjson[i].lon );
      
      json[ key ]= loc; //key,value format
    }
    
    return json;
  }
      
  var mobileOpts = {
    url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
    jsonpParam: 'json_callback',
    formatData: formatJSON, 
    textPlaceholder: 'Search...',
    autoType: true,
    tipAutoSubmit: true,
    autoCollapse: true,
    collapsed: false,
    autoCollapseTime: 20000,
    delayType: 1800, //with mobile device typing is more slow
    marker: {
      icon: true
    }   
  };
  
  map.addControl( new L.Control.Search(mobileOpts) );


  var myMarker = "";
  function onLocationFound(e) {
    //var radius = e.accuracy / 2;
    myMarker = L.marker(e.latlng).addTo(map);
      //.bindPopup("You are within " + radius + " meters from this point").openPopup();

    //L.circle(e.latlng, radius).addTo(map);
  }

  function onLocationError(e) {
    alert(e.message);
  }

  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);

  map.locate({setView: true, maxZoom: 16});

//softkey 


var step = 0.001;
var current_lng = 0;
var current_lat = 0;
var zoom_level = 16;


function updateMarker(showMessage)
{
  function getLocation() {

    if (navigator.geolocation) 
    {
      navigator.geolocation.getCurrentPosition(showPosition);
    } 

    else 
    {
      alert("New Position not found.")}
    }
    
    function showPosition(position) 
    {

      myMarker.setLatLng([position.coords.latitude, position.coords.longitude]).update();
      map.panTo( new L.LatLng(position.coords.latitude, position.coords.longitude));
      if(showMessage == true)
      {
        if($('div#currentPosition').css('z-index')=='-3000')
{
        $('div#currentPosition').css("z-index","3000")
        $('div#currentPosition > div').text("Latitude: "+position.coords.latitude +" / Longitude: "+position.coords.longitude)
      }
      else
        {$('div#currentPosition').css("z-index","-3000")}
    }

    }

getLocation();

      

}


function goToMarker()
{
    current_lng = 0;
    current_lat = 0;
    var curPos = myMarker.getLatLng();
    var new_lat = curPos.lat;
    var new_lng = curPos.lng;
    map.panTo( new L.LatLng(new_lat, new_lng));
}


$('.leaflet-control-search').css('display','none')

function showSearch()
{
if($('.leaflet-control-search').css('display')=='none')
{
$('.leaflet-control-search').css('display','block');
$('.leaflet-control-search').find("input").focus();


}
else
{
  $('.leaflet-control-search').css('display','none');
}

}




function showMan()
{

  if($('div#man-page').css('display')=='none')
{
$('div#man-page').css('display','block');
$('div#man-page').find("input").focus();


}
else
{
  $('div#man-page').css('display','none');
}

}








function handleKeyDown(evt) {





    switch (evt.key) {
        case 'SoftLeft':
          map.setZoom(map.getZoom() + 1);
          zoom_level = map.getZoom();
        break;

        case 'SoftRight':
          map.setZoom(map.getZoom() - 1);
          zoom_level = map.getZoom();
        break;

        case 'Enter':
          goToMarker();
        break;


        case '1':
          updateMarker(false);
        break;

        case '2':
          showSearch();
        break;

        case 'ArrowRight':
          current_lng++;
          var curPos = myMarker.getLatLng();
          var new_lat = curPos.lat +(current_lat * step);
          var new_lng = curPos.lng +(current_lng * step);
          map.panTo( new L.LatLng(new_lat, new_lng));
        break; 

        case 'ArrowLeft':
          current_lng--
          var curPos = myMarker.getLatLng();
          var new_lat = curPos.lat +(current_lat * step);
          var new_lng = curPos.lng +(current_lng * step);
          map.panTo( new L.LatLng(new_lat, new_lng));
        break; 

        case 'ArrowUp':
          current_lat++
          var curPos = myMarker.getLatLng();
          var new_lat = curPos.lat +(current_lat * step);
          var new_lng = curPos.lng +(current_lng * step);
          map.panTo( new L.LatLng(new_lat, new_lng));
        break; 
        

        case 'ArrowDown':
          current_lat--
          var curPos = myMarker.getLatLng();
          var new_lat = curPos.lat +(current_lat * step);
          var new_lng = curPos.lng +(current_lng * step);
          map.panTo( new L.LatLng(new_lat, new_lng));
        break; 

        case '0':
          showMan();
        break; 

        case '3':
          updateMarker(true);
        break; 
    }



       //map move speed





  if(zoom_level < 6)
    {
    step = 1;
    document.getElementById("zoom-level").innerHTML = zoom_level+step;
    }


      if(zoom_level > 6)
    {
    step = 0.1;
    document.getElementById("zoom-level").innerHTML = zoom_level+step;
    }


    if(zoom_level > 12)
    {
    step = 0.001;
    document.getElementById("zoom-level").innerHTML = zoom_level+step;
    }



};

document.addEventListener('keydown', handleKeyDown);




  });



