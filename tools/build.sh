#!/bin/bash
set -e #fail on error
mkdir -p ../build/app
rm -rf ../build/app/* || true

# copy folders
mkdir -p ../build/app/assets
cp -r ../application/assets/css ../build/app/assets/css
cp -r ../application/icons ../build/app/icons
#cp -r ../application/assets/exclude-js ../build/app/assets/exclude-js

# copy metadata file
cp ../application/manifest.webapp ../build/app/manifest.webapp

# minify js 
# documentation under https://terser.org/docs/cli-usage
npx terser ../application/assets/js/*.js ../application/app.js \
    -o ../build/app/bundle.min.js \
    --source-map "url='bundle.min.js.map',root='application/',includeSources=true"\
    --ecma 5

# copy index file
#cp ./application/index.html ./build/app/index.html

# copy all html file
cp ../application/*.html ../build/app/