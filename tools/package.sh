#!/bin/bash
set -e #fail on error

mkdir -p ../build/tmp

rm ../build/tmp/application.zip || true
rm ../build/omap.zip || true

echo "{\"version\": 1,\"manifestURL\":\"app://omap.org/manifest.webapp\"}" > ../build/tmp/metadata.json


cd ../build/app
zip -qr ../tmp/application.zip .

cd ../tmp
zip -qr ../omap.zip .

echo "Created omap.zip"