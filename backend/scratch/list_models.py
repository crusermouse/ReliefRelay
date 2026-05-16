import os
from google import genai
from config import settings

client = genai.Client(api_key=settings.GOOGLE_API_KEY)
for model in client.models.list():
    if "gemma" in model.name.lower():
        print(model.name)
