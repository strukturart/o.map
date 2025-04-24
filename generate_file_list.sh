#!/bin/bash

# Set the output JSON file name
OUTPUT_FILE="./docs/file-list.json"
DOCS_DIR="./docs"

# Start the JSON array
echo "[" > "$OUTPUT_FILE"

# Find all files in the docs directory and its subdirectories
# Exclude directories and format the output as JSON
find "$DOCS_DIR" -type f | while read -r file; do
    # Replace the leading "./docs/" with "" to keep the relative path for the JSON file
    relative_path=${file#"$DOCS_DIR/"}

    # Escape double quotes and backslashes in file names for JSON format
    escaped_file=$(printf '%s\n' "$relative_path" | sed 's/\\/\\\\/g; s/"/\\"/g')

    echo "\"/$escaped_file\"," >> "$OUTPUT_FILE"
done

# Remove the trailing comma from the last line
sed -i '$ s/,$//' "$OUTPUT_FILE"

# Close the JSON array
echo "]" >> "$OUTPUT_FILE"

echo "File list generated: $OUTPUT_FILE"

