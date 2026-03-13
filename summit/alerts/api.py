from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from summit.alerts.velocity_monitor import velocity_monitor

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("/velocity")
async def get_velocity_alerts():
    """
    Get the history of narrative velocity alerts
    """
    return {
        "status": "success",
        "alerts": velocity_monitor.alert_history
    }

@router.websocket("/velocity/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time velocity alerts
    """
    await websocket.accept()
    velocity_monitor.websockets.append(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        velocity_monitor.websockets.remove(websocket)
