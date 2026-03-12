import google.generativeai as genai
from google.genai import types
from core.config import settings
import base64

client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def generate_fast_image(prompt: str) -> str:
    print(f"🎨 Painting: {prompt}")
    try:
        # CORRECT METHOD: Use the Image Generation model, not the text model
        response = client.models.generate_images(
            model='imagen-3.0-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9"
            )
        )
        
        # Imagen returns a generated_image object
        image_bytes = response.generated_images[0].image.image_bytes
        base64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        return f"data:image/jpeg;base64,{base64_img}"
        
    except Exception as e:
        print(f"❌ Image Gen Error: {e}")
        # Fallback to a placeholder if it fails (keeps app from crashing)
        return "https://placehold.co/600x400?text=Image+Generation+Failed"