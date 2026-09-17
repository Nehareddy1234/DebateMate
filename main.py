"""
main.py — LangGraph Debate Brain (V2)

Responsibilities
  - DebateState          : typed session state flowing through the graph
  - DebateReply          : Pydantic schema enforcing the structured payload
  - detect_assist_intent : intent detection ("I'm stuck", "give me a hint")
  - Nodes                : opening_statement | opponent | help_coach
  - Graphs               : app_brain (intent-routed), app_opening, app_help

Every node returns a structured DebateReply:
  rebuttal     -> plain-text voice line (NO markdown, NO emojis, NO lists)
  coaching_tip -> ONE sentence about argument structure
  sticky_note  -> concise bullet summary (max 8 words)

STATE FLOW
  client setup frame -> voice_server builds DebateState
  app_brain   : START -> route_intent -> opponent | help_coach -> END
  app_opening : START -> opening_statement -> END
  app_help    : START -> help_coach -> END
"""

import logging
import os
import re
from typing import Annotated, Optional
from typing_extensions import TypedDict

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

load_dotenv()

# ─────────────────────────── State ────────────────────────────

class DebateState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]  # full chat history
    topic: str                                            # debate topic
    user_side: str                                        # "Pro" or "Con"
    agent_reply: dict                                     # latest structured reply
    debate_summary: list[str]                             # sticky notes (<=8 words)


# ─────────────────────── Structured output ────────────────────

class DebateReply(BaseModel):
    """Schema every agent node must satisfy (spec §1 structured payload)."""

    rebuttal: str = Field(
        description=(
            "The spoken reply in plain conversational text. "
            "No markdown, no emojis, no bullet points, no numbered lists. "
            "Keep it under 120 words."
        )
    )
    coaching_tip: Optional[str] = Field(
        default=None,
        description=(
            "Exactly ONE sentence coaching the user on argument structure. "
            "Use null when no coaching is warranted."
        ),
    )
    sticky_note: str = Field(
        description=(
            "Concise bullet summary of the core argument. "
            "Maximum 8 words, no trailing punctuation."
        )
    )


# ─────────────────────────── Helpers ──────────────────────────

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\uFE0F\u200D]"
)

# Intent detection — phrases that signal the user is stuck or asking for help
_ASSIST_PATTERNS = [
    r"\bgive me a (hint|clue|tip|idea)\b",
    r"\bi'?m stuck\b", r"\bi am stuck\b", r"\bgetting stuck\b",
    r"\bhelp me\b", r"\bcan you help\b", r"\bneed help\b", r"\bsome help\b",
    r"\bwhat should i (say|argue)\b", r"\bi don'?t know what to say\b",
    r"\bno idea what to say\b", r"\brun out of (arguments|ideas)\b",
    r"\bout of arguments\b", r"\blost for words\b", r"\bblank(ed)? out\b",
    r"\bgive me (some )?help\b", r"\bhint please\b", r"\bsuggest something\b",
]
_ASSIST_RE = re.compile("|".join(_ASSIST_PATTERNS), re.IGNORECASE)


def detect_assist_intent(user_text: str) -> bool:
    """True when the user transcript expresses stuckness / asks for help."""
    if not user_text:
        return False
    return bool(_ASSIST_RE.search(user_text))


def _plain_voice(text: str) -> str:
    """Belt-and-braces sanitizer: the model is prompted for plain text,
    but we strip stray markdown/emoji before it reaches TTS."""
    text = _EMOJI_RE.sub("", text or "")
    text = re.sub(r"[#*_`]+", "", text)               # markdown emphasis
    text = re.sub(r"^\s*[-•\d]+[.)]?\s+", "", text, flags=re.MULTILINE)  # bullets
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _last_message_of(state: DebateState, cls) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, cls):
            return msg.content
    return ""


def _prepare_messages(system_message: SystemMessage, messages: list[BaseMessage], default_human: str = "Please respond.") -> list[BaseMessage]:
    """
    Ensures message list sent to Gemini/OpenAI follows chat completion rules:
    - Never empty (has at least one user prompt)
    - Never ends with an AIMessage / model turn (Gemini API 400 error)
    """
    history = list(messages or [])
    if not history or isinstance(history[-1], AIMessage):
        history.append(HumanMessage(content=default_human))
    return [system_message] + history


