export let basic_maps = [
  {
    "name": "OSM",
    "type": "map",
    "url": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "attribution":
      "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    "maxzoom": 18,
  },
  ,
  {
    "name": "Google Satelite",
    "type": "map",
    "url": "http://mt0.google.com/vt/lyrs=r&hl=en&x={x}&y={y}&z={z}",
    "attribution": "Google",
    "maxzoom": 18,
  },

  {
    "name": "OpenTopoMap",
    "type": "map",
    "url": "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    "attribution": "© OpenTopoMap (CC-BY-SA)",
    "maxzoom": 16,
  },
];

export let basic_layers = [
  {
    "name": "Hiking",
    "type": "overlayer",
    "url": "http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
    "attribution": "hiking.waymarkedtrails.org",
    "maxzoom": 18,
  },
];

export let basic_pois = [
  {
    "name": "climbing",
    "type": "overpass",
    "query": "sport=climbing",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "water",
    "type": "overpass",
    "query": "amenity=drinking_water",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Accommodation
  {
    "name": "hotels",
    "type": "overpass",
    "query": "tourism=hotel",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "hostels",
    "type": "overpass",
    "query": "tourism=hostel",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "guest houses",
    "type": "overpass",
    "query": "tourism=guest_house",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Food & Drink
  {
    "name": "restaurants",
    "type": "overpass",
    "query": "amenity=restaurant",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "cafes",
    "type": "overpass",
    "query": "amenity=cafe",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "bars",
    "type": "overpass",
    "query": "amenity=bar",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Transport
  {
    "name": "bus stations",
    "type": "overpass",
    "query": "amenity=bus_station",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "train stations",
    "type": "overpass",
    "query": "railway=station",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "car rentals",
    "type": "overpass",
    "query": "amenity=car_rental",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Activities & Tourism
  {
    "name": "museums",
    "type": "overpass",
    "query": "tourism=museum",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "viewpoints",
    "type": "overpass",
    "query": "tourism=viewpoint",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "hiking trails",
    "type": "overpass",
    "query": "route=hiking",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Services
  {
    "name": "pharmacies",
    "type": "overpass",
    "query": "amenity=pharmacy",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "hospitals",
    "type": "overpass",
    "query": "amenity=hospital",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "ATMs",
    "type": "overpass",
    "query": "amenity=atm",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "wifi",
    "type": "overpass",
    "query": "amenity=wifi",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  // Outdoor
  {
    "name": "camping",
    "type": "overpass",
    "query": "tourism=camp_site",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "picnic areas",
    "type": "overpass",
    "query": "amenity=picnic_table",
    "attribution": "Overpass",
    "maxzoom": 18,
  },

  {
    "name": "beaches",
    "type": "overpass",
    "query": "natural=beach",
    "attribution": "Overpass",
    "maxzoom": 18,
  },
];
