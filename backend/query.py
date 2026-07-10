"""
Generate an answer using the local ollama model
RAG query engine - Embeds the question and retrieves the permitted chunks from chroma DB.
"""
import asyncio
import chromadb
from  chromadb.config import Settings
import config
import ollama_client

chroma_client = chromadb.PersistentClient(
    path=config.CHROMA_PERSIST_DIR,
    settings=Settings(anonymized_telemetry=False)
)

collection = chroma_client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)

SYSTEM_PROMPT = """/no_think
You are a helpful document assistant. Answer questions using ONLY the document excerpts provided below.

Rules:
- Use ONLY the information in the provided excerpts
- If the information is not in the excerpts, say "I cannot find this in the available document excerpts"
- Never say you don't have "permission" — you have full access to all provided excerpts
- Always mention which document your answer came from
- Be concise and direct
- Never refuse to search through the provided excerpts"""

async def answer_question(
        question: str,
        user_id: int,
        top_k: int = 5,
) -> dict:
    """
    Full RAG pipeline:
    Embed the question -> Search ChromaDB (Filtered by permission) -> Feed retrieved chunks to ollama -> Return answer + sources
    """
    question_vector = await ollama_client.embed_text(question)
    results = collection.query(
        query_embeddings=[question_vector],
        n_results=top_k,
        where={
            "$or": [
                {"owner_id" : {"$eq" : user_id}},
                {"owner_id" : {"$eq" : str(user_id)}},
                {"visibility" : {"$eq" : "shared"}},
            ]
        },
        include=["documents", "metadatas", "distances"],
    )

    chunks = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []

    if not chunks:
        return {
            "answer" : "I couldn't find any relevant information in your documents.",
            "sources" : [],
        }
    
    relevant = [
        (chunk, meta)
        for chunk, meta, dist in zip(chunks, metadatas, distances)
        if dist < 1.5
    ]

    if not relevant:
        return{
            "answer" : "I couldn't find relevant information about this in your document.",
            "sources" : [],
        }
    
    context_parts = []
    sources = []

    for chunk, meta in relevant:
        filename = meta.get("filename", "Unknown document")
        context_parts.append(f"[From: {filename}]\n{chunk}")
        if filename not in sources:
            sources.append(filename)
    context = "\n\n---\n\n".join(context_parts)

    user_prompt = f"""Document excerpts:
{context}

---

Question: {question}

Answer based only on the document above:"""
    
    answer = await ollama_client.generate_answer(SYSTEM_PROMPT, user_prompt)

    return {
        "answer" : answer,
        "sources" : sources,
    }


