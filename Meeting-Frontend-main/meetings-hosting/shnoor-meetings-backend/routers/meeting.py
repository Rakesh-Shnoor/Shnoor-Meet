import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import get_db_connection

router = APIRouter(
    prefix="/api/meetings",
    tags=["Meetings"]
)

class CreateMeetingResponse(BaseModel):
    room_id: str
    message: str

class JoinMeetingRequest(BaseModel):
    room_id: str

@router.post("/create", response_model=CreateMeetingResponse)
async def create_meeting():
    """
    Creates a unique meeting ID that can be shared with other participants.
    """
    room_id = str(uuid.uuid4())

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO meetings (room_id, title, description)
                VALUES (%s, %s, %s)
                """,
                (room_id, "Instant meeting", "Created from the Shnoor frontend"),
            )

    return {
        "room_id": room_id,
        "message": "Meeting created successfully"
    }

@router.get("/{room_id}")
async def check_meeting(room_id: str):
    """
    Checks if a meeting ID exists.
    """
    if not room_id:
        raise HTTPException(status_code=400, detail="Invalid room ID")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM meetings WHERE room_id = %s",
                (room_id,),
            )
            meeting = cursor.fetchone()

    return {"room_id": room_id, "valid": bool(meeting)}
