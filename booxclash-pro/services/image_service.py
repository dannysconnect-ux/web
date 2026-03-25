# Change the import from 'google.generativeai' to 'google'
from google import genai 
from google.genai import types
from core.config import settings
import base64

# This will now work with the google-genai package
client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def generate_fast_image(prompt: str) -> str:
    print(f"🎨 Painting: {prompt}")
    try:
        # Corrected method for the new SDK
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1", # Exams usually look better with 1:1 or 4:3
                output_mime_type="image/jpeg"
            )
        )
        
        image_bytes = response.generated_images[0].image.image_bytes
        base64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        return f"data:image/jpeg;base64,{base64_img}"
        
    except Exception as e:
        print(f"❌ Image Gen Error: {e}")
        return "https://placehold.co/600x400?text=Image+Generation+Failed"