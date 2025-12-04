from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime
import time

logger = structlog.get_logger()

class AgentInput(BaseModel):
    """Base input model for agents"""
    conversation_id: str
    user_id: str
    message: str
    context: Dict[str, Any] = {}
    trip_id: Optional[str] = None

class AgentOutput(BaseModel):
    """Base output model for agents"""
    agent_type: str
    response: str
    actions_taken: List[Dict[str, Any]] = []
    next_agent: Optional[str] = None
    context_updates: Dict[str, Any] = {}
    confidence: float = 1.0
    execution_time: float = 0.0
    
class Tool(BaseModel):
    """Tool definition for agents"""
    name: str
    description: str
    parameters: Dict[str, Any] = {}

class BaseAgent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, agent_type: str, tools: List[Tool] = None):
        self.agent_type = agent_type
        self.tools = tools or []
        self.logger = structlog.get_logger().bind(agent_type=agent_type)
    
    @abstractmethod
    async def process(self, input_data: AgentInput) -> AgentOutput:
        """Process input and return response"""
        pass
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        self.logger.info("Executing tool", tool=tool_name, parameters=parameters)
        
        # Find tool by name
        tool = next((t for t in self.tools if t.name == tool_name), None)
        if not tool:
            raise ValueError(f"Tool {tool_name} not found")
        
        # Tool execution logic will be implemented per agent
        return {"status": "success", "result": "Tool executed"}
    
    def log_execution(self, input_data: AgentInput, output: AgentOutput):
        """Log agent execution for monitoring"""
        self.logger.info(
            "Agent execution completed",
            conversation_id=input_data.conversation_id,
            user_id=input_data.user_id,
            execution_time=output.execution_time,
            confidence=output.confidence,
            next_agent=output.next_agent
        )