"""
Unified Multi-Provider LLM Client for Regulatory Sector Impact Analysis.
Supports Google Gemini, OpenAI, Anthropic Claude, and local Ollama,
with automatic resilient fallback to the built-in Heuristic Reasoner.
"""

import json
import logging
import re
import time
from typing import Optional, Dict, Any
import httpx

from .config import config
from .models import (
    AnnouncementAnalysis, SectorImpact, SectorCategory,
    DirectionalBias, SeverityLevel, ImpactHorizon
)
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .heuristic_engine import analyze_with_heuristics

logger = logging.getLogger("GuptcharAI")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [AI] %(message)s")


class LLMClient:
    def __init__(self):
        self.timeout = config.TIMEOUT_SECONDS

    def has_ai_api_key(self) -> bool:
        """Returns True if any supported LLM provider API key is validly configured."""
        provider = config.get_active_provider()
        if provider == "gemini" and config.is_valid_key(config.GEMINI_API_KEY):
            return True
        if provider == "openai" and config.is_valid_key(config.OPENAI_API_KEY):
            return True
        if provider == "anthropic" and config.is_valid_key(config.ANTHROPIC_API_KEY):
            return True
        if provider == "ollama":
            return True
        return False

    async def generate_completion(
        self,
        prompt: str,
        system_instruction: str = "You are an expert financial regulatory intelligence and corporate compliance officer.",
        temperature: float = 0.2
    ) -> Optional[str]:
        """Direct text completion using the active AI provider."""
        provider = config.get_active_provider()
        try:
            if provider == "gemini" and config.GEMINI_API_KEY:
                endpoint = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
                )
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {"temperature": temperature}
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()

            elif provider == "openai" and config.OPENAI_API_KEY:
                endpoint = f"{config.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
                headers = {"Authorization": f"Bearer {config.OPENAI_API_KEY}", "Content-Type": "application/json"}
                payload = {
                    "model": config.OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": temperature
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload, headers=headers)
                    res.raise_for_status()
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()

            elif provider == "anthropic" and config.ANTHROPIC_API_KEY:
                endpoint = "https://api.anthropic.com/v1/messages"
                headers = {"x-api-key": config.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
                payload = {
                    "model": config.ANTHROPIC_MODEL,
                    "system": system_instruction,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1500,
                    "temperature": temperature
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload, headers=headers)
                    res.raise_for_status()
                    data = res.json()
                    return data["content"][0]["text"].strip()

            elif provider == "ollama":
                endpoint = f"{config.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
                payload = {
                    "model": config.OLLAMA_MODEL,
                    "system": system_instruction,
                    "prompt": prompt,
                    "stream": False
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    return data.get("response", "").strip()

        except Exception as e:
            logger.warning(f"AI completion generation error ({e}).")

        return None

    async def analyze(
        self,
        announcement_id: str,
        title: str,
        authority: str,
        jurisdiction: str,
        summary: str = "",
        url: str = ""
    ) -> AnnouncementAnalysis:
        """
        Attempts analysis using active LLM provider.
        Automatically falls back to Heuristic Engine only if no AI API key is configured or API call errors.
        """
        start_time = time.time()
        active_provider = config.get_active_provider()
        user_prompt = build_user_prompt(title, authority, jurisdiction, summary, url)

        parsed_json: Optional[Dict[str, Any]] = None
        model_name_used = active_provider

        if active_provider == "gemini" and config.is_valid_key(config.GEMINI_API_KEY):
            try:
                parsed_json = await self._call_gemini(user_prompt)
                model_name_used = f"gemini/{config.GEMINI_MODEL}"
            except Exception as e:
                logger.warning(f"⚠️ [AI Key Error / Quota Exceeded] Gemini API call failed ({e}). Automatically transitioning to default Heuristic Reasoner.")

        elif active_provider == "openai" and config.is_valid_key(config.OPENAI_API_KEY):
            try:
                parsed_json = await self._call_openai(user_prompt)
                model_name_used = f"openai/{config.OPENAI_MODEL}"
            except Exception as e:
                logger.warning(f"⚠️ [AI Key Error / Quota Exceeded] OpenAI API call failed ({e}). Automatically transitioning to default Heuristic Reasoner.")

        elif active_provider == "anthropic" and config.is_valid_key(config.ANTHROPIC_API_KEY):
            try:
                parsed_json = await self._call_anthropic(user_prompt)
                model_name_used = f"anthropic/{config.ANTHROPIC_MODEL}"
            except Exception as e:
                logger.warning(f"⚠️ [AI Key Error / Quota Exceeded] Anthropic API call failed ({e}). Automatically transitioning to default Heuristic Reasoner.")

        elif active_provider == "ollama":
            try:
                parsed_json = await self._call_ollama(user_prompt)
                model_name_used = f"ollama/{config.OLLAMA_MODEL}"
            except Exception as e:
                logger.warning(f"⚠️ [Local AI Notice] Ollama connection failed ({e}). Automatically transitioning to default Heuristic Reasoner.")

        # If LLM succeeded and produced valid JSON, parse into AnnouncementAnalysis
        if parsed_json:
            try:
                analysis = self._map_json_to_analysis(
                    announcement_id, title, authority, jurisdiction,
                    parsed_json, model_name_used, start_time
                )
                return analysis
            except Exception as e:
                logger.warning(f"Failed to parse LLM JSON output ({e}). Falling back to Heuristic Reasoner.")

        # Fallback to Heuristic Rule Engine
        return analyze_with_heuristics(
            announcement_id=announcement_id,
            title=title,
            authority=authority,
            jurisdiction=jurisdiction,
            summary=summary,
            url=url
        )

    async def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        """Calls Google Gemini REST API using generateContent with system instruction."""
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{config.GEMINI_MODEL}:generateContent?key={config.GEMINI_API_KEY}"
        )
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(endpoint, json=payload)
            res.raise_for_status()
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return self._extract_json(raw_text)

    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Calls OpenAI or OpenAI-compatible endpoint."""
        endpoint = f"{config.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": config.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(endpoint, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            raw_text = data["choices"][0]["message"]["content"]
            return self._extract_json(raw_text)

    async def _call_anthropic(self, prompt: str) -> Dict[str, Any]:
        """Calls Anthropic Claude Messages API."""
        endpoint = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": config.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": config.ANTHROPIC_MODEL,
            "system": SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1500,
            "temperature": 0.1
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(endpoint, json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            raw_text = data["content"][0]["text"]
            return self._extract_json(raw_text)

    async def _call_ollama(self, prompt: str) -> Dict[str, Any]:
        """Calls local Ollama instance."""
        endpoint = f"{config.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        payload = {
            "model": config.OLLAMA_MODEL,
            "system": SYSTEM_PROMPT,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(endpoint, json=payload)
            res.raise_for_status()
            data = res.json()
            raw_text = data.get("response", "")
            return self._extract_json(raw_text)

    def _extract_json(self, raw_text: str) -> Dict[str, Any]:
        """Extracts JSON object from model response, handling markdown blocks if present."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
        return json.loads(cleaned.strip())

    def _map_json_to_analysis(
        self,
        announcement_id: str,
        title: str,
        authority: str,
        jurisdiction: str,
        data: Dict[str, Any],
        model_name: str,
        start_time: float
    ) -> AnnouncementAnalysis:
        """Constructs an AnnouncementAnalysis instance from JSON payload."""
        impacted_sectors: list[SectorImpact] = []

        # Find closest valid SectorCategory enum
        def safe_sector_enum(name: str) -> SectorCategory:
            for s in SectorCategory:
                if s.value.lower() in name.lower() or name.lower() in s.value.lower():
                    return s
            return SectorCategory.CAPITAL_MARKETS

        def safe_enum(val: str, enum_cls, default):
            try:
                return enum_cls(val.upper())
            except Exception:
                return default

        for item in data.get("impacted_sectors", []):
            sec_enum = safe_sector_enum(item.get("sector", ""))
            bias_enum = safe_enum(item.get("directional_bias", ""), DirectionalBias, DirectionalBias.NEUTRAL)
            sev_enum = safe_enum(item.get("severity", ""), SeverityLevel, SeverityLevel.HIGH)
            horiz_enum = safe_enum(item.get("horizon", ""), ImpactHorizon, ImpactHorizon.SHORT_TERM)

            impacted_sectors.append(SectorImpact(
                sector=sec_enum,
                impact_score=float(item.get("impact_score", 6.5)),
                directional_bias=bias_enum,
                severity=sev_enum,
                horizon=horiz_enum,
                rationale=item.get("rationale", "Subject to official regulatory directive."),
                affected_entities=item.get("affected_entities", []),
                key_compliance_actions=item.get("key_compliance_actions", [])
            ))

        primary_sector_raw = data.get("primary_sector", "")
        primary_sector = safe_sector_enum(primary_sector_raw) if primary_sector_raw else (
            impacted_sectors[0].sector if impacted_sectors else SectorCategory.CAPITAL_MARKETS
        )

        latency = round((time.time() - start_time) * 1000, 2)

        return AnnouncementAnalysis(
            announcement_id=announcement_id,
            title=title,
            authority=authority,
            jurisdiction=jurisdiction,
            overall_impact_score=float(data.get("overall_impact_score", 7.0)),
            primary_sector=primary_sector,
            impacted_sectors=impacted_sectors,
            executive_summary=data.get("executive_summary", "Regulatory directive published by authority."),
            key_provisions=data.get("key_provisions", []),
            compliance_urgency=data.get("compliance_urgency", "STANDARD_WINDOW"),
            effective_deadline=data.get("effective_deadline"),
            market_sentiment=data.get("market_sentiment", "NEUTRAL"),
            model_provider_used=model_name,
            latency_ms=latency,
            confidence_score=float(data.get("confidence_score", 0.90)),
            raw_response=data
        )

llm_client = LLMClient()
