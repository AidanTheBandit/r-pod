#!/usr/bin/env python3
"""
Generate headers_auth.json from curl command or raw headers
Usage: python generate_ytm_headers.py
Then paste your curl command or headers and press Ctrl+D
"""
import re
import json
import sys

def parse_curl_headers(curl_string):
    """Extract headers from curl command"""
    # Extract -H 'Header: value' or --header 'Header: value'
    header_re = re.compile(r"-H\s+[\"']?([^\s\"']+):\s*([^\s\"']+)[\"']?")
    headers = {}
    for m in header_re.finditer(curl_string):
        k, v = m.groups()
        headers[k.strip()] = v.strip()
    return headers

def parse_raw_headers_block(headers_block):
    """Parse raw headers block (Header: value per line)"""
    headers = {}
    for line in headers_block.strip().splitlines():
        if ':' in line:
            k,v = line.split(':',1)
            headers[k.strip()] = v.strip()
    return headers

def parse_cookie_string(cookie_string):
    """Parse cookie string from -b flag"""
    cookies = {}
    for cookie_pair in cookie_string.split('; '):
        if '=' in cookie_pair:
            name, value = cookie_pair.split('=', 1)
            cookies[name.strip()] = value.strip()
    return cookies

if __name__ == "__main__":
    print("Paste your full curl command (or only the -H lines, or raw headers block), then hit Ctrl-D (Linux/Mac) or Ctrl-Z (Windows):")
    curls = sys.stdin.read()

    headers = {}

    if "curl " in curls:
        # Parse curl command
        headers = parse_curl_headers(curls)

        # Also parse cookies from -b flag
        cookie_re = re.compile(r"-b\s+[\"']([^\"']+)[\"']")
        cookie_match = cookie_re.search(curls)
        if cookie_match:
            cookie_string = cookie_match.group(1)
            cookies = parse_cookie_string(cookie_string)
            headers['Cookie'] = '; '.join([f"{k}={v}" for k, v in cookies.items()])

    else:
        # Parse raw headers
        headers = parse_raw_headers_block(curls)

    # Guarantee ytmusicapi-style (fix some Firefox renames)
    if "x-origin" in headers and "X-Origin" not in headers:
        headers["X-Origin"] = headers["x-origin"]
    if "cookie" in headers and "Cookie" not in headers:
        headers["Cookie"] = headers["cookie"]

    # Remove unneeded/unwanted headers
    for h in ["Content-Length", "Host", "Connection"]:
        headers.pop(h, None)

    # Save
    with open("headers_auth.json", "w") as f:
        json.dump(headers, f, indent=2)

    print("\n[+] headers_auth.json created and ready for ytmusicapi!\n")
    print("Sample usage:")
    print('  from ytmusicapi import YTMusic')
    print('  ytm = YTMusic("headers_auth.json", "BRAND_ACCOUNT_ID")  # Add brand ID if needed')
    print(f"\nGenerated headers: {len(headers)} headers")