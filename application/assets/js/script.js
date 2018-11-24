 
$(document).ready(function() {


//Global Vars
var step = 0.001;
var current_lng = 0;
var current_lat = 0;
var zoom_level = 16;
var new_lat = 0;
var new_lng = 0;
var curPos = 0;
var myMarker = "";
var finderNav_tabindex = -1;
var i = 0;





//leaflet add map
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


	$('div#location div#lat').text("searching position");
	function onLocationFound(e)
	{
		//var radius = e.accuracy / 2;
		myMarker = L.marker(e.latlng).addTo(map);
		//L.circle(e.latlng, radius).addTo(map);


		curPos = e.latlng;

		current_lng = curPos.lng;
		current_lat = curPos.lat;

		$('div#location').css('display', 'none');
		$('div#location div#lat').text(current_lat);
		$('div#location div#lng').text(current_lng);



  }



  function onLocationError(e) 
  {
    $('div#location div#lat').text("position not found");
  }

  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);

  map.locate({setView: true, maxZoom: 16});

  zoom_level = 16
  zoom_speed()

 

  



function getFinderFile()
{
if ($(".items").is(":focus")) {
	alert($(document.activeElement).text())
}

}

function addTrack()
{

	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search(".json");

	finder.on("searchBegin", function (needle) 
	{
		alert("search startet")
	});

	

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{
		finderNav_tabindex++;

		$("div#finder").append('<div class="items" tabindex="'+finderNav_tabindex+'">'+fileinfo.name+'</div>');
		$('div#finder').find('div:first').focus();

	});


 //file reader
/*
 var mygpx="";
 var reader = new FileReader();

 


 reader.onerror = function(event) {
    
    alert('shit happens')
    reader.abort();
  };


     reader.onload = function(event) {
  
  };

  reader.onloadend = function (event) {
  	 mygpx = event.target.result
    //var myLayer = L.geoJSON().addTo(map);
    //myLayer.addData(JSON.parse(mygpx));
  


};


  reader.readAsText(file)


*/

}




/*
SEARCH
*/

  
  function formatJSON(rawjson) {  
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
    autoCollapseTime: 10000,
    delayType: 800, //with mobile device typing is more slow
    marker: {
      icon: true
    }   
  };
  
  var searchControl =  new L.Control.Search(mobileOpts);


searchControl.on('search:locationfound', function(e) {


	curPos = e.latlng;

	current_lng = curPos.lng;
	current_lat = curPos.lat;

		$('div#location div#lat').text(current_lat);
		$('div#location div#lng').text(current_lng);
	$('.leaflet-control-search').css('display','none');
})

map.addControl( searchControl );









function updateMarker(option)
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
      map.flyTo( new L.LatLng(position.coords.latitude, position.coords.longitude),16);
      zoom_level = 16
      zoom_speed()

      
	current_lng = position.coords.longitude;
	current_lat = position.coords.latitude;

		$('div#location div#lat').text(current_lat);
		$('div#location div#lng').text(current_lng);

if(option == true)
{
	if($('div#location').css('display')== 'none')
	{
		$('div#location').css('display','block')
	}
	else
	{
		$('div#location').css('display','none')
	}
	
}
    }

	getLocation();


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




function zoom_speed()
{
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

    return step;
}





//KEYPAD TRIGGER


function handleKeyDown(evt) {





    switch (evt.key) {
        case 'SoftLeft':
          map.setZoom(map.getZoom() + 1);
          zoom_level = map.getZoom();
          zoom_speed();

        break;

        case 'SoftRight':
          map.setZoom(map.getZoom() - 1);
          zoom_level = map.getZoom();
          zoom_speed();

        break;

        case 'Enter':
        getFinderFile();
        break;

        case '0':
          showMan();
        break; 


        case '1':
          updateMarker();
        break;

        case '2':
          showSearch();
        break;

        case '3':
        	addTrack();    
        break; 

        case '4':
        	updateMarker(true);
        break;






        case 'ArrowRight':

          zoom_speed()
          $('div#location div#lat').text(current_lat);
          $('div#location div#lng').text(current_lng);
          current_lng = current_lng + step;
          map.panTo( new L.LatLng(current_lat, current_lng));
          
        break; 

        case 'ArrowLeft':
          zoom_speed()
          $('div#location div#lat').text(current_lat);
          $('div#location div#lng').text(current_lng);
          current_lng = current_lng - step;
          map.panTo( new L.LatLng(current_lat, current_lng));
          
        break; 

        case 'ArrowUp':
          zoom_speed()
          $('div#location div#lat').text(current_lat);
          $('div#location div#lng').text(current_lng);
          current_lat = current_lat + step;
          map.panTo( new L.LatLng(current_lat, current_lng));
           nav("-1");
        break; 
        

        case 'ArrowDown':
          zoom_speed()
          $('div#location div#lat').text(current_lat);
          $('div#location div#lng').text(current_lng);
          current_lat = current_lat - step;
          map.panTo( new L.LatLng(current_lat, current_lng));
          nav("+1")
        break; 

    }

    






 



};

function nav (move) {

	if(move == "+1" && i < finderNav_tabindex)
	{
		i++
		if(i <= finderNav_tabindex)
		{
			var items = document.querySelectorAll('.items');
			var targetElement = items[i];
			targetElement.focus();
		}
	}

	if(move == "-1" &&  i > -1)
	{
		i--
		if(i >= 0)
		{
			var items = document.querySelectorAll('.items');
			var targetElement = items[i];
			targetElement.focus();
		}
	}

}

document.addEventListener('keydown', handleKeyDown);

//document.activeElement.addEventListener('keydown', handleKeyDown);



$(window).on("error", function(evt) {

console.log("jQuery error event:", evt);
var e = evt.originalEvent; // get the javascript event
console.log("original event:", e);
if (e.message) { 
    alert("Error:\n\t" + e.message + "\nLine:\n\t" + e.lineno + "\nFile:\n\t" + e.filename);
} else {
    alert("Error:\n\t" + e.type + "\nElement:\n\t" + (e.srcElement || e.target));
}
});


  });






