![logo](/images/logo.png)

O.Map is an openstreetmap app for KaiOS, it is a good companion for your next outdoor adventure.

![badge-release](https://img.shields.io/github/v/release/strukturart/o.map?include_prereleases&style=plastic)
![badge-downloads](https://img.shields.io/github/downloads/strukturart/o.map/total)
[![badge-bhackers](https://img.shields.io/badge/bHackers-bHackerStore-orange)](https://store.bananahackers.net/#omap)

### Features

- Map online/offline
- share your position
- Import Tracks (geoJson / gpx)
- Export marker/path (geoJson)
- Save your position
- open .gpx files
- open geoJSON files
- follow path
- search locations
- rainradar
- weather
- open openstreetmap link
- tracking
- draw track

![image-1](/images/thumbs.svg)

## Maps

- Openstreetmap
- Open Topo Map

## Layers

- rain/snow layer

### Manual

- **Soft-keys** Zoom the map
- **Cursor** Moving the map
- **key 0** share position
- **key 1** center map
- **key 2** search
- **key enter** open menu
- **key 3** routing
- **key 4** auto center map
- **key 5** set marker
- **key #** offline mode - download map tiles
- **key \*** jump between markers
- **key Backspace** close: Menu,measure distance,info panel

## custom maps and layer

you have the possibility to use your own maps/layers.
For this you have to create a JSON file with the following structure:

```javascript
[
  {
    name: "Hiking",
    type: "overlayer",
    url: "http://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
    attribution: "hiking.waymarkedtrails.org",
    maxzoom: 18,
  },

  {
    name: "Google Satelite",
    type: "map",
    url: "http://mt0.google.com/vt/lyrs=r&hl=en&x={x}&y={y}&z={z}",
    attribution: "Google",
    maxzoom: 18,
  },

  {
    name: "climbing",
    type: "overpass",
    url: "sport=climbing",
    attribution: "Overpass",
    maxzoom: 18,
  },

  {
    name: "water",
    type: "overpass",
    url: "amenity=drinking_water",
    attribution: "Overpass",
    maxzoom: 18,
  },
];
```

you can also add an overpass layer, https://taginfo.openstreetmap.org/ you add the tags in the key url.

you can find an example file here: [omap_maps.json](omap_maps.json)

### Good to know

If you use the tiles intentisv cache, the app can slow down from around 400mb. The solution is to delete the cache via the app menu.

## Desktop Version

https://omap.strukturart.com

## How to install

- KaiOS Store
- Sideloading <a href="https://www.martinkaptein.com/blog/sideloading-and-deploying-apps-to-kai-os/">step-by-step article</a> by martinkaptein

### Build your own

Installing the dependencies<br>
`npm -i`

Build KaiOS 3 app<br>
`npm run build`<br>

Build KaiOS 2 app<br>
`npm run build-k2`<br>

If you want to create a browser version<br>
`npm run web`

### Thank you

- Openstreetmap
- OpenTopoMap
- https://openrouteservice.org/
- https://www.rainviewer.com/api.html
- https://github.com/MazeMap/Leaflet.TileLayer.PouchDBCached
- leaflet.js

### LICENSES

This software (except KaiAds) is open source and licensed under the MIT License. View the source code.
OpenStreetMap is a trademark of the OpenStreetMap Foundation. o.map is not endorsed by or affiliated with the OpenStreetMap Foundation.

- o.map [UNLICENSE](UNLICENSE)
- Leaflet - BSD-2-Clause License
- leaflet.tilelayer.pouchdbcached MIT license
- OpenStreetMap®
- Overpass [Affero GPL](https://github.com/drolbr/Overpass-API/blob/master/COPYING)

### Privacy Policy

KaiOS

This software uses KaiAds. This is a third party service that may collect information used to identify you. Pricacy policy of KaiAds.

### other map apps for KaiOS

https://wiki.openstreetmap.org/wiki/KaiOS

## Donation

If you use the app often, please donate an amount to me.

<a href="https://liberapay.com/perry_______/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a>
