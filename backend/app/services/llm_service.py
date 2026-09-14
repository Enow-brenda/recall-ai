"""LLM service — context-aware query rewriting + cited answer generation.

Public API (used by conversation/search routers):
    rewrite_query(history, followup) -> str
        Turns a follow-up ("…and the signed version?") into a standalone search
        query by replaying the recent history into a cheap Gemini call. With no
        history it returns the follow-up verbatim (identity — the query is
        already standalone). Never raises: a failed call returns the raw
        follow-up so search still runs.

    answer(question, sources) -> str
        Builds a prompt where each source is numbered [1..n] (sender, subject,
        date, snippet) and asks Gemini to produce a short, cited answer where
        every factual sentence carries the matching [n] marker. Empty sources →
        "" (nothing to cite). Never raises: a failed call returns "" and the
        router surfaces a plain "couldn't answer" 502 instead of crashing.

Model selection: primary gemini-3.6-flash, falling back to gemini-2.5-flash /
gemini-2.0-flash / gemini-1.5-flash when the API key rejects the newer one
(probed once, cached).
"""
import logging
from collections.abc import Sequence
from typing import Any

from app.services.embedding_service import get_genai_client

logger = logging.getLogger(__name__)

PRIMARY_MODEL = "gemini-3.6-flash"
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
REWRITE_TEMP = 0.0
ANSWER_TEMP = 0.2

_models_cache: list[str] | None = None


def _available_models() -> list[str]:
    global _models_cache
    if _models_cache is None:
        try:
            _models_cache = [
                m.name for m in get_genai_client().models.list()
                if m.name.startswith("models/gemini-")
            ]
        except Exception:
            _models_cache = []
        logger.debug("gemini models available: %s", _models_cache)
    return _models_cache


def _pick_model() -> str:
    for name in [PRIMARY_MODEL, *FALLBACK_MODELS]:
        for available in (_available_models() or []):
            if f"models/{name}" == available:
                return name
    return PRIMARY_MODEL


def _generate(prompt: str, *, temperature: float) -> str:
    try:
        resp = get_genai_client().models.generate_content(
            model=_pick_model(),
            contents=prompt,
            config={"temperature": temperature},
        )
        return getattr(resp, "text", "") or ""
    except Exception as exc:
        logger.error("LLM generate failed: %s", exc)
        return ""


def rewrite_query(history: Sequence[dict] | None, followup: str) -> str:
    """Rewrite a follow-up into a standalone query. Identity when no history."""
    q = (followup or "").strip()
    if not history:
        return q

    transcript = "\n".join(
        f"{m.get('direction', 'user')}: {m.get('content', '')}" for m in history
    )
    prompt = (
        "You rewrite a user's follow-up into a standalone search query over "
        "their email archive. Use the chat history only to resolve missing "
        "context (pronouns, implicit subjects); say nothing that isn't in the "
        "history. Reply with ONLY the rewritten query.\n\n"
        f"History:\n{transcript}\n\n"
        f"Follow-up: {q}\n\n"
        "Rewritten query:"
    )
    return _generate(prompt, temperature=REWRITE_TEMP) or q


def answer(question: str, sources: Sequence[dict]) -> str:
    """Cited answer over numbered sources [1..n]. "" if no sources / on error."""
    if not sources:
        return ""

    blocks = []
    for i, src in enumerate(sources, start=1):
        blocks.append(
            f"[{i}] From: {src.get('sender') or 'unknown'} | "
            f"Subject: {src.get('subject') or '(no subject)'} | "
            f"Date: {src.get('sent_at') or 'n/a'}\n"
            f"    {src.get('snippet') or ''}"
        )
    source_text = "\n\n".join(blocks)

    prompt = (
        "You are Recall, an assistant that answers strictly from the user's "
        "own emails.\n"
        "Rules:\n"
        "- Only use the numbered sources below; never invent details.\n"
        "- Cite each fact with its matching [n] marker at the end of the "
        "sentence it supports.\n"
        "- If the answer is not in the sources, say you couldn't find it in "
        "their email history.\n"
        "- Answer in a few short paragraphs.\n\n"
        f"Sources:\n{source_text}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    return _generate(prompt, temperature=ANSWER_TEMP)
