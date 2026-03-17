"""
main.py — LangGraph Debate Brain
Defines DebateState, the Opponent node (GPT-4o), and the
Summarizer node (GPT-4o-mini). Compiled into `app_brain` for
use by voice_server.py.
"""

import os
import re
from typing import Annotated
from typing_extensions import TypedDict

from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

load_dotenv()

# ─────────────────────────── State ────────────────────────────

class DebateState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]   # full chat history
    topic: str                                              # debate topic
    user_role: str                                          # "Pro" or "Con"
    debate_summary: list[str]                              # sticky notes (5-word bullets)


# ─────────────────────────── Helpers ──────────────────────────

def _needs_coaching(user_text: str) -> bool:
    """Heuristic: flag arguments that lack supporting evidence or are very short."""
    evidence_keywords = [
        "study", "research", "according", "data", "statistics",
        "evidence", "proven", "shows", "example", "percent",
        "survey", "expert", "report",
    ]
    text_lower = user_text.lower()
    has_evidence = any(kw in text_lower for kw in evidence_keywords)
    is_short = len(user_text.split()) < 20
    return is_short or not has_evidence


def _extract_tip(text: str) -> str | None:
    """Pull the [Tip: ...] bracket from the AI response, or None."""
    match = re.search(r"\[Tip:\s*([^\]]+)\]", text, re.IGNORECASE)
    return match.group(1).strip() if match else None


# ─────────────────────────── Nodes ────────────────────────────

def opponent(state: DebateState) -> dict:
    """
    Node A — Opponent / Coach
    Uses GPT-4o to generate a sharp, conversational rebuttal.
    Appends a [Tip: ...] coaching bracket when the last user
    argument appears weak (short or evidence-free).
    """
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.85,
        streaming=False,          # streaming handled at WebSocket layer
    )

    user_role = state.get("user_role", "Pro")
    ai_role = "Con" if user_role == "Pro" else "Pro"
    topic = state.get("topic", "an unspecified topic")

    # Decide whether to inject coaching prompt
    last_user_msg = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            last_user_msg = msg.content
            break

    coaching_instruction = ""
    if _needs_coaching(last_user_msg):
        coaching_instruction = (
            "\n\nIMPORTANT: The user's argument was weak. "
            "After your rebuttal, add exactly ONE coaching tip "
            "in brackets like: [Tip: suggest using a statistic or "
            "a real-world example to strengthen their next argument.]"
        )

    system_prompt = f"""You are an elite competitive debate coach acting as the opponent.

Debate Topic: "{topic}"
Your stance: {ai_role}
User's stance: {user_role}

Guidelines:
- Be sharp, articulate, and conversational — like a real debater, not a textbook.
- Vary your sentence lengths. Mix punchy one-liners with developed arguments.
- Use openers like "Look, I understand your point, but...", "Here's the thing —", 
  "Let me push back on that:", "Fair point — but consider this:"
- Keep responses under 120 words.
- Do NOT use bullet points or numbered lists.{coaching_instruction}"""

    response = llm.invoke(
        [SystemMessage(content=system_prompt)] + state["messages"]
    )
    return {"messages": [response]}


def summarizer(state: DebateState) -> dict:
    """
    Node B — Background Summarizer
    Condenses the last AI rebuttal into a ≤5-word 'Sticky Note'.
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

    last_ai_msg = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, AIMessage):
            last_ai_msg = msg.content
            break

    if not last_ai_msg:
        return {"debate_summary": []}

    # Strip any [Tip: ...] before summarizing
    clean_msg = re.sub(r"\[Tip:[^\]]*\]", "", last_ai_msg).strip()

    prompt = (
        f"Summarize the core argument below in EXACTLY 5 words or fewer. "
        f"Return ONLY the sticky-note phrase, no punctuation at the end.\n\n"
        f'"""{clean_msg}"""'
    )

    note = llm.invoke([HumanMessage(content=prompt)])
    note_text = note.content.strip().strip(".")

    existing = state.get("debate_summary", [])
    return {"debate_summary": existing + [note_text]}


# ─────────────────────────── Graph ────────────────────────────

def build_graph() -> StateGraph:
    workflow = StateGraph(DebateState)

    workflow.add_node("opponent", opponent)
    workflow.add_node("summarizer", summarizer)

    workflow.add_edge(START, "opponent")
    workflow.add_edge("opponent", "summarizer")
    workflow.add_edge("summarizer", END)

    return workflow.compile()


# Singleton compiled graph — imported by voice_server.py
app_brain = build_graph()


# ─────────────────────── Quick smoke test ─────────────────────

if __name__ == "__main__":
    import json

    test_state: DebateState = {
        "messages": [HumanMessage(content="AI will create more jobs than it destroys.")],
        "topic": "Artificial Intelligence is a net positive for society",
        "user_role": "Pro",
        "debate_summary": [],
    }

    print("Running debate brain smoke test...\n")
    result = app_brain.invoke(test_state)

    print("=== AI Rebuttal ===")
    print(result["messages"][-1].content)
    tip = _extract_tip(result["messages"][-1].content)
    print(f"\n=== Coaching Tip ===\n{tip or 'None'}")
    print(f"\n=== Sticky Note ===\n{result['debate_summary'][-1]}")