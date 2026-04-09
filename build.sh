#!/bin/sh

# Create default app zip
rm -rf build
mkdir build
(cd application && zip -r ../build/o.map.zip ./*)

(cd application && zip -r ../build/o.map-kaios3.zip ./* -x ./manifest.webapp)

# Create bHaCkers zip
cp build/o.map.zip build/application.zip
echo '{ "version": 1, "manifestURL": "app://o.map/manifest.webapp" }' > build/metadata.json
zip build/o.map-omnisd.zip -j build/metadata.json build/application.zip

# Copy website files to docs directory
cp -r application/* docs/
rm -f docs/manifest.webapp
