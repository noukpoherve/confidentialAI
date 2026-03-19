from dataclasses import dataclass
from typing import NotRequired, TypedDict

from app.agents.ac import run_ac
from app.agents.afe import run_afe
from app.agents.avs import run_avs
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


def _response_avs_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_avs(response_text=state["response_text"])
    return {"decision": decision, "visited": [*state.get("visited", []), "avs"]}


def _response_ac_node(state: ResponseGraphState) -> ResponseGraphState:
    decision = run_ac(state["decision"])
    return {"decision": decision, "visited": [*state.get("visited", []), "ac"]}


def _build_prompt_graph():
    graph = StateGraph(PromptGraphState)
    graph.add_node("afe", _prompt_afe_node)
    graph.add_node("ac", _prompt_ac_node)
    graph.add_edge(START, "afe")
    graph.add_edge("afe", "ac")
    graph.add_edge("ac", END)
    return graph.compile()


def _build_response_graph():
    graph = StateGraph(ResponseGraphState)
    graph.add_node("avs", _response_avs_node)
    graph.add_node("ac", _response_ac_node)
    graph.add_edge(START, "avs")
    graph.add_edge("avs", "ac")
    graph.add_edge("ac", END)
    return graph.compile()


_prompt_graph = _build_prompt_graph()
_response_graph = _build_response_graph()


def analyze_prompt_with_agents(prompt: str, user_consent: bool | None) -> AgentExecution:
    """
    Prompt orchestration pipeline:
    1) AFE for initial decision
    2) AC for arbitration of ambiguous cases
    """
    result = _prompt_graph.invoke({"prompt": prompt, "user_consent": user_consent, "visited": []})
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))


def validate_response_with_agents(response_text: str) -> AgentExecution:
    """
    Response orchestration pipeline:
    1) AVS for response-level validation
    2) AC for arbitration of ambiguous cases
    """
    result = _response_graph.invoke({"response_text": response_text, "visited": []})
    return AgentExecution(decision=result["decision"], graph_trace=result.get("visited", []))
