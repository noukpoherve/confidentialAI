from dataclasses import dataclass
from typing import NotRequired, TypedDict

from app.agents.ac import run_ac
from app.agents.afe import run_afe
from app.agents.llm_classifier import run_llm_classifier
from app.agents.vector_search_node import run_prompt_vector_search
from app.agents.avs import run_avs
from app.agents.toxicity_analyzer import run_toxicity_analyzer
from app.core.config import settings
from app.core.detectors import apply_redactions
from app.core.policy_engine import PolicyDecision
from langgraph.graph import END, START, StateGraph


class PromptGraphState(TypedDict):
    prompt: str                               # original — never modified
    anonymized_prompt: NotRequired[str]       # prompt with all local-layer redactions applied
    user_consent: bool | None
    user_id: NotRequired[str | None]
    decision: NotRequired[PolicyDecision]
    visited: NotRequired[list[str]]
    skip_llm_classifier: NotRequired[bool]


class ResponseGraphState(TypedDict):
    response_text: str
    decision: NotRequired[PolicyDecision]
    visited: NotRequired[list[str]]


@dataclass
class AgentExecution:
    decision: PolicyDecision
    graph_trace: list[str]


def _prompt_afe_node(state: PromptGraphState) -> PromptGraphState:
    """
    Run AFE (regex + URL protection + spaCy NER + GLiNER).
    Immediately build the anonymized_prompt so every downstream node
    works with PII-free text — especially the LLM classifier.
    """
    decision = run_afe(
        prompt=state["prompt"],
        user_consent=state["user_consent"],
        user_id=state.get("user_id"),
    )
    # Apply all local redactions to produce a safe, anonymized version of the prompt.
    anonymized = apply_redactions(state["prompt"], decision.redactions)
    return {
        "decision": decision,
        "anonymized_prompt": anonymized,
        "visited": [*state.get("visited", []), "afe"],
    }


def _prompt_ac_node(state: PromptGraphState) -> PromptGraphState:
    decision = run_ac(state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "ac"]}


def _prompt_toxicity_node(state: PromptGraphState) -> PromptGraphState:
    """
    Toxicity uses the ORIGINAL prompt: we want to detect and suggest rephrases
    for the raw language, not for already-masked placeholders.
    """
    decision = run_toxicity_analyzer(text=state["prompt"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "toxicity_analyzer"]}


def _prompt_llm_classifier_node(state: PromptGraphState) -> PromptGraphState:
    """
    LLM classifier receives the PRE-ANONYMIZED prompt, never raw PII.

    Local layers (regex, spaCy, GLiNER) have already replaced known sensitive
    values with placeholders like [REDACTED_API_KEY], [PERSONNE], [EMAIL], etc.
    The LLM's role here is purely contextual / semantic:
      - Detect PII combinations that are only risky together
        (e.g. "[PERSONNE] on floor 3, badge 4521")
      - Detect confidential business context ("Q2 launch is top secret")
      - Detect LEGAL_HR framing around anonymized entities
      - Detect prompt injection attempts not caught by regex

    The LLM is skipped entirely when the local layers already produced a BLOCK.
    """
    text_for_llm = state.get("anonymized_prompt") or state["prompt"]
    decision = run_llm_classifier(text=text_for_llm, decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "llm_classifier"]}


def _prompt_vector_search_node(state: PromptGraphState) -> PromptGraphState:
    decision, skip = run_prompt_vector_search(state["prompt"], state["decision"])
    return {
        "decision": decision,
        "skip_llm_classifier": skip,
        "visited": [*state.get("visited", []), "vector_search"],
    }


def _route_prompt_after_vector_search(state: PromptGraphState) -> str:
    """
    Skip the LLM classifier when:
    - Vector search found a semantically similar past BLOCK/WARN (skip_llm_classifier=True).
    - Local layers already produced a BLOCK decision — the data is definitely sensitive,
      no need to spend an LLM call confirming it.
    """
    if state.get("skip_llm_classifier"):
        return "ac"
    decision = state.get("decision")
    if decision and decision.action == "BLOCK":
        return "ac"
    return "llm_classifier"


def _response_avs_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_avs(response_text=state["response_text"])
    return {"decision": decision, "visited": [*state.get("visited", []), "avs"]}


def _response_ac_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_ac(state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "ac"]}


def _response_toxicity_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_toxicity_analyzer(text=state["response_text"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "toxicity_analyzer"]}


