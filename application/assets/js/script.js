$(document).ready(function() {


//Global Vars
var step = 0.001;
var current_lng = 0;
var current_lat = 0;
var accuracy = 0;
var altitude = 0;

var zoom_level = 18;
var current_zoom_level = 18;
var new_lat = 0;
var new_lng = 0;
var curPos = 0;
var myMarker = "";
var i = 0;
var map_or_track;
var windowOpen = false;
var message_body = "";
var openweather_api = "";
var default_position_lat = "";
var default_position_long = "";
var tabIndex = 0;
var debug = true;



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

var rain_image_url = [];
var rain_image_url_time = [];
var loop= -1;
var init = true;
var rainlayer;

function get_rain_images()
{
	for(var i = 1; i < 270; i++)
	{
	rain_weather_url = moment().subtract(i, 'minute').format('YYYYMMDD.HHmm') 
	rain_time = moment().subtract(i, 'minute').format('YYYY-MM-DD,HH:mm') 

	var filter = moment().subtract(i, 'minute').format('mm') 
	if(filter == 15 || filter == 30 || filter == 45 || filter == 0)
	 {
	   //first 8 not because no image exist 
	   if(i >8)
	   {
	   
	  //push urls's in array
		rain_image_url.push ("http://www.radareu.cz/data/radar/radar.anim."+rain_weather_url+".0.png");
		rain_image_url_time.push (rain_time);
	 }
	 } 
	}
	rain_image_url.reverse()
	rain_image_url_time.reverse()

}

get_rain_images()



function remove_layer()
{
	map.eachLayer(function (layer) 
	{
		map.removeLayer(layer);
		$("div#output").css("display","none")
	});
}

var rainlayer0;
var rainlayer1;
var rainlayer2;
var rainlayer3;
var rainlayer4;
var rainlayer5;

var rainlayers = [rainlayer0,rainlayer1,rainlayer2,rainlayer3,rainlayer4,rainlayer5]


function remove_rain_overlayers()
{
	/*
	for (var i =0; 0 < rainlayers.length+1; i++)
	if (map.hasLayer(rainlayers[i])) 
	{
		map.removeLayer(rainlayers[i]);
	}

	*/

	if (map.hasLayer(rainlayer0)) 
	{
		map.removeLayer(rainlayer0);
	}

	if (map.hasLayer(rainlayer1)) 
	{
		map.removeLayer(rainlayer1);
	}
	if (map.hasLayer(rainlayer2)) 
	{
		map.removeLayer(rainlayer2);
	}
	if (map.hasLayer(rainlayer3)) 
	{
		map.removeLayer(rainlayer3);
	}
	if (map.hasLayer(rainlayer4)) 
	{
		map.removeLayer(rainlayer4);
	}
	if (map.hasLayer(rainlayer5)) 
	{
		map.removeLayer(rainlayer5);
	}
	
}



function rain_layer()
{ 
	if(windowOpen == "rainmap")
	{
		loop++;
		imageBounds = [[72.62025190354672,-14.618225054687514],[30.968189526345665,45.314636273437486]];
			$("div#output").css("display","block")

			if(loop == 0)
			{
				if(map.hasLayer(rainlayer0) == false)
				{
					rainlayer0 = L.imageOverlay(rain_image_url[0], imageBounds).addTo(map);

					rainlayer0.on("load", function (event) {
						rainlayer0.setOpacity(0.5);
					});
					rainlayer0.on("error", function (event) {
						alert("image can't load")
					});
				}
		
				else
				{
					rainlayer5.setOpacity(0.0);
					rainlayer0.setOpacity(0.5);
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}	


			

			if(loop == 1)
			{
				if(map.hasLayer(rainlayer1) == false)
				{
					rainlayer1 = L.imageOverlay(rain_image_url[1], imageBounds).addTo(map);

					rainlayer1.on("load", function (event) {
						rainlayer0.setOpacity(0.0);
						rainlayer1.setOpacity(0.5);
					});
					rainlayer1.on("error", function (event) {
						alert("image can't load")
					});
				}
				else
				{
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.5);
					
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}


			


			if(loop == 2)
			{
				if(map.hasLayer(rainlayer2) == false)
				{
					rainlayer2 = L.imageOverlay(rain_image_url[2], imageBounds).addTo(map);

					rainlayer2.on("load", function (event) {
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.0);
					rainlayer2.setOpacity(0.5);
					});
					rainlayer2.on("error", function (event) {
						alert("image can't load")
					});

				}
				else
				{
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.0);
					rainlayer2.setOpacity(0.5);	
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}	


			if(loop == 3)
			{
				if(map.hasLayer(rainlayer3) == false)
				{
					rainlayer3 = L.imageOverlay(rain_image_url[3], imageBounds).addTo(map);

					rainlayer3.on("load", function (event) {
						rainlayer2.setOpacity(0.0);
						rainlayer3.setOpacity(0.5);
					});
					rainlayer3.on("error", function (event) {
						alert("image can't load")
					});
				}
				else
				{
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.0);
					rainlayer2.setOpacity(0.0);	
					rainlayer3.setOpacity(0.5);
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}	


			if(loop == 4)
			{
				if(map.hasLayer(rainlayer4) == false)
				{
					rainlayer4 = L.imageOverlay(rain_image_url[4], imageBounds).addTo(map);

					rainlayer4.on("load", function (event) {
						rainlayer3.setOpacity(0.0);
						rainlayer4.setOpacity(0.5);
					});
					rainlayer4.on("error", function (event) {
						alert("image can't load")
					});
				}
				else
				{
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.0);
					rainlayer2.setOpacity(0.0);	
					rainlayer3.setOpacity(0.0);
					rainlayer4.setOpacity(0.5);
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}


			if(loop == 5)
			{
				if(map.hasLayer(rainlayer5) == false)
				{
					rainlayer5 = L.imageOverlay(rain_image_url[5], imageBounds).addTo(map);

					rainlayer5.on("load", function (event) {
						rainlayer4.setOpacity(0.0);
						rainlayer5.setOpacity(0.5);
					});
					rainlayer5.on("error", function (event) {
						alert("image can't load")
					});
				}
				else
				{
					rainlayer0.setOpacity(0.0);
					rainlayer1.setOpacity(0.0);
					rainlayer2.setOpacity(0.0);	
					rainlayer3.setOpacity(0.0);
					rainlayer4.setOpacity(0.0);
					rainlayer5.setOpacity(0.5);
				}

			$("div#output").text("");
			$("div#output").text(rain_image_url_time[loop]);
			}


		if(loop == 5)
		{
			loop = -1
		}
	}


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

								var markers_group = L.featureGroup();
								map.addLayer(markers_group);

								$.each(data, function (index, value) {

									if(value.lat)
									{
										$("div#markers").append('<div class="items" data-map="marker" data-lat="' + value.lat +'" data-lng="' + value.lng +'">' + value.marker_name +'</div>');
									}
									
									if(value.api_key)
									{
										openweather_api = value.api_key;
									}

									
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
		

		$('div#message').css("display","none")

	},4000);



function getLocation(option) 
{

var options = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

function success(pos) 
{
	var crd = pos.coords;

	current_lat = crd.latitude;
	current_lng = crd.longitude;
	current_alt = crd.altitude;
	accuracy = crd.accuracy;

	if(option == "share")
	{
		share_position()

	}

		if(option == "init")
		{
			
			myMarker = L.marker([current_lat,current_lng]).addTo(map);
			map.setView([current_lat, current_lng], 13);
			zoom_speed();


			setTimeout(function() 
			{
					$('div#location').css('display','none')
					$('div#message div').text("");
					$('div#message').css('display', 'none');
			},4000);
			
			return false;
		}

		if(option == "updateMarker")
		{

		myMarker.setLatLng([current_lat, current_lng]).update();
		map.flyTo( new L.LatLng(current_lat, current_lng),16);
		zoom_speed()

		$('div#location div#lat').text("Lat "+current_lat.toFixed(5));
		$('div#location div#lng').text("Lng "+current_lng.toFixed(5));
		/*
		if(altitude != null)
		{
			$('div#location div#altitude').text("alt "+altitude.toFixed(5));
		}
	*/
		}

}

function error(err) {
  alert(err.code +" / "+err.message);
}



navigator.geolocation.getCurrentPosition(success, error, options);

}



getLocation("init")



///////////////////////////////
////send current position by sms
///////////////////////////////

function share_position()
{

	message_body = "https://www.openstreetmap.org/?mlat="+current_lat+"&mlon="+current_lng+"&zoom=14#map=14/"+current_lat+"/"+current_lng;

	
	
		var sms = new MozActivity({
		name: "new",
		data: {
		type: "websms/sms",
		number: "",
		body: ".."+ message_body
		}
		});
	
	
	}



//////////////////////////////////
////LOAD GEOSON & SWITCH MAPS/////
//////////////////////////////////



function startFinder()
{			
	
	
	

	$("div#tracks").empty();
	$("div#maps").empty();
	$("div#layers").empty();
	$("div#output").css("display","none")
	//get file list
	var finder = new Applait.Finder({ type: "sdcard", debugMode: true });
	finder.search(".geojson");



	finder.on("searchComplete", function (needle, filematchcount) 
	{

	$("div#maps").append('<div class="items" data-map="toner">Toner <i>Map</i></div>');
	$("div#maps").append('<div class="items" data-map="osm">OSM <i>Map</i></div>');
	$("div#layers").append('<div class="items" data-map="rain">Rain</div>');

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
		tabIndex = 0;


	});

	

	finder.on("fileFound", function (file, fileinfo, storageName) 
	{

	$("div#tracks").append('<div class="items">'+fileinfo.name+'</div>');

	});

}




function addMapLayers()
{
	if ($(".items").is(":focus") && windowOpen == true) 
	{
	
		

	
		//switch online maps
		var item_value = $(document.activeElement).data('map');

		if(item_value == "toner"  || item_value =="owm" || item_value =="osm" || item_value =="marker" || item_value =="rain" || item_value =="share")
		{

			if(item_value == "toner")
			{
				//remove_layer();
				map.removeLayer(tilesLayer);
				remove_rain_overlayers();
				toner_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}


			if(item_value == "osm")
			{
				remove_rain_overlayers();
				map.removeLayer(tilesLayer);
				osm_map();
				$('div#finder').css('display','none');
				windowOpen = false;
			}

			if(item_value == "rain")
			{
				remove_rain_overlayers();
				map.removeLayer(tilesLayer);
				osm_map();
				rain_layer();
				map.setZoom(3);
				$('div#finder').css('display','none');
				windowOpen = "rainmap";


			}


			if(item_value == "owm")
			{
				remove_rain_overlayers();
				map.removeLayer(tilesLayer);
				osm_map();
				owm_map();
				$('div#finder').css('display','none');
				$("div#output").css("display","block")
				windowOpen = false;
			}

			if(item_value == "share")
			{
				remove_rain_overlayers();
				osm_map();
				getLocation("share")

			}

			if(item_value == "marker")
			{
				current_lng = $(document.activeElement).data('lng');
				current_lat = $(document.activeElement).data('lat');

				L.marker([current_lat , current_lng]).addTo(map);
				map.setView([current_lat , current_lng], 13);

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

				var geojson_data="";
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

						geojson_data = event.target.result
						
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
								myLayer.addData(JSON.parse(geojson_data));
								map.setZoom(10);
								windowOpen = false;
		

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
	if(windowOpen != true)
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
	if(windowOpen == true)
	{



		var items = document.querySelectorAll('.items');
		if(move == "+1")
		{
			if(tabIndex < items.length-1)
			{
				
					tabIndex++
					$('div#finder div.items[tabindex='+tabIndex+']').focus()

			}
		}


		if(move == "-1")
		{
			if(tabIndex > 0)
		
			{
				tabIndex--
				$('div#finder div.items[tabindex='+tabIndex+']').focus()
				
			}
		}
	}

}







//////////////////////////
////KEYPAD TRIGGER////////////
/////////////////////////



function handleKeyDown(evt) {


		switch (evt.key) {

		case 'Backspace':
		evt.preventDefault();
		if(windowOpen == false)
		{
			window.close()
		}
		if(windowOpen == true)
		{
			$('div#finder').css('display','none');
			windowOpen = false;
		}
		break;

		case 'SoftLeft':
			killSearch();
			ZoomMap("in");
			unload_map(false);
			closeWindow();
		break;

		case 'SoftRight':
			ZoomMap("out");
			unload_map(true);
		break;

		case 'Enter':
			addMapLayers();
			rain_layer();
		break;

		case '0':
		break; 


		case '1':
			getLocation("updateMarker") 
		break;

		case '2':
			evt.preventDefault()
			showSearch();
		break;

		case '3':
			evt.preventDefault()
			startFinder();
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


