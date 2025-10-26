#!/usr/bin/env python3
"""
Test script for Cobalt API integration
Tests the new multi-layer streaming approach
"""
import asyncio
import httpx

async def test_cobalt_api(video_id: str = "Zl9o1QWHXko"):
    """Test Cobalt API directly"""
    print(f"Testing Cobalt API with video ID: {video_id}")
    print("=" * 60)
    
    cobalt_instances = [
        "https://api.cobalt.tools/api/json",
        "https://co.wuk.sh/api/json",
    ]
    
    payload = {
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "aFormat": "best",
        "isAudioOnly": True
    }
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    for i, instance in enumerate(cobalt_instances, 1):
        print(f"\n[{i}] Trying instance: {instance}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    instance,
                    json=payload,
                    headers=headers
                )
                
                print(f"    Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"    Response: {data}")
                    
                    status = data.get("status")
                    url = data.get("url")
                    
                    if status in ["stream", "redirect", "tunnel"] and url:
                        print(f"    ✓ SUCCESS! Got {status} URL")
                        print(f"    URL: {url[:100]}...")
                        return url
                    elif status == "error":
                        error_text = data.get("text", "Unknown error")
                        print(f"    ✗ Error: {error_text}")
                    else:
                        print(f"    ⚠ Unexpected status: {status}")
                else:
                    print(f"    ✗ HTTP error")
                    
        except asyncio.TimeoutError:
            print(f"    ✗ Timeout")
        except httpx.ConnectError:
            print(f"    ✗ Connection failed")
        except Exception as e:
            print(f"    ✗ Error: {e}")
    
    print("\n✗ All instances failed")
    return None

async def test_cobalt_vs_ytdlp():
    """Compare Cobalt vs yt-dlp performance"""
    import time
    
    video_id = "Zl9o1QWHXko"
    
    print("\n" + "=" * 60)
    print("Performance Comparison: Cobalt API vs yt-dlp")
    print("=" * 60)
    
    # Test Cobalt
    print("\n[1] Testing Cobalt API...")
    start = time.time()
    cobalt_url = await test_cobalt_api(video_id)
    cobalt_time = time.time() - start
    print(f"    Time: {cobalt_time:.2f}s")
    
    # Test yt-dlp (basic)
    print("\n[2] Testing yt-dlp (basic)...")
    try:
        import yt_dlp
        start = time.time()
        
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
            ytdlp_url = info.get('url') if info else None
        
        ytdlp_time = time.time() - start
        
        if ytdlp_url:
            print(f"    ✓ SUCCESS!")
            print(f"    Time: {ytdlp_time:.2f}s")
        else:
            print(f"    ✗ Failed to get URL")
            ytdlp_time = None
            
    except Exception as e:
        print(f"    ✗ Error: {e}")
        ytdlp_time = None
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Cobalt API:  {'✓ Success' if cobalt_url else '✗ Failed':20} ({cobalt_time:.2f}s)")
    if ytdlp_time:
        print(f"yt-dlp:      {'✓ Success':20} ({ytdlp_time:.2f}s)")
        speedup = ytdlp_time / cobalt_time if cobalt_url and cobalt_time > 0 else 0
        if speedup > 1:
            print(f"\nCobalt is {speedup:.1f}x faster!")
        elif speedup > 0:
            print(f"\nyt-dlp is {1/speedup:.1f}x faster!")
    else:
        print(f"yt-dlp:      ✗ Failed")
    
    print("=" * 60)

if __name__ == "__main__":
    print("\n🎵 Cobalt API Integration Test")
    print("Testing multi-layer streaming approach\n")
    
    # Run tests
    asyncio.run(test_cobalt_vs_ytdlp())
    
    print("\n✅ Test complete!")