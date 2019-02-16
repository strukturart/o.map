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
var finderNav_tabindex = -1;
var i = 0;
var map_or_track;
var windowOpen = false;
var message_body = "";
var openweather_api = "";



$("div#window-status").text(windowOpen);

//get Openweather Api Key
var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search("openweather.json");

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{
		//file reader

		var apiKey="";
		var reader = new FileReader();

		reader.onerror = function(event) 
				{
					alert('shit happens')
					reader.abort();
				};

				reader.onloadend = function (event) 
				{

						apiKey = event.target.result
						
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
						        
						    }

						}
								var data = JSON.parse(apiKey);
								openweather_api  = data.api_key;

				};
				reader.readAsText(file)
			});
		


//leaflet add basic map
var map = L.map('map-container', {
  zoomControl: false,
  dragging: false,
  keyboard: true
}).fitWorld();

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

function owm_map()
{
	
	var tilesUrl = 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid='+openweather_api;

	//var tilesUrl = 'http://maps.openweathermap.org/maps/2.0/weather/PA0/{z}/{x}/{y}?appid='+openweather_api;
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
		$('div#location div#altitude').text("alt "+altitude.toFixed(5));


if(openweather_api != "")
{
	var hello =$.getJSON( "https://api.openweathermap.org/data/2.5/forecast?lat="+current_lat+"&lon="+current_lng+"&units=metric&APPID="+openweather_api, function(data) {
	// Success
	}).done( function(data) {

	
		var degree = data.list[0].wind.deg;
		var wind_dir = "";

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
//cloning elements
var template = $("section#forecast-0")
for (var i = 1; i < 20; i++) { 

	template.clone()
	.attr("id","forecast-"+i)
	.appendTo('div#weather');
	
}



for (var i = 0; i < 20; i++) { 

var day = moment.unix(data.list[i].dt).format("DD");
	
if(Math.ceil(day/2) == day/2)
{
	$('div#location section#forecast-'+i).addClass('day-style-2');
} 
else 
{
	$('div#location section#forecast-'+i).addClass('day-style-1');
}
	var date_format = moment.unix(data.list[i].dt).format("ddd DD MMM hh:mm")



				$('div#location section#forecast-'+i+' div#temp').text(Math.round(data.list[i].main.temp)+"°");
				$('div#location section#forecast-'+i+' div#wind div#wind-speed div#wind-speed-val').text(data.list[i].wind.speed);
				$('div#location section#forecast-'+i+' div#wind div#wind-dir').text(wind_dir);
				$('div#location section#forecast-'+i+' div#pressure div#pressure-val').text(Math.round(data.list[i].main.pressure));
				//$('div#location section#forecast-'+i+' div.title div#forecast-time').text(data.list[i].dt_txt);
				$('div#location section#forecast-'+i+' div.title div.forecast-time').text(date_format);
				$('div#location section#forecast-'+i+' div#icon img').attr("src","https://openweathermap.org/img/w/"+data.list[i].weather[0].icon+".png");


}

var tmp_0 = Math.round(data.list[4].main.temp)
var tmp_1 = Math.round(data.list[5].main.temp)
var tmp_2 = Math.round(data.list[6].main.temp)
var tmp_3 = Math.round(data.list[7].main.temp)
var tmp_4 = Math.round(data.list[8].main.temp)

var rain_0 = Math.round(data.list[4].rain)
var rain_1 = Math.round(data.list[5].rain)
var rain_2 = Math.round(data.list[6].rain)
var rain_3 = Math.round(data.list[7].rain)
var rain_4 = Math.round(data.list[8].rain)

var date_0 = moment.unix(data.list[4].dt).format("HH:mm")
var date_1 = moment.unix(data.list[5].dt).format("HH:mm")
var date_2 = moment.unix(data.list[6].dt).format("HH:mm")
var date_3 = moment.unix(data.list[7].dt).format("HH:mm")
var date_4 = moment.unix(data.list[8].dt).format("HH:mm")





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



function startFinder(search_string)
{					
	finderNav_tabindex = -1;
	$("div#custom-map-track").empty();
	windowOpen = true;
	
	i = 0;
	//get file list
	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search(search_string);

	finder.on("searchBegin", function (needle) 
	{
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
		$("div#custom-map-track").append('<div class="items" data-map="toner" tabindex="0">Toner <i>Map</i></div>');
		$("div#custom-map-track").append('<div class="items" data-map="mapbox" tabindex="1">Mapbox <i>Map</i></div>');
		$("div#custom-map-track").append('<div class="items" data-map="osm" tabindex="2">OSM <i>Map</i></div>');
		if(openweather_api != "")
		{
			$("div#custom-map-track").append('<div class="items" data-map="owm" tabindex="3">Weather <i>Map</i></div>');
		}
			finderNav_tabindex = 4;
		}
		$("div#custom-map-track").append('<div class="items" tabindex="'+finderNav_tabindex+'">'+fileinfo.name+'</div>');
		$('div#finder').find('div.items[tabindex=0]').focus();


	});


}




function addGeoJson()
{
	if ($(".items").is(":focus")) 
	{
		//switch online maps
		var item_value = $(document.activeElement).data('map');
		if(item_value == "toner" || item_value =="mapbox" || item_value =="owm" || item_value =="osm")
		{
			if(item_value == "toner")
			{
				map.removeLayer(tilesLayer);
				toner_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}
			if(item_value == "mapbox")
			{
				map.removeLayer(tilesLayer);
				mapbox_map();
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
						   
						    console.log(JSON.parse(mygpx));
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
	if($('.leaflet-control-search').css('display')=='none')
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
          showSearch();
        break;

        case '3':
        	startFinder(".json");
        break; 

        case '4':
        	
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






