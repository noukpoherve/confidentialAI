from dataclasses import dataclass
from typing import NotRequired, TypedDict

from app.agents.ac import run_ac
from app.agents.afe import run_afe
from app.agents.llm_classifier import run_llm_classifier
from app.agents.avs import run_avs
from app.agents.toxicity_analyzer import run_toxicity_analyzer
from app.core.config import settings
from app.core.policy_engine import PolicyDecision
from langgraph.graph import END, START, StateGraph


class PromptGraphState(TypedDict):
    prompt: str
    user_consent: bool | None
    decision: NotRequired[PolicyDecision]
    visited: NotRequired[list[str]]


class ResponseGraphState(TypedDict):
    response_text: str
    decision: NotRequired[PolicyDecision]
    visited: NotRequired[list[str]]


@dataclass
class AgentExecution:
    decision: PolicyDecision
    graph_trace: list[str]


def _prompt_afe_node(state: PromptGraphState) -> PromptGraphState:
    decision = run_afe(prompt=state["prompt"], user_consent=state["user_consent"])
    return {"decision": decision, "visited": [*state.get("visited", []), "afe"]}


def _prompt_ac_node(state: PromptGraphState) -> PromptGraphState:
    decision = run_ac(state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "ac"]}


def _prompt_toxicity_node(state: PromptGraphState) -> PromptGraphState:
    """Run toxicity analysis and rephrase-suggestion generation after security arbitration."""
    decision = run_toxicity_analyzer(text=state["prompt"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "toxicity_analyzer"]}


def _prompt_llm_classifier_node(state: PromptGraphState) -> PromptGraphState:
    decision = run_llm_classifier(text=state["prompt"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "llm_classifier"]}


def _response_avs_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_avs(response_text=state["response_text"])
    return {"decision": decision, "visited": [*state.get("visited", []), "avs"]}


def _response_ac_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_ac(state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "ac"]}


def _response_toxicity_node(state: ResponseGraphState) -> ResponseGraphState:
    """Run toxicity analysis on AI responses (e.g. hate speech in generated text)."""
    decision = run_toxicity_analyzer(text=state["response_text"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "toxicity_analyzer"]}


def _response_llm_classifier_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_llm_classifier(text=state["response_text"], decision=state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "llm_classifier"]}


def _route_prompt_after_ac(state: PromptGraphState) -> str:
    """
    Conditional routing after the Arbitration Controller.

    Skip the toxicity analyzer when:
    - The feature is disabled in settings.
    - The security decision is already BLOCK (no point in tone suggestions).

    In all other cases (ALLOW, WARN, ANONYMIZE) run the toxicity analyzer so
    that suggestions are always available when the text is offensive in tone.
    """
    if not settings.toxicity_analyzer_enabled:
        return "end"
    decision = state.get("decision")
    if decision and decision.action == "BLOCK":
        return "end"
    return "toxicity_analyzer"


def _route_response_after_ac(state: ResponseGraphState) -> str:
    """Same conditional routing logic for the response pipeline."""
    if not settings.toxicity_analyzer_enabled:
        return "end"
    decision = state.get("decision")
    if decision and decision.action == "BLOCK":
        return "end"
    return "toxicity_analyzer"


def _build_prompt_graph():
    graph = StateGraph(PromptGraphState)
    graph.add_node("afe", _prompt_afe_node)
    graph.add_node("llm_classifier", _prompt_llm_classifier_node)
    graph.add_node("ac", _prompt_ac_node)
    graph.add_node("toxicity_analyzer", _prompt_toxicity_node)
    graph.add_edge(START, "afe")
    graph.add_edge("afe", "llm_classifier")
    graph.add_edge("llm_classifier", "ac")
    # Toxicity analyzer runs only for non-BLOCK decisions.
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


def analyze_prompt_with_agents(prompt: str, user_consent: bool | None) -> AgentExecution:
    """
    Prompt orchestration pipeline:
    1) AFE for initial decision
    2) LLM classifier (optional) for dynamic detection
    3) AC for arbitration of ambiguous cases
    """
    result = _prompt_graph.invoke({"prompt": prompt, "user_consent": user_consent, "visited": []})
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))


def validate_response_with_agents(response_text: str) -> AgentExecution:
    """
    Response orchestration pipeline:
    1) AVS for response-level validation
    2) LLM classifier (optional) for dynamic detection
    3) AC for arbitration of ambiguous cases
    """
    result = _response_graph.invoke({"response_text": response_text, "visited": []})
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))
