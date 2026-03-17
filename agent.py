from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

class DebateCoach:
    def __init__(self, topic, user_side):
        self.llm = ChatOpenAI(model="gpt-4o", streaming=True)
        self.topic = topic
        self.agent_side = "Oppose" if user_side == "Favor" else "Favor"
        
        self.system_prompt = f"""
        You are a Debate Coach. The topic is: {self.topic}.
        The user is in {user_side}, so you must {self.agent_side}.
        
        RULES:
        1. Be conversational and human-like.
        2. Give a sharp rebuttal to their point.
        3. If they struggle, add a 'Coach Tip' in brackets like [Tip: Try using a statistical argument].
        """

    async def get_response(self, user_input, history):
        messages = [SystemMessage(content=self.system_prompt)] + history + [HumanMessage(content=user_input)]
        # We stream the response to feed the TTS immediately
        return self.llm.astream(messages)