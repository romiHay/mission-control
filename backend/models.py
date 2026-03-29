from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

class GeometryBase(BaseModel):
    name: str
    type: str
    coordinates: Any

class RuleBase(BaseModel):
    missionId: str
    name: str
    description: str
    value: str
    geometryId: Optional[str] = None
    geometryIds: Optional[List[str]] = []
    parameters: Optional[Dict[str, Any]] = {}

class RuleCreate(BaseModel):
    rule: RuleBase
    newGeo: Optional[GeometryBase] = None
    newGeos: Optional[List[GeometryBase]] = None
