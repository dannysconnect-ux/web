import httpx
import re

async def get_wiki_content_with_images(topic: str):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124"}
    base_url = "https://en.wikipedia.org/w/api.php"
    
    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            # 1. Parse 
            params = {
                "action": "parse", 
                "page": topic, 
                "format": "json", 
                "prop": "text|images", 
                "redirects": 1
            }
            resp = await client.get(base_url, params=params)
            data = resp.json().get("parse", {})
            html_content = data.get("text", {}).get("*", "")
            
            # Filter out icons and SVGs to get actual photos/diagrams
            raw_images = data.get("images", [])
            filtered_images = [
                img for img in raw_images 
                if not img.lower().endswith(('.svg', '.png')) 
                and 'icon' not in img.lower()
                and 'logo' not in img.lower()
            ]

            # 2. Extract full URLs for the top 5 valid images
            image_urls = []
            if filtered_images:
                # Wikipedia API requires "File:" prefix for title queries
                titles = "|".join([f"File:{i}" for i in filtered_images[:5]])
                img_query = {
                    "action": "query", 
                    "format": "json", 
                    "titles": titles, 
                    "prop": "imageinfo", 
                    "iiprop": "url"
                }
                img_resp = await client.get(base_url, params=img_query)
                pages = img_resp.json().get("query", {}).get("pages", {})
                
                for p in pages.values():
                    if "imageinfo" in p:
                        image_urls.append(p["imageinfo"][0]["url"])

            # 3. Interleave Logic: Split text by paragraphs and insert images
            # Using a cleaner regex to find paragraphs
            paragraphs = re.findall(r'<p>(.*?)</p>', html_content, re.DOTALL)
            flow = []
            
            for i, p_text in enumerate(paragraphs[:8]):  # Increased limit slightly
                # Remove HTML tags and citation brackets like [1]
                clean_p = re.sub(r'<.*?>|\[.*?\]', '', p_text).strip()
                
                if len(clean_p) > 100:  # Only keep substantial paragraphs
                    flow.append({"type": "explanation", "content": clean_p})
                    
                    # Insert an image every 2 paragraphs if available
                    if i % 2 == 0 and image_urls:
                        img = image_urls.pop(0)
                        flow.append({
                            "type": "image", 
                            "content": img,
                            "is_gif": img.lower().endswith('.gif')
                        })

            return {"topic": topic, "flow": flow}
            
    except Exception as e:
        print(f"Error fetching Wiki content: {e}")
        return None