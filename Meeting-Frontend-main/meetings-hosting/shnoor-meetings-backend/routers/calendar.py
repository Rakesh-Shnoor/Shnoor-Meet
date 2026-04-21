import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import get_db_connection

router = APIRouter(
    prefix="/api/calendar",
    tags=["Calendar"]
)

class CalendarEvent(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    start_time: str
    end_time: str
    room_id: str

class CreateEventResponse(BaseModel):
    id: str
    message: str

def get_or_create_meeting(cursor, room_id: Optional[str], title: Optional[str] = None):
    effective_room_id = room_id or str(uuid.uuid4())

    cursor.execute(
        "SELECT id, room_id FROM meetings WHERE room_id = %s",
        (effective_room_id,),
    )
    meeting = cursor.fetchone()

    if meeting:
        return meeting["id"], meeting["room_id"]

    cursor.execute(
        """
        INSERT INTO meetings (room_id, title, description)
        VALUES (%s, %s, %s)
        RETURNING id, room_id
        """,
        (
            effective_room_id,
            title or "Scheduled meeting",
            "Created from a calendar event",
        ),
    )
    meeting = cursor.fetchone()
    return meeting["id"], meeting["room_id"]

@router.get("/events", response_model=List[CalendarEvent])
async def get_events():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    ce.id,
                    ce.title,
                    ce.description,
                    ce.start_time,
                    ce.end_time,
                    m.room_id
                FROM calendar_events ce
                JOIN meetings m ON m.id = ce.meeting_id
                ORDER BY ce.start_time ASC
                """
            )
            rows = cursor.fetchall()

    events = [
        CalendarEvent(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            start_time=row["start_time"].isoformat(timespec="minutes"),
            end_time=row["end_time"].isoformat(timespec="minutes"),
            room_id=row["room_id"]
        ) for row in rows
    ]
    return events

@router.post("/events", response_model=CreateEventResponse)
async def create_event(event: CalendarEvent):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                meeting_id, _ = get_or_create_meeting(cursor, event.room_id, event.title)
                cursor.execute(
                    """
                    INSERT INTO calendar_events (meeting_id, title, description, start_time, end_time)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        meeting_id,
                        event.title,
                        event.description,
                        event.start_time,
                        event.end_time,
                    ),
                )
                created_event = cursor.fetchone()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

    return {"id": created_event["id"], "message": "Event created successfully"}

@router.delete("/events/{id}")
async def delete_event(id: str):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM calendar_events WHERE id = %s", (id,))

    return {"message": "Event deleted successfully"}

@router.put("/events/{id}")
async def update_event(id: str, event: CalendarEvent):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                meeting_id, _ = get_or_create_meeting(cursor, event.room_id, event.title)
                cursor.execute(
                    """
                    UPDATE calendar_events
                    SET title = %s, description = %s, start_time = %s, end_time = %s, meeting_id = %s
                    WHERE id = %s
                    """,
                    (
                        event.title,
                        event.description,
                        event.start_time,
                        event.end_time,
                        meeting_id,
                        id,
                    ),
                )
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Event not found")
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(status_code=500, detail=f"Failed to update event: {str(e)}")

    return {"message": "Event updated successfully"}