def _response_llm_classifier_node(state: ResponseGraphState) -> ResponseGraphState:
    """
    For AI responses the LLM moral classifier scans for harmful content only
    (SEXUAL, VIOLENCE, HATE, SELF_HARM, etc.) — not PII, which is handled on
    the prompt side. The response_moral=True flag enforces this scope.
    """
    decision = run_llm_classifier(
        text=state["response_text"], decision=state["decision"], response_moral=True
    )
    return {"decision": decision, "visited": [*state.get("visited", []), "llm_classifier"]}


def _route_after_ac(state: PromptGraphState | ResponseGraphState) -> str:
    """
    Conditional routing after the Arbitration Controller (shared by both pipelines).

    Skip the toxicity analyzer when:
    - The feature is disabled in settings.
    - The security decision is already BLOCK.
    """
    if not settings.toxicity_analyzer_enabled:
        return "end"
    decision = state.get("decision")
    if decision and decision.action == "BLOCK":
        return "end"
    return "toxicity_analyzer"


# Typed aliases so add_conditional_edges receives the exact state type it expects.
_route_prompt_after_ac = _route_after_ac
_route_response_after_ac = _route_after_ac


def _build_prompt_graph():
    graph = StateGraph(PromptGraphState)
    graph.add_node("afe", _prompt_afe_node)
    graph.add_node("vector_search", _prompt_vector_search_node)
    graph.add_node("llm_classifier", _prompt_llm_classifier_node)
    graph.add_node("ac", _prompt_ac_node)
    graph.add_node("toxicity_analyzer", _prompt_toxicity_node)
    graph.add_edge(START, "afe")
    graph.add_edge("afe", "vector_search")
    graph.add_conditional_edges(
        "vector_search",
        _route_prompt_after_vector_search,
        {"llm_classifier": "llm_classifier", "ac": "ac"},
    )
    graph.add_edge("llm_classifier", "ac")
    graph.add_conditional_edges(
        "ac",
        _route_prompt_after_ac,
        {"toxicity_analyzer": "toxicity_analyzer", "end": END},
    )
    graph.add_edge("toxicity_analyzer", END)
    return graph.compile()


def _build_response_graph():
    graph = StateGraph(ResponseGraphState)
    graph.add_node("avs", _response_avs_node)
    graph.add_node("llm_classifier", _response_llm_classifier_node)
    graph.add_node("ac", _response_ac_node)
    graph.add_node("toxicity_analyzer", _response_toxicity_node)
    graph.add_edge(START, "avs")
    graph.add_edge("avs", "llm_classifier")
    graph.add_edge("llm_classifier", "ac")
    graph.add_conditional_edges(
        "ac",
        _route_response_after_ac,
        {"toxicity_analyzer": "toxicity_analyzer", "end": END},
    )
    graph.add_edge("toxicity_analyzer", END)
    return graph.compile()


_prompt_graph = _build_prompt_graph()
_response_graph = _build_response_graph()


def analyze_prompt_with_agents(
    prompt: str, user_consent: bool | None, user_id: str | None = None
) -> AgentExecution:
    """
    Prompt security pipeline — privacy-first, LLM as last resort.

    1. AFE   — regex + protected URLs + spaCy NER + GLiNER (all local, no API calls).
               Builds anonymized_prompt: a version with all detected PII replaced by
               placeholders ([REDACTED_EMAIL], [PERSONNE], [CREDIT_CARD], …).

    2. Vector search — semantic shortcut: if the (original) prompt is similar to a
               past BLOCK/WARN incident, escalate immediately and skip the LLM.

    3. LLM classifier — ONLY reached when local layers did NOT produce a BLOCK and
               no vector match was found.  Receives the ANONYMIZED prompt, never raw
               PII.  Its role: detect contextual/semantic risks invisible to regex/NER
               (PII combinations, confidential business context, LEGAL_HR framing,
               prompt injection variants).

    4. AC    — arbitration pass for ambiguous medium-risk decisions.

    5. Toxicity analyzer — rephrase suggestions for offensive language (non-BLOCK only).
    """
    result = _prompt_graph.invoke(
        {"prompt": prompt, "user_consent": user_consent, "user_id": user_id, "visited": []}
    )
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))


def validate_response_with_agents(response_text: str) -> AgentExecution:
    """
    Response safety pipeline.

    1. AVS    — regex stage: profanity and known harmful URLs only.
    2. LLM classifier (response_moral=True) — harmful content classification:
               SEXUAL, VIOLENCE, HATE, SELF_HARM, CHILD_SAFETY, EXTREMISM, ILLEGAL_ACTIVITY.
               PII in responses is out of scope here (covered by the prompt pipeline).
    3. AC     — arbitration.
    4. Toxicity analyzer — detects hate/aggression in AI-generated text.
    """
    result = _response_graph.invoke({"response_text": response_text, "visited": []})
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))
