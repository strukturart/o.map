 $(document).ready(function() {


//Global Vars
var step = 0.001;
var current_lng = 0;
var current_lat = 0;
var zoom_level = 18;
var current_zoom_level = 18;
var altitude = "not found";
var new_lat = 0;
var new_lng = 0;
var curPos = 0;
var myMarker = "";
var finderNav_tabindex = 0;
var i = 0;
var map_or_track;
var windowOpen = false;
var message_body = "";
var openweather_api = "";



$("div#window-status").text(windowOpen);


//leaflet add basic map
var map = L.map('map-container', {
  zoomControl: false,
  dragging: false,
  keyboard: true
}).fitWorld();

L.control.scale({position:'topright',metric:true,imperial:false}).addTo(map);


////////////////////
////MAPS////////////
///////////////////

function toner_map()
{
	var tilesUrl = 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
	tilesLayer = L.tileLayer(tilesUrl,{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'	
	});

	map.addLayer(tilesLayer);

}



function owm_map()
{
	
	var tilesUrl = 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid='+openweather_api;
	tilesLayer = L.tileLayer(tilesUrl,{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'	
	});

	map.addLayer(tilesLayer);
}


function osm_map()
{
	var tilesUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
	tilesLayer = L.tileLayer(tilesUrl,{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
	'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'	
	});

	map.addLayer(tilesLayer);
}


osm_map()


/////////////////////////
//get Openweather Api Key
/////////////////////////
function read_json()
{
	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search("osm-map.json");


	finder.on("empty", function (needle) 
	{
		alert("no sdcard found");
		return;
	});

	finder.on("searchComplete", function (needle, filematchcount) 
	{
		
		if(filematchcount == 0)
		{
			//alert("no markers.json file found");
			return;
		}
	})

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{
		//file reader

		var markers_file="";
		var reader = new FileReader()


		reader.onerror = function(event) 
				{
					alert('shit happens')
					reader.abort();
				};

				reader.onloadend = function (event) 
				{

						markers_file = event.target.result
						
						//check if json valid
						var printError = function(error, explicit) {
						console.log("[${explicit ? 'EXPLICIT' : 'INEXPLICIT'}] ${error.name}: ${error.message}");
						}

						try {
						} catch(e) {
						if (e instanceof SyntaxError) {
						alert("Json file is not valid");
						return;
						} else {

						}

						}
								var data = JSON.parse(markers_file);
								//alert(data)

								var markers_group = L.featureGroup();
								map.addLayer(markers_group);

								$.each(data, function (index, value) {

									if(value.lat)
									{
										$("div#markers").append('<div class="items" data-map="marker" data-lat="' + value.lat +'" data-lng="' + value.lng +'">' + value.marker_name +'</div>');
									}
									openweather_api = value.api_key
								})



								

				};
				reader.readAsText(file)
			});
}
read_json()
////////////////////
////GEOLOCATION/////
///////////////////
//////////////////////////
////MARKER SET AND UPDATE/////////
/////////////////////////
$('div#message div').text("Welcome");
setTimeout(function() 
		{
			$('div#message div').text("Searching position");
		},3000);


function updateMarker(option)
{
	function getLocation() 
	{

		if (navigator.geolocation) 
		{
			var timeoutVal = 10 * 1000 * 1000;
			navigator.geolocation.getCurrentPosition
			(
				displayPosition, 
				displayError,
				{ enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
			);
		}

		else 
		{
		  alert("Geolocation is not supported by this browser");
		}

	}



	function displayPosition(position) 
	{
		if(option == true)
		{
			$('div#location').css('display','block')
			windowOpen = true;
		}

		if(option == "init")
		{
		current_lng = position.coords.longitude;
		current_lat = position.coords.latitude;
		myMarker = L.marker([current_lat,current_lng]).addTo(map);
		map.setView([position.coords.latitude, position.coords.longitude], 13);
		zoom_speed();


		setTimeout(function() 
		{
				$('div#location').css('display','none')
				$('div#message div').text("");
				$('div#message').css('display', 'none');
		},4000);

			

		return false;

		}

		myMarker.setLatLng([position.coords.latitude, position.coords.longitude]).update();
		map.flyTo( new L.LatLng(position.coords.latitude, position.coords.longitude),16);
		zoom_speed()

		current_lng = position.coords.longitude;
		current_lat = position.coords.latitude;
		altitude = position.coords.altitude;

		$('div#location div#lat').text("Lat "+current_lat.toFixed(5));
		$('div#location div#lng').text("Lng "+current_lng.toFixed(5));
		if(altitude != null)
		{
			$('div#location div#altitude').text("alt "+altitude.toFixed(5));
		}


	
		if(openweather_api == "")
		{
			 $("div#weather").css("display","none")
		}

else
{
	
	var hello =$.getJSON( "https://api.openweathermap.org/data/2.5/forecast?lat="+current_lat+"&lon="+current_lng+"&units=metric&APPID="+openweather_api, function(data) {
	// Success
	}).done( function(data) {
	var wind_dir = "";
	function direction(in_val)
	{
		var degree = data.list[in_val].wind.deg;
		

		switch (true)
		{
			case (degree>337.5):
			wind_dir = 'N';
			break;
			case (degree>292.5):
			wind_dir = 'N';
			break; 
			case (degree>247.5):
			wind_dir = 'W';
			break; 
			case (degree>202.5):
			wind_dir = 'SW';
			break; 
			case (degree>157.5):
			wind_dir = 'S';
			break; 
			case (degree>122.5):
			wind_dir = 'SE';
			break; 
			case (degree>67.5):
			wind_dir = 'E';
			break; 
			case (degree>22.5):
			wind_dir = 'NE';
		}

	}
	//cloning elements
	var template = $("section#forecast-0")
	for (var i = 1; i < 20; i++) 
	{ 

		template.clone()
		.attr("id","forecast-"+i)
		.appendTo('div#weather');
		
	}



	for (var i = 0; i < 20; i++)
	{

		var day = moment.unix(data.list[i].dt).format("DD");
			
		if(Math.ceil(day/2) == day/2)
		{
			$('div#location section#forecast-'+i).addClass('day-style-2');
		} 
		else 
		{
			$('div#location section#forecast-'+i).addClass('day-style-1');
		}
			var date_format = moment.unix(data.list[i].dt).format("ddd DD MMM HH:mm")

		direction(i)

		$('div#location section#forecast-'+i+' div#temp').text(Math.round(data.list[i].main.temp)+"°");
		$('div#location section#forecast-'+i+' div#wind div#wind-speed div#wind-speed-val').text(data.list[i].wind.speed);
		$('div#location section#forecast-'+i+' div#wind div#wind-dir').text(wind_dir);
		$('div#location section#forecast-'+i+' div#pressure div#pressure-val').text(Math.round(data.list[i].main.pressure));
		$('div#location section#forecast-'+i+' div.title div.forecast-time').text(date_format);
		$('div#location section#forecast-'+i+' div#icon img').attr("src","https://openweathermap.org/img/w/"+data.list[i].weather[0].icon+".png");


	}


	}).fail( function() {
	   alert("error api access")
	}).always( function() {
	  // Complete
	});
}


		message_body = "My position: "+"https://www.openstreetmap.org/?mlat="+current_lat+"&mlon="+current_lng+"&zoom=14#map=14/"+current_lat+"/"+current_lng;

	}

	function displayError(error) 
	{

		var errors = { 
		1: 'Permission denied',
		2: 'Position unavailable',
		3: 'Request timeout'
		};
		//alert("Error: " + errors[error.code]);
		$('div#message div').text(errors[error.code]);
		getLocation() 
	}

	getLocation();


}

	updateMarker("init")


///////////////////////////////
////send current position by sms
///////////////////////////////

function send_sms()
{
	if($('div#location').css('display') == 'block')
	{
		var sms = new MozActivity({
		name: "new",
		data: {
		type: "websms/sms",
		number: "",
		body: ".."+ message_body
		}
		});
	}
	}



//////////////////////////////////
////LOAD GEOSON & SWITCH MAPS/////
//////////////////////////////////



function startFinder()
{			
	
	
	

	$("div#tracks").empty();
	$("div#maps").empty();
	//get file list
	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search(".geojson");



	finder.on("searchComplete", function (needle, filematchcount) 
	{

	$("div#maps").append('<div class="items" data-map="toner">Toner <i>Map</i></div>');
	$("div#maps").append('<div class="items" data-map="osm">OSM <i>Map</i></div>');
	if(openweather_api != "")
	{
		$("div#maps").append('<div class="items" data-map="owm">Weather <i>Map</i></div>');
	}

	$('div.items').each(function(index, value){
		var $div = $(this)
	$div.attr("tabindex",index);
	});


		$('div#finder').css('display','block');
		$('div#finder').find('div.items[tabindex=0]').focus();
		windowOpen = true;



	});

	

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{

	$("div#tracks").append('<div class="items">'+fileinfo.name+'</div>');

	});






}




function addGeoJson()
{
	if ($(".items").is(":focus")) 
	{
		//switch online maps
		var item_value = $(document.activeElement).data('map');
		if(item_value == "toner"  || item_value =="owm" || item_value =="osm" || item_value =="marker")
		{
			if(item_value == "toner")
			{
				map.removeLayer(tilesLayer);
				toner_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}


			if(item_value == "osm")
			{
				map.removeLayer(tilesLayer);
				osm_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}


			if(item_value == "owm")
			{
				map.removeLayer(tilesLayer);
				osm_map();
				owm_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}

			if(item_value == "marker")
			{
				var item_lng = $(document.activeElement).data('lng');
				var item_lat = $(document.activeElement).data('lat');

				L.marker([item_lat , item_lng]).addTo(map);
				map.setView([item_lat, item_lng], 13);

				$('div#finder').css('display','none');
				windowOpen = false;
			}

		}

		//add geoJson data
		else
		{


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




				reader.onloadend = function (event) 
				{

					if(myLayer)
					{
						L.removeLayer(myLayer) 
					}


						mygpx = event.target.result
						
						//check if json valid
						var printError = function(error, explicit) {
						    console.log("[${explicit ? 'EXPLICIT' : 'INEXPLICIT'}] ${error.name}: ${error.message}");
						}

						try {
						   
						} catch (e) {
						    if (e instanceof SyntaxError) {
						        alert("Json file is not valid");
						        return;
						    } else {
						        alert("okay")

						    }


						}

								//if valid add layer
								$('div#finder div#question').css('opacity','1');
								var myLayer = L.geoJSON().addTo(map);
								myLayer.addData(JSON.parse(mygpx));
								map.setZoom(12);
								windowOpen == false;
		

				};


				reader.readAsText(file)

			});
		}


	}

}




