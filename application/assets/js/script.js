 
$(document).ready(function() {


//Global Vars
var step = 0.001;
var current_lng = 0;
var current_lat = 0;
var zoom_level = 16;
var altitude;
var new_lat = 0;
var new_lng = 0;
var curPos = 0;
var myMarker = "";
var finderNav_tabindex = -1;
var i = 0;
var map_or_track;
var windowOpen = false;




//leaflet add basic map
var map = L.map('map-container', {
  zoomControl: false,
  dragging: false,
  keyboard: true
}).fitWorld();



function toner_map()
{
	var tilesUrl = 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
	tilesLayer = L.tileLayer(tilesUrl,{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '	
	});

	map.addLayer(tilesLayer);

}


function mapbox_map()
{
	var tilesUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
	tilesLayer = L.tileLayer(tilesUrl,{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	id: 'mapbox.streets'
	});

	map.addLayer(tilesLayer);

}

 toner_map()

	
	$('div#message div').text("searching position");
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
		$('div#message div').text("");
		$('div#message').css('display', 'none');




  }



	function onLocationError(e) 
	{
	$('div#message div').text("position not found");

	}

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 16});

	zoom_level = 16
	zoom_speed()




//finder 



function startFinder(search_string,MapOrTrack)
{
	$("div#custom-map-track").empty();
	windowOpen = true;
	map_or_track = MapOrTrack;
	i = 0;
	//get file list
	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search(search_string);

	finder.on("searchBegin", function (needle) 
	{
		alert("search startet")
	});

	finder.on("searchComplete", function (needle, filematchcount) 
	{
	if(filematchcount == 0)
	{
		$('div#finder-error').css('display','block')
		$('div#finder-error').text('no file found')
		setTimeout(function() 
		{
			$('div#finder-error').css("display","none");
		}, 4000);
	}

		if(filematchcount > 0)
	{
		$('div#finder').css('display','block')
		$('div#finder').find('div.items[tabindex=0]').focus();
	}


	});

	

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{
		finderNav_tabindex++;
		if(finderNav_tabindex == 0)
		{
		$("div#custom-map-track").append('<div class="items" tabindex="0">Toner</div>');
		$("div#custom-map-track").append('<div class="items" tabindex="1">Mapbox</div>');
			finderNav_tabindex = 2;
		}
		$("div#custom-map-track").append('<div class="items" tabindex="'+finderNav_tabindex+'">'+fileinfo.name+'</div>');
		$('div#finder').find('div.items[tabindex=0]').focus();


	});

	


}





function addGeoJson()
{
if ($(".items").is(":focus")) {


	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search($(document.activeElement).text());
	

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{
	//file reader

	var mygpx="";
	var reader = new FileReader();




	reader.onerror = function(event) 
	{
		alert('shit happens')
		reader.abort();
	};


	reader.onload = function(event) 
	{

	};

	reader.onloadend = function (event) 
	{

		if(myLayer)
		{
			L.removeLayer(myLayer) 
		}
		if(map_or_track == "Track")
		{
			mygpx = event.target.result
			var myLayer = L.geoJSON().addTo(map);
			myLayer.addData(JSON.parse(mygpx));
			map.setZoom(12);
			


		}

		if(map_or_track == "Map")
		{
			var mygpx = event.target.result
			if(mygpx == "Mapbox" || mygpx == "Toner")
			{
				alert("hello")
			}
		  	else
		  	{
			var myMap = L.geoJSON().addTo(map);
			myMap.addData(JSON.parse(mygpx));
			map.removeLayer(tilesLayer);
			map.setZoom(1);
			}


		}
		
		
	};


	reader.readAsText(file)
	finderNav_tabindex = -1;

	$('div#finder').css('display','none');
	windowOpen = false;
	
	});




}

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
		altitude = position.coords.altitude;

		$('div#location div#lat').text(current_lat);
		$('div#location div#lng').text(current_lng);
		$('div#location div#altitude').text(altitude);

		if(option == true)
		{

				$('div#location').css('display','block')
				windowOpen = true;
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

	$('div#man-page').css('display','block');
	$('div#man-page').find("input").focus();
	windowOpen = true;

}


function closeWindow()
{


	$('div#finder').css('display','none')
	windowOpen = false;
	$("div#custom-map-track").empty();


	$('div#man-page').css('display','none')
	windowOpen = false;


	$('div#location').css('display','none')
	windowOpen = false;



}

function ZoomMap(in_out)
{
	if(windowOpen == false)
	{
		if(in_out == "in")
		{
			map.setZoom(map.getZoom() + 1);
			zoom_level = map.getZoom();
			zoom_speed();
		}

		if(in_out == "out")
		{
			map.setZoom(map.getZoom() - 1);
			zoom_level = map.getZoom();
			zoom_speed();
		}
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


function MovemMap(direction)
{
	if(windowOpen == false)
	{
		if(direction == "left")
		{
			zoom_speed()
			$('div#location div#lat').text(current_lat);
			$('div#location div#lng').text(current_lng);
			current_lng = current_lng - step;
			map.panTo( new L.LatLng(current_lat, current_lng));
		}

		if(direction == "right")
		{
			zoom_speed()
			$('div#location div#lat').text(current_lat);
			$('div#location div#lng').text(current_lng);
			current_lng = current_lng + step;
			map.panTo( new L.LatLng(current_lat, current_lng));
		}

		if(direction == "up")
		{
			zoom_speed()
			$('div#location div#lat').text(current_lat);
			$('div#location div#lng').text(current_lng);
			current_lat = current_lat + step;
			map.panTo( new L.LatLng(current_lat, current_lng));

		}

		if(direction == "down")
		{
			zoom_speed()
			$('div#location div#lat').text(current_lat);
			$('div#location div#lng').text(current_lng);
			current_lat = current_lat - step;
			map.panTo( new L.LatLng(current_lat, current_lng));

		}
	}

}


function nav (move) {
var items = document.querySelectorAll('.items');
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

	if(move == "-1" &&  i > 0)
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



//KEYPAD TRIGGER


function handleKeyDown(evt) {


		switch (evt.key) {

		case 'SoftLeft':
			ZoomMap("in");
			closeWindow();
		break;

		case 'SoftRight':
			ZoomMap("out");
        break;

        case 'Enter':
        addGeoJson();

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
        	startFinder(".json","Track");
        break; 

        case '4':
        	startFinder(".json","Map");	
        break;

        case '5':
        	updateMarker(true);
        break;


		case 'ArrowRight':
			MovemMap("right")
		break; 

		case 'ArrowLeft':
			MovemMap("left")
		break; 

		case 'ArrowUp':
			MovemMap("up")
			nav("-1");
		break; 

		case 'ArrowDown':
			MovemMap("down")
			nav("+1")
		break; 

	}

};



document.addEventListener('keydown', handleKeyDown);




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






