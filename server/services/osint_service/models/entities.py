from pydantic import BaseModel
from typing import Optional

class CryptoWallet(BaseModel):
    address: str
    currency: str
    balance: Optional[float] = None
    transactions: Optional[list] = []

class IoTDevice(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    device_type: Optional[str] = None
    open_ports: Optional[list] = []

class SupplyChainLeak(BaseModel):
    source: str
    description: str
    date: str
    leaked_data: dict