//////////////////////////
////SEARCH BOX////////////
/////////////////////////

  
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
    autoCollapseTime: 1000,
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
	$('div#search').css('display','none');
	


})

map.addControl(searchControl);


$('.leaflet-control-search').css('display','none')



function showSearch()
{
	if($('.leaflet-control-search').css('display')=='none' && windowOpen == false)
	{	
		windowOpen = true;
		$("div#window-status").text(windowOpen);

		$('.leaflet-control-search').css('display','block');
		$('.leaflet-control-search').find("input").focus();
		setTimeout(function() {
			$('.leaflet-control-search').find("input").val("");
		}, 1000);
		$('div#search').css('display','block');

	}
	else
	{
	  $('.leaflet-control-search').css('display','none');
	  $('.leaflet-control-search').find("input").val("");

	}
}


function killSearch()
{

	if($('.leaflet-control-search').css('display')=='block')
	{
		$('div#search').css('display','none');
		$('.leaflet-control-search').css('display','none');
		$('.leaflet-control-search').find("input").val("");
		$('.leaflet-control-search').find("input").blur();
		//windowOpen = false;
	}

}








////////////////////////
////MAN PAGE////////////
////////////////////////



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


	$('div#man-page').css('display','none')
	windowOpen = false;


	$('div#location').css('display','none')
	windowOpen = false;





}

