"""The exact prompt sent to Claude. The `prompt` trace stage shows this request body verbatim."""

from typing import Any

from highnet_rag.storage.base import Chunk

NOT_FOUND = "I can't find this in the retrieved passages."

# snippet: prompt | The prompt
SYSTEM_PROMPT = f"""You answer questions using only the documents in the user's message. \
Each document is a passage retrieved from a small corpus of English Wikipedia articles \
(the SQuAD 2.0 dev set). Cite the passages that support each claim. Do not use outside \
knowledge. If the documents do not contain the answer, reply exactly: "{NOT_FOUND}" \
Keep the answer under 120 words."""


def build_messages(question: str, chunks: list[Chunk]) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = [
        {
            "type": "document",
            "source": {"type": "content", "content": [{"type": "text", "text": chunk.text}]},
            "title": f"{chunk.doc_title} · chunk {chunk.id}",
            "citations": {"enabled": True},
        }
        for chunk in chunks
    ]
    return [
        {"role": "user", "content": [*documents, {"type": "text", "text": f"Question: {question}"}]}
    ]


# /snippet
