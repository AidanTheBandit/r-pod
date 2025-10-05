#!/bin/bash

# YouTube Music Cookie Extractor from curl command
# Usage: ./extract_cookies.sh <curl_command_file> or paste curl command

echo "YouTube Music Cookie Extractor"
echo "=============================="
echo ""

if [ $# -eq 0 ]; then
    echo "Paste your curl command (press Ctrl+D when done):"
    curl_command=$(cat)
else
    curl_command=$(cat "$1")
fi

echo "Extracting cookies from curl command..."
echo ""

# Extract the cookie string from the -b flag
cookie_string=$(echo "$curl_command" | sed -n "s/.* -b '\([^']*\)'.*/\1/p")

if [ -z "$cookie_string" ]; then
    echo "❌ No cookie string found in curl command"
    echo ""
    echo "Make sure your curl command includes a -b flag with cookies."
    exit 1
fi

echo "✅ Found cookie string!"
echo ""
echo "Cookie String:"
echo "$cookie_string"
echo ""

# Save to a file for easy copying
cookie_file="extracted_cookies.txt"
echo "$cookie_string" > "$cookie_file"

echo "📄 Saved to: $cookie_file"
echo ""

# Also create a Python snippet for easy integration
python_snippet="        self.cookie = \"$cookie_string\""

echo "🐍 Python snippet for youtube_music_aggregator.py:"
echo "$python_snippet"
echo ""

# Save Python snippet too
python_file="cookie_python_snippet.txt"
echo "$python_snippet" > "$python_file"
echo "📄 Python snippet saved to: $python_file"
echo ""

echo "Next steps:"
echo "1. Copy the cookie string above"
echo "2. Update the cookie in youtube_music_aggregator.py"
echo "3. Restart the backend server"
echo ""

echo "🎉 Done! Your YouTube Music authentication should now work."