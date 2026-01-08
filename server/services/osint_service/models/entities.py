from pydantic import BaseModel


class CryptoWallet(BaseModel):
    address: str
    currency: str
    balance: float | None = None
    transactions: list | None = []


class IoTDevice(BaseModel):
    ip_address: str
    mac_address: str | None = None
    device_type: str | None = None
    open_ports: list | None = []


class SupplyChainLeak(BaseModel):
    source: str
    description: str
    date: str
    leaked_data: dict