function ZoomMap(in_out)
{
	//remove leaflet attribution to have more space
	$('.leaflet-control-attribution').hide()

	$("div#window-status").text(windowOpen);
	var current_zoom_level = map.getZoom();
	if(windowOpen == false)
	{
		if(in_out == "in")
		{ current_zoom_level = current_zoom_level + 1
			map.setZoom(current_zoom_level);
		}

		if(in_out == "out")
		{current_zoom_level = current_zoom_level - 1
			map.setZoom(current_zoom_level);
		}
		
		zoom_level = current_zoom_level;
		zoom_speed();

	}

}




function zoom_speed()
{
	if(zoom_level < 6)
	{
	step = 1;
	}


	if(zoom_level > 6)
	{
		step = 0.1;
	}


	if(zoom_level > 11)
	{
		step = 0.001;
	}

	document.getElementById("zoom-level").innerHTML = "level "+zoom_level+" step "+step;
	return step;
}


function unload_map(trueFalse)
{
	if($("div#finder").css('display')=='block')
	{

		if(trueFalse == true)
		{
			map.removeLayer(tilesLayer);
			$('div#finder').css('display','none');
			$('div#finder div#question').css('opacity','0');
			windowOpen = false;
		}

		if(trueFalse == false)
		{
			$('div#finder').css('display','none');
			$('div#finder div#question').css('opacity','0');
			windowOpen = false;
		}
	}
}


/////////////////////
//MAP NAVIGATION//
/////////////////////


function MovemMap(direction)
{
	if(windowOpen != true)
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

//////////////////////
//FINDER NAVIGATION//
/////////////////////

function nav (move) {
	var items = document.querySelectorAll('.items');
	if(move == "+1")
	{
		//alert(i+":"+items.length)
		if(i < items.length-1)
		{
			
				i++
				var items = document.querySelectorAll('.items');
				var targetElement = items[i];
				targetElement.focus();
			
		}
	}


	if(move == "-1")
	{
		if(i > 0)
	
		{
			i--
			var items = document.querySelectorAll('.items');
			var targetElement = items[i];
			targetElement.focus();
			
		}
	}

}







//////////////////////////
////KEYPAD TRIGGER////////////
/////////////////////////



function handleKeyDown(evt) {


		switch (evt.key) {

		case 'SoftLeft':
			killSearch();
			ZoomMap("in");
			unload_map(false);
			closeWindow();
		break;

		case 'SoftRight':
			ZoomMap("out");
			unload_map(true);
			send_sms();
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
			evt.preventDefault()
			showSearch();
		break;

		case '3':
			evt.preventDefault()
			startFinder();
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


//////////////////////////
////BUG OUTPUT////////////
/////////////////////////


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






