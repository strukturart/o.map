
#!/bin/bash

# Create default app zip
cd application/
rm ../build/o.map.zip
rm ../build/o.map-kaios3.zip
zip -r ../build/o.map.zip ./*

mv manifest.webapp ../
zip -r ../build/o.map-kaios3.zip ./*
mv ../manifest.webapp ./

# Create bHaCkers zip
rm ../build/o.map-omnisd.zip
zip -r ../build/application.zip ./*
cd ../build/
mkdir -p o.map-omnisd
touch ./o.map-omnisd/metadata.json
echo '{ "version": 1, "manifestURL": "app://o.map/manifest.webapp" }' > ./o.map-omnisd/metadata.json

cp application.zip o.map-omnisd/
cd o.map-omnisd/
zip -r ../o.map-omnisd.zip ./*
rm -fr ../o.map-omnisd
cd ../
rm ./application.zip

# Copy website files to docs directory
cd ..
cp -r application/* docs/
rm docs/manifest.webapp
