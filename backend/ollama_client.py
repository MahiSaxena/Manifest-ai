import asyncio
import httpx
import config

_ollama_semaphore = asyncio.Semaphore(config.MAX_CONCURRENT_OLLAMA_REQUESTS)

async def embed_text(text: str) -> list[float]:
    async with _ollama_semaphore:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{config.OLLAMA_BASE_URL}/api/embeddings",
                json={"model": config.OLLAMA_EMBED_MODEL,"prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]
    
async def generate_answer(system_prompt: str, user_prompt: str) -> str:
    async with _ollama_semaphore:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{config.OLLAMA_BASE_URL}/api/chat",
                json ={
                    "model": config.OLLAMA_CHAT_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},

                    ],
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            response.raise_for_status()
            return response.json()["message"]["content"]
        
async def check_ollama_reachable() -> bool:
    try:
        async with httpx.AsyncClient(timeout = 5.0) as client:
            response = await client.get(f"{config.OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False

