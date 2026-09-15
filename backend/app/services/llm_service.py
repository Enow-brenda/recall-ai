"""LLM service — context-aware query rewriting + cited answer generation.

Public API (used by conversation/search routers):
    rewrite_query(history, followup) -> str
        Turns a follow-up ("…and the signed version?") into a standalone search
        query by replaying the recent history into a cheap LLM call. With no
        history it returns the follow-up verbatim (identity — the query is
        already standalone). Never raises: a failed call returns the raw
        follow-up so search still runs.

    answer(question, sources) -> str
        Builds a prompt where each source is numbered [1..n] (sender, subject,
        date, snippet) and asks the provider to produce a short, cited answer where
        every factual sentence carries the matching [n] marker. Empty sources →
        "" (nothing to cite). Raises LLMQuotaLimited when the provider's quota
        is exhausted and LLMGenerationFailed on other generation errors, so the
        router can show the user an accurate message instead of a vague one.

Provider selection: OpenRouter (OPENROUTER_API_KEY, free :free models, ~50
requests/day) is used for generation when configured; Gemini is always the
final fallback. Gemini models: primary gemini-3.6-flash, falling back to
gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash when the API key
rejects the newer one (probed once, cached) or exhausts its per-model daily
quota (429). Embeddings always stay on Gemini.
"""
import logging
from collections.abc import Sequence
from typing import Any

import httpx

from app.config import settings
from app.services.embedding_service import get_genai_client

logger = logging.getLogger(__name__)

PRIMARY_MODEL = "gemini-3.6-flash"
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
REWRITE_TEMP = 0.0
ANSWER_TEMP = 0.2

_models_cache: list[str] | None = None


class LLMQuotaLimited(Exception):
    """Generation failed because the AI provider's quota/rate limit is exhausted."""


class LLMGenerationFailed(Exception):
    """Generation failed for reasons other than quota (API, network, parse)."""


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


def _models_for_turn() -> list[str]:
    """Ordered models to try for one generation — primary first, deduped."""
    available = _available_models()
    ordered: list[str] = []
    for name in [PRIMARY_MODEL, *FALLBACK_MODELS]:
        if f"models/{name}" in available and name not in ordered:
            ordered.append(name)
    return ordered or [PRIMARY_MODEL]


def _is_quota_error(exc: Exception) -> bool:
    try:
        status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if status == 429:
            return True
    except Exception:
        pass
    text = str(exc) or ""
    return "429" in text or "RESOURCE_EXHAUSTED" in text


def _gemini_generate(prompt: str, *, temperature: float) -> str:
    """Runs one Gemini generation, cycling to a fallback model on 429 (per-model
    quota is separate for each model). Returns "" on a successful-but-empty
    response and raises LLMQuotaLimited / LLMGenerationFailed if every attempt
    fails."""
    models = _models_for_turn()
    last_error: Exception | None = None
    for model in models:
        try:
            resp = get_genai_client().models.generate_content(
                model=model,
                contents=prompt,
                config={"temperature": temperature},
            )
            return getattr(resp, "text", "") or ""
        except Exception as exc:
            last_error = exc
            logger.warning("LLM generate failed on %s: %s", model, exc)
            if not _is_quota_error(exc):
                break  # non-quota failure — a different model won't help
    if _is_quota_error(last_error):
        raise LLMQuotaLimited(f"AI quota exhausted: {last_error}") from last_error
    raise LLMGenerationFailed(f"LLM generate failed: {last_error}") from last_error


def _openrouter_chat(prompt: str, *, temperature: float) -> str:
    """One chat completion against OpenRouter's OpenAI-compatible endpoint."""
    key = settings.openrouter_api_key
    if not key:
        raise LLMGenerationFailed("OpenRouter is not configured (set OPENROUTER_API_KEY)")
    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Recall, an assistant that answers strictly from the "
                    "user's own emails using the provided sources. Never invent details."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "stream": False,
    }
    resp = httpx.post(
        f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60.0,
    )
    if resp.status_code >= 400:
        detail = resp.text[:300]
        if resp.status_code in (402, 429):
            raise LLMQuotaLimited(f"OpenRouter {resp.status_code}: {detail}")
        raise LLMGenerationFailed(f"OpenRouter {resp.status_code}: {detail}")
    try:
        return resp.json()["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def _prefer_openrouter() -> bool:
    mode = settings.llm_provider
    if mode == "gemini":
        return False
    if mode == "openrouter":
        return True
    return bool(settings.openrouter_api_key)


def _generation_chain() -> list:
    """Provider order for one generation: OpenRouter when configured, then
    Gemini as the always-present final fallback."""
    mode = settings.llm_provider
    chain: list = []
    if mode != "gemini" and _prefer_openrouter():
        chain.append(_openrouter_chat)
    chain.append(_gemini_generate)
    return chain


def _generate(prompt: str, *, temperature: float) -> str:
    """Runs one generation through the configured provider chain (OpenRouter →
    Gemini), moving to the next provider if one fails."""
    chain = _generation_chain()
    last_error: Exception | None = None
    for fn in chain:
        try:
            return fn(prompt, temperature=temperature)
        except Exception as exc:
            last_error = exc
            logger.warning("%s failed (%s); next provider", fn.__name__, exc)
    raise last_error


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
    try:
        return _generate(prompt, temperature=REWRITE_TEMP) or q
    except Exception:
        return q


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
        "You are Recall, an email-search assistant that answers only from the "
        "user's own emails — not a general chatbot.\n"
        "Rules:\n"
        "- Only use the numbered sources below; never invent details.\n"
        "- Never introduce yourself, and don't chit-chat: for greetings or "
        "off-topic messages reply with one short neutral sentence and no [n] "
        "citations.\n"
        "- Cite each fact with its matching [n] marker at the end of the "
        "sentence it supports.\n"
        "- If the answer is not in the sources, say you couldn't find it in "
        "their email history.\n"
        "- Answer in a few short paragraphs.\n\n"
        f"Sources:\n{source_text}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    try:
        return _generate(prompt, temperature=ANSWER_TEMP)
    except Exception as exc:
        logger.warning("Answer generation failed: %s", exc)
        raise
