import asyncio
from config import settings
from google import genai
from google.genai import types

async def run():
    client = genai.Client(
        api_key=settings.GOOGLE_API_KEY,
        http_options={'api_version': 'v1beta'}
    )
    google_tools = [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_weather",
                    description="Get the weather for a location.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "location": {"type": "string"}
                        },
                        "required": ["location"]
                    }
                )
            ]
        )
    ]
    config = types.GenerateContentConfig(
        tools=google_tools,
        temperature=1.0,
    )
    print("Sending request...")
    try:
        res = await client.aio.models.generate_content(
            model='gemma-4-26b-a4b-it',
            contents='What is the weather in Paris?',
            config=config
        )
        print("Response parts:")
        if res.candidates:
            for part in res.candidates[0].content.parts:
                print(" - ", part)
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    asyncio.run(run())