def _structured_llm(temperature: float):
    """
    LLM factory bound to the DebateReply schema (guaranteed JSON shape).

    Provider selection:
      - GOOGLE_API_KEY set  -> Gemini (gemini-1.5-flash) via
                               langchain-google-genai
      - otherwise           -> OpenAI GPT-4o
    Model names are overridable via GOOGLE_MODEL / OPENAI_MODEL env vars.
    """
    if os.getenv("GOOGLE_API_KEY"):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model = os.getenv("GOOGLE_MODEL", "gemini-3.6-flash")
            return ChatGoogleGenerativeAI(
                model=model, temperature=temperature
            ).with_structured_output(DebateReply)
        except ImportError:
            logging.getLogger(__name__).warning(
                "GOOGLE_API_KEY set but langchain-google-genai is "
                "not installed — falling back to OpenAI.")

    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    # OpenAI-compatible routers (e.g. OmniRoute): point the same client at a
    # different endpoint via OPENAI_BASE_URL / OPENAI_API_BASE in .env.
    base_url = (os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE") or "").strip()
    kwargs = {"model": model, "temperature": temperature, "streaming": False}
    if base_url:
        kwargs["base_url"] = base_url
    return ChatOpenAI(**kwargs).with_structured_output(DebateReply)


def _opposing_side(user_side: str) -> str:
    return "Con" if user_side == "Pro" else "Pro"


def _store_reply(state: DebateState, reply: DebateReply) -> dict:
    """Common node exit: append AI message, stash reply, grow sticky notes."""
    rebuttal = _plain_voice(reply.rebuttal)
    note = (reply.sticky_note or "").strip().strip(".")
    if len(note.split()) > 8:                    # hard-enforce the 8-word cap
        note = " ".join(note.split()[:8])
    existing = state.get("debate_summary", [])
    return {
        "messages": [AIMessage(content=rebuttal)],
        "agent_reply": {
            "rebuttal": rebuttal,
            "coaching_tip": (reply.coaching_tip or "").strip() or None,
            "sticky_note": note,
        },
        "debate_summary": existing + ([note] if note else []),
    }


_VOICE_RULES = (
    "CRITICAL HUMAN SPEECH & VOICE RULES:\n"
    "- You are speaking out loud through a voice synthesizer. Write EXACTLY how an articulate, quick-witted human speaks in conversation.\n"
    "- Use natural spoken phrasing, contractions (don't, can't, it's, you're, that's, we've), and conversational cadence.\n"
    "- NEVER sound like an AI, written essay, or bulleted summary. BANNED CLICHÉS: 'In conclusion', 'Furthermore', 'Moreover', 'Firstly/Secondly', 'It is important to remember', 'In today's world', 'While that may be true'.\n"
    "- NO markdown, NO emojis, NO bullet points, NO numbered lists, NO asterisks, NO quotation marks.\n"
    "- Keep the spoken response punchy and concise (around 60 to 95 words, hard limit 120 words).\n"
    "- coaching_tip must be exactly ONE sentence offering practical advice on how the user argued, or null.\n"
    "- sticky_note must be a punchy summary of the core argument (maximum 8 words, no punctuation)."
)


# ─────────────────────────── Nodes ────────────────────────────

def route_intent(state: DebateState) -> str:
    """
    Conditional edge on app_brain: inspect the last user transcript and
    route to help_coach (assist mode) instead of opponent when the user
    sounds stuck. Runs BEFORE any counter-argument is generated.
    Pure routing function — no state side effects.
    """
    last_user = _last_message_of(state, HumanMessage)
    return "help_coach" if detect_assist_intent(last_user) else "opponent"


async def opponent(state: DebateState) -> dict:
    """
    Node A — Opposing debater.
    Strictly argues the OPPOSITE stance of the user. Structured output:
    rebuttal + optional coaching_tip + sticky_note.
    """
    llm = _structured_llm(temperature=0.85)

    user_side = state.get("user_side", "Pro")
    ai_side   = _opposing_side(user_side)
    topic     = state.get("topic", "an unspecified topic")

    system_prompt = f"""You are an articulate, charismatic, and quick-witted human debater in a live Oxford-style debate.

Debate Motion: "{topic}"
Your Stance: {ai_side}
User's Stance: {user_side}

Your mission:
Argue strictly FOR {ai_side} and against the user's position with passion, wit, and intellectual sharpness. Never concede or switch sides.

How to speak like a real human debater:
- Directly react to what the user just said using natural spoken openers:
  "Wait, hold on a second —", "Look, that sounds great in theory, but in reality...", "Come on, let's be real here —", "Here's the fundamental flaw in that argument:", "I hear what you're trying to say, but look at what happens when...".
- Attack their underlying assumption or unintended consequences using concrete, relatable examples.
- Talk with genuine human inflection — mix short, punchy statements with a well-aimed counterpoint.
- Always finish your turn with a sharp, provocative question or challenge that puts the user on the spot.
- Set coaching_tip to exactly 1 constructive sentence if the user made a weak point or logical fallacy; otherwise leave it null.

{_VOICE_RULES}"""

    prompt_messages = _prepare_messages(
        SystemMessage(content=system_prompt),
        state.get("messages", []),
        default_human="Please make your argument.",
    )
    reply = await llm.ainvoke(prompt_messages)
    return _store_reply(state, reply)


async def opening_statement(state: DebateState) -> dict:
    """
    Node B — AI opening argument (first_speaker == "AI").
    Speaks from the OPPOSITE stance of the user and ends with a challenge.
    """
    llm = _structured_llm(temperature=0.85)

    user_side = state.get("user_side", "Pro")
    ai_side   = _opposing_side(user_side)
    topic     = state.get("topic", "an unspecified topic")

    system_prompt = f"""You are a skilled, charismatic human debater delivering the opening speech in a live debate.

Debate Motion: "{topic}"
Your Stance: {ai_side}
User's Stance: {user_side}

Your mission:
Deliver a captivating, authentic opening speech strictly supporting {ai_side} against {user_side}.

How to speak like a real human debater:
- Hook the audience immediately with a relatable reality check, striking observation, or bold premise.
- Deliver 2 strong, punchy reasons backing your stance with natural conversational flow (no 'Point 1, Point 2').
- Keep your tone confident, energetic, and engaging (around 70 to 90 words).
- Conclude by throwing down the gauntlet with a direct, challenging question to the user.
- Set coaching_tip to null.

{_VOICE_RULES}"""

    reply = await llm.ainvoke(
        [SystemMessage(content=system_prompt),
         HumanMessage(content="Please make your opening statement.")]
    )
    return _store_reply(state, reply)


async def help_coach(state: DebateState) -> dict:
    """
    Node C — Assist mode.
    Triggered by intent detection (or the Help button). Supports the USER's
    side with a hint — it must NEVER counter-argue.
    """
    llm = _structured_llm(temperature=0.7)

    user_side = state.get("user_side", "Pro")
    topic     = state.get("topic", "an unspecified topic")
    last_ai   = _last_message_of(state, AIMessage)

    counter_context = (
        f'\nThe AI opponent just argued: "{last_ai}"\nHelp the user answer that point.'
        if last_ai else ""
    )

    system_prompt = f"""You are an encouraging, experienced human debate coach whispering tactical advice to the user during a timeout.

Debate Motion: "{topic}"
User's Stance: {user_side}
{counter_context}

Your mission:
Help the user mount a strong comeback on THEIR side ({user_side}). NEVER argue against the user or defend the opponent here.

How to speak like a real human coach:
- Sound warm, supportive, and conversational, like a coach leaning in:
  "Alright, don't worry, you've got this.", "Here's how you turn this back on them:", "Look, they left a huge opening for you here."
- Give them 1-2 concrete, sharp arguments or angles they can immediately say out loud in their next turn.
- Suggest a rhetorical question or strong point they can challenge the opponent with.
- Keep it under 80 words so it's easy to absorb and speak out loud.
- sticky_note should be a short summary of the suggested counter-angle (max 8 words).

{_VOICE_RULES}"""

    prompt_messages = _prepare_messages(
        SystemMessage(content=system_prompt),
        state.get("messages", []),
        default_human="I need a hint or guidance for my side of the debate.",
    )
    reply = await llm.ainvoke(prompt_messages)
    return _store_reply(state, reply)


# ─────────────────────────── Graphs ───────────────────────────

def build_graph():
    """Main debate graph: intent-routed between opponent and help_coach."""
    workflow = StateGraph(DebateState)
    workflow.add_node("opponent", opponent)
    workflow.add_node("help_coach", help_coach)

    # START -> router decides: stuck user -> assist mode, otherwise rebut
    workflow.add_conditional_edges(
        START,
        route_intent,
        {"opponent": "opponent", "help_coach": "help_coach"},
    )
    workflow.add_edge("opponent", END)
    workflow.add_edge("help_coach", END)
    return workflow.compile()


def build_opening_graph():
    """Graph for the AI's opening statement when first_speaker == "AI"."""
    workflow = StateGraph(DebateState)
    workflow.add_node("opening_statement", opening_statement)
    workflow.add_edge(START, "opening_statement")
    workflow.add_edge("opening_statement", END)
    return workflow.compile()


def build_help_graph():
    """Graph for explicit help requests (Help button)."""
    workflow = StateGraph(DebateState)
    workflow.add_node("help_coach", help_coach)
    workflow.add_edge(START, "help_coach")
    workflow.add_edge("help_coach", END)
    return workflow.compile()


# Singleton compiled graphs — imported by voice_server.py
app_brain   = build_graph()
app_opening = build_opening_graph()
app_help    = build_help_graph()


# ─────────────────── Quick smoke test ─────────────────────────

if __name__ == "__main__":
    import asyncio

    test_state: DebateState = {
        "messages": [HumanMessage(content="AI will create more jobs than it destroys.")],
        "topic": "Artificial Intelligence is a net positive for society",
        "user_side": "Pro",
        "debate_summary": [],
    }

    async def _smoke():
        print("Running debate brain smoke test...\n")
        return await app_brain.ainvoke(test_state)

    result = asyncio.run(_smoke())
    reply = result["agent_reply"]

    print("=== Rebuttal ===")
    print(reply["rebuttal"])
    print(f"\n=== Coaching Tip ===\n{reply['coaching_tip'] or 'None'}")
    print(f"\n=== Sticky Note ===\n{reply['sticky_note']}")

    print("\n--- Assist intent check ---")
    print('stuck text  ->', detect_assist_intent("I'm stuck, give me a hint"))
    print('normal text ->', detect_assist_intent("Schools should ban smartphones."))
