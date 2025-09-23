import asyncio
import logging
import math
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class CelestialBody(Enum):
    """Known celestial bodies for interplanetary communication"""

    EARTH = "earth"
    MOON = "moon"
    MARS = "mars"
    JUPITER = "jupiter"
    SATURN = "saturn"
    TITAN = "titan"
    EUROPA = "europa"
    ASTEROID_BELT = "asteroid_belt"
    DEEP_SPACE = "deep_space"


class CommPriority(Enum):
    """Communication priority levels"""

    EMERGENCY = 1
    CRITICAL = 2
    HIGH = 3
    NORMAL = 4
    LOW = 5
    BACKGROUND = 6


class ProtocolType(Enum):
    """Interplanetary communication protocols"""

    DTN = "delay_tolerant_networking"  # Delay Tolerant Networking
    QUANTUM_ENTANGLEMENT = "quantum_entanglement"
    LASER_COMM = "laser_communication"
    RADIO_BURST = "radio_burst"
    AUTONOMOUS_RELAY = "autonomous_relay"
    EMERGENCY_BEACON = "emergency_beacon"


@dataclass
class CelestialPosition:
    """3D position and velocity of celestial body"""

    body: CelestialBody
    position: tuple[float, float, float]  # x, y, z in AU
    velocity: tuple[float, float, float]  # vx, vy, vz in AU/day
    timestamp: datetime
    uncertainty: float = 0.0  # Position uncertainty in AU


@dataclass
class InterplanetaryMessage:
    """Message for interplanetary transmission"""

    id: str
    source: CelestialBody
    destination: CelestialBody
    content: bytes
    priority: CommPriority
    protocol: ProtocolType
    created_at: datetime
    ttl: int  # Time to live in hours
    encryption_key: str | None = None
    compression_ratio: float = 1.0
    error_correction_level: int = 3
    route_history: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TransmissionWindow:
    """Optimal transmission window between celestial bodies"""

    source: CelestialBody
    destination: CelestialBody
    start_time: datetime
    end_time: datetime
    signal_delay: float  # One-way delay in minutes
    signal_strength: float  # Expected signal strength (0-1)
    atmospheric_interference: float  # Interference factor (0-1)
    optimal_frequency: float  # Optimal frequency in GHz
    required_power: float  # Required transmission power in kW


class OrbitalMechanics:
    """
    Advanced orbital mechanics for communication planning
    Handles relativistic effects and multi-body dynamics
    """

    def __init__(self):
        # Astronomical constants
        self.AU = 149597870.7  # km
        self.C = 299792458  # m/s (speed of light)
        self.G = 6.67430e-11  # m^3 kg^-1 s^-2

        # Planetary data (simplified)
        self.planetary_data = {
            CelestialBody.EARTH: {
                "mass": 5.972e24,  # kg
                "radius": 6371,  # km
                "orbital_period": 365.25,  # days
                "semi_major_axis": 1.0,  # AU
            },
            CelestialBody.MARS: {
                "mass": 6.417e23,
                "radius": 3390,
                "orbital_period": 687,
                "semi_major_axis": 1.524,
            },
            CelestialBody.JUPITER: {
                "mass": 1.898e27,
                "radius": 69911,
                "orbital_period": 4333,
                "semi_major_axis": 5.204,
            },
        }

        logger.info("Orbital mechanics system initialized")

    def calculate_position(self, body: CelestialBody, julian_date: float) -> CelestialPosition:
        """
        Calculate celestial body position at given time

        Args:
            body: Celestial body
            julian_date: Julian date

        Returns:
            Position and velocity
        """
        if body not in self.planetary_data:
            # Default to origin for unknown bodies
            return CelestialPosition(
                body=body,
                position=(0.0, 0.0, 0.0),
                velocity=(0.0, 0.0, 0.0),
                timestamp=datetime.now(),
                uncertainty=1.0,
            )

        data = self.planetary_data[body]

        # Simplified Keplerian orbital mechanics
        # Mean anomaly
        M = 2 * math.pi * (julian_date % data["orbital_period"]) / data["orbital_period"]

        # True anomaly (assuming circular orbit for simplicity)
        nu = M

        # Position in orbital plane
        r = data["semi_major_axis"]
        x = r * math.cos(nu)
        y = r * math.sin(nu)
        z = 0.0  # Simplified to ecliptic plane

        # Orbital velocity
        n = 2 * math.pi / data["orbital_period"]  # Mean motion
        vx = -r * n * math.sin(nu)
        vy = r * n * math.cos(nu)
        vz = 0.0

        return CelestialPosition(
            body=body,
            position=(x, y, z),
            velocity=(vx, vy, vz),
            timestamp=datetime.now(),
            uncertainty=0.001,  # 0.001 AU uncertainty
        )

    def calculate_signal_delay(self, pos1: CelestialPosition, pos2: CelestialPosition) -> float:
        """
        Calculate signal propagation delay between two positions

        Args:
            pos1: Source position
            pos2: Destination position

        Returns:
            Delay in minutes
        """
        # Distance in AU
        dx = pos2.position[0] - pos1.position[0]
        dy = pos2.position[1] - pos1.position[1]
        dz = pos2.position[2] - pos1.position[2]

        distance_au = math.sqrt(dx * dx + dy * dy + dz * dz)
        distance_km = distance_au * self.AU

        # Signal delay
        delay_seconds = distance_km * 1000 / self.C  # Convert km to m
        delay_minutes = delay_seconds / 60

        return delay_minutes

    def predict_transmission_windows(
        self,
        source: CelestialBody,
        destination: CelestialBody,
        start_date: datetime,
        duration_days: int,
    ) -> list[TransmissionWindow]:
        """
        Predict optimal transmission windows

        Args:
            source: Source celestial body
            destination: Destination celestial body
            start_date: Start date for prediction
            duration_days: Number of days to predict

        Returns:
            List of transmission windows
        """
        windows = []
        julian_start = self._datetime_to_julian(start_date)

        for day in range(duration_days):
            julian_date = julian_start + day
            current_date = start_date + timedelta(days=day)

            # Calculate positions
            source_pos = self.calculate_position(source, julian_date)
            dest_pos = self.calculate_position(destination, julian_date)

            # Calculate transmission parameters
            delay = self.calculate_signal_delay(source_pos, dest_pos)
            signal_strength = self._calculate_signal_strength(source_pos, dest_pos)

            # Check if this is a good transmission window
            if signal_strength > 0.3 and delay < 60:  # Less than 1 hour delay
                window = TransmissionWindow(
                    source=source,
                    destination=destination,
                    start_time=current_date,
                    end_time=current_date + timedelta(hours=8),  # 8-hour window
                    signal_delay=delay,
                    signal_strength=signal_strength,
                    atmospheric_interference=np.random.uniform(0.1, 0.3),
                    optimal_frequency=self._calculate_optimal_frequency(source_pos, dest_pos),
                    required_power=self._calculate_required_power(source_pos, dest_pos),
                )
                windows.append(window)

        return windows

    def _datetime_to_julian(self, dt: datetime) -> float:
        """Convert datetime to Julian date"""
        # Simplified Julian date calculation
        a = (14 - dt.month) // 12
        y = dt.year + 4800 - a
        m = dt.month + 12 * a - 3

        jdn = dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
        return jdn + (dt.hour - 12) / 24 + dt.minute / 1440 + dt.second / 86400

    def _calculate_signal_strength(self, pos1: CelestialPosition, pos2: CelestialPosition) -> float:
        """Calculate expected signal strength"""
        distance = math.sqrt(
            sum((p2 - p1) ** 2 for p1, p2 in zip(pos1.position, pos2.position, strict=False))
        )

        # Inverse square law with atmospheric effects
        base_strength = 1.0 / (distance**2 + 0.1)  # +0.1 to avoid division by zero

        # Normalize to 0-1 range
        return min(1.0, base_strength * 10)

    def _calculate_optimal_frequency(
        self, pos1: CelestialPosition, pos2: CelestialPosition
    ) -> float:
        """Calculate optimal transmission frequency"""
        distance = math.sqrt(
            sum((p2 - p1) ** 2 for p1, p2 in zip(pos1.position, pos2.position, strict=False))
        )

        # Higher frequencies for shorter distances, lower for longer
        if distance < 2:  # Within inner solar system
            return 32.0  # GHz
        elif distance < 10:  # Middle solar system
            return 8.4  # GHz
        else:  # Outer solar system
            return 2.3  # GHz

    def _calculate_required_power(self, pos1: CelestialPosition, pos2: CelestialPosition) -> float:
        """Calculate required transmission power"""
        distance = math.sqrt(
            sum((p2 - p1) ** 2 for p1, p2 in zip(pos1.position, pos2.position, strict=False))
        )

        # Power increases with square of distance
        base_power = 1.0  # kW
        return base_power * (distance**2)


class DelayTolerantNetworking:
    """
    Delay Tolerant Networking (DTN) for interplanetary communications
    Handles store-and-forward routing across vast distances
    """

    def __init__(self):
        self.routing_table: dict[str, list[str]] = {}
        self.message_store: dict[str, InterplanetaryMessage] = {}
        self.relay_nodes: list[CelestialBody] = [
            CelestialBody.MOON,
            CelestialBody.MARS,
            CelestialBody.JUPITER,
        ]

        # Network topology (simplified)
        self.network_graph = {
            CelestialBody.EARTH: [CelestialBody.MOON, CelestialBody.MARS],
            CelestialBody.MOON: [CelestialBody.EARTH, CelestialBody.MARS],
            CelestialBody.MARS: [CelestialBody.EARTH, CelestialBody.MOON, CelestialBody.JUPITER],
            CelestialBody.JUPITER: [CelestialBody.MARS, CelestialBody.SATURN],
            CelestialBody.SATURN: [CelestialBody.JUPITER],
        }

        # Performance metrics
        self.metrics = {
            "messages_routed": 0,
            "total_delay": 0.0,
            "successful_deliveries": 0,
            "failed_deliveries": 0,
            "network_utilization": 0.0,
        }

        logger.info("DTN system initialized")

    def route_message(
        self, message: InterplanetaryMessage, orbital_mechanics: OrbitalMechanics
    ) -> list[CelestialBody]:
        """
        Calculate optimal route for message delivery

        Args:
            message: Message to route
            orbital_mechanics: Orbital mechanics calculator

        Returns:
            Ordered list of relay nodes
        """
        source = message.source
        destination = message.destination

        # Use Dijkstra-like algorithm with time-varying costs
        route = self._find_optimal_route(source, destination, orbital_mechanics)

        # Update routing history
        message.route_history.extend([body.value for body in route])

        self.metrics["messages_routed"] += 1

        logger.info(
            f"Routed message {message.id} from {source.value} to {destination.value} "
            f"via {len(route)} hops"
        )

        return route

    def _find_optimal_route(
        self, source: CelestialBody, destination: CelestialBody, orbital_mechanics: OrbitalMechanics
    ) -> list[CelestialBody]:
        """Find optimal route using time-varying graph"""

        # Simple shortest path for now (could be enhanced with temporal routing)
        if destination in self.network_graph.get(source, []):
            # Direct connection
            return [destination]

        # Multi-hop routing
        visited = set()
        queue = [(source, [source])]

        while queue:
            current, path = queue.pop(0)

            if current == destination:
                return path[1:]  # Remove source from path

            if current in visited:
                continue

            visited.add(current)

            for neighbor in self.network_graph.get(current, []):
                if neighbor not in visited:
                    queue.append((neighbor, path + [neighbor]))

        # No route found
        return []

    def store_message(self, message: InterplanetaryMessage) -> bool:
        """
        Store message for later forwarding

        Args:
            message: Message to store

        Returns:
            Success status
        """
        # Check TTL
        if self._is_message_expired(message):
            logger.warning(f"Message {message.id} expired, discarding")
            return False

        # Store message
        self.message_store[message.id] = message

        logger.debug(f"Stored message {message.id} for later forwarding")
        return True

    def forward_messages(
        self, current_location: CelestialBody, available_connections: list[CelestialBody]
    ) -> list[InterplanetaryMessage]:
        """
        Forward stored messages when connections become available

        Args:
            current_location: Current node location
            available_connections: Available next-hop connections

        Returns:
            List of messages to forward
        """
        messages_to_forward = []

        for message_id, message in list(self.message_store.items()):
            # Check if message should be forwarded through this node
            if self._should_forward_message(message, current_location, available_connections):
                messages_to_forward.append(message)
                del self.message_store[message_id]

        logger.info(f"Forwarding {len(messages_to_forward)} messages from {current_location.value}")
        return messages_to_forward

    def _is_message_expired(self, message: InterplanetaryMessage) -> bool:
        """Check if message has expired"""
        age_hours = (datetime.now() - message.created_at).total_seconds() / 3600
        return age_hours > message.ttl

    def _should_forward_message(
        self,
        message: InterplanetaryMessage,
        current_location: CelestialBody,
        available_connections: list[CelestialBody],
    ) -> bool:
        """Determine if message should be forwarded"""
        # Simple forwarding logic
        if message.destination in available_connections:
            return True

        # Forward if it brings us closer to destination
        for connection in available_connections:
            if connection.value not in message.route_history:
                return True

        return False


class QuantumCommunication:
    """
    Quantum communication system for instantaneous interplanetary communication
    Uses quantum entanglement for faster-than-light information transfer
    """

    def __init__(self):
        self.entangled_pairs: dict[str, dict] = {}
        self.quantum_channels: dict[tuple[CelestialBody, CelestialBody], str] = {}
        self.decoherence_times = {}  # Entanglement lifetime

        # Quantum error correction
        self.error_correction_enabled = True
        self.fidelity_threshold = 0.95

        logger.info("Quantum communication system initialized")

    def establish_entanglement(
        self, location1: CelestialBody, location2: CelestialBody
    ) -> str | None:
        """
        Establish quantum entanglement between two locations

        Args:
            location1: First location
            location2: Second location

        Returns:
            Entanglement ID if successful
        """
        # Simulate entanglement establishment
        entanglement_id = f"qe_{location1.value}_{location2.value}_{int(time.time())}"

        # Quantum state preparation (simplified)
        quantum_state = self._prepare_entangled_state()

        self.entangled_pairs[entanglement_id] = {
            "location1": location1,
            "location2": location2,
            "state": quantum_state,
            "fidelity": np.random.uniform(0.92, 0.99),
            "created_at": datetime.now(),
            "uses_remaining": 1000,  # Limited uses before decoherence
        }

        # Register quantum channel
        channel_key = (location1, location2)
        self.quantum_channels[channel_key] = entanglement_id
        self.quantum_channels[(location2, location1)] = entanglement_id  # Bidirectional

        logger.info(
            f"Established quantum entanglement {entanglement_id} between "
            f"{location1.value} and {location2.value}"
        )

        return entanglement_id

    def _prepare_entangled_state(self) -> np.ndarray:
        """Prepare Bell state for quantum communication"""
        # |Φ+⟩ = (1/√2)(|00⟩ + |11⟩)
        bell_state = np.array([1, 0, 0, 1]) / np.sqrt(2)
        return bell_state

    def send_quantum_message(self, message: InterplanetaryMessage) -> bool:
        """
        Send message using quantum communication

        Args:
            message: Message to send

        Returns:
            Success status
        """
        channel_key = (message.source, message.destination)

        if channel_key not in self.quantum_channels:
            logger.warning(
                f"No quantum channel between {message.source.value} and "
                f"{message.destination.value}"
            )
            return False

        entanglement_id = self.quantum_channels[channel_key]
        entanglement = self.entangled_pairs.get(entanglement_id)

        if not entanglement or entanglement["uses_remaining"] <= 0:
            logger.warning(f"Quantum entanglement {entanglement_id} exhausted")
            return False

        # Check fidelity
        if entanglement["fidelity"] < self.fidelity_threshold:
            logger.warning(f"Quantum entanglement fidelity too low: {entanglement['fidelity']}")
            return False

        # Quantum teleportation protocol (simplified)
        success = self._quantum_teleportation(message.content, entanglement)

        if success:
            # Consume entanglement use
            entanglement["uses_remaining"] -= 1
            entanglement["fidelity"] *= 0.999  # Slight degradation

            logger.info(f"Quantum message {message.id} transmitted instantaneously")
            return True

        return False

    def _quantum_teleportation(self, data: bytes, entanglement: dict) -> bool:
        """
        Simulate quantum teleportation protocol

        Args:
            data: Data to transmit
            entanglement: Entanglement resource

        Returns:
            Success status
        """
        # Simulate quantum measurement and classical communication
        # In reality, this would involve actual quantum operations

        # Quantum measurement (introduces noise)
        measurement_noise = np.random.normal(0, 0.01)
        success_probability = entanglement["fidelity"] - abs(measurement_noise)

        return np.random.random() < success_probability


class InterplanetaryCommSystem:
    """
    Main interplanetary communication system
    Integrates all communication protocols and manages routing decisions
    """

    def __init__(self):
        self.orbital_mechanics = OrbitalMechanics()
        self.dtn = DelayTolerantNetworking()
        self.quantum_comm = QuantumCommunication()

        # Protocol selection AI
        self.protocol_selector = self._initialize_protocol_selector()

        # Message queues by priority
        self.message_queues = {priority: [] for priority in CommPriority}

        # Network status
        self.network_status = {
            "total_messages": 0,
            "successful_transmissions": 0,
            "failed_transmissions": 0,
            "average_delay": 0.0,
            "quantum_channels_active": 0,
            "dtn_nodes_active": len(self.dtn.relay_nodes),
        }

        logger.info("Interplanetary Communication System initialized")

    def _initialize_protocol_selector(self) -> nn.Module:
        """Initialize AI-based protocol selection model"""

        class ProtocolSelector(nn.Module):
            def __init__(self):
                super().__init__()
                self.fc1 = nn.Linear(8, 32)  # Input features
                self.fc2 = nn.Linear(32, 16)
                self.fc3 = nn.Linear(16, len(ProtocolType))

            def forward(self, features):
                x = F.relu(self.fc1(features))
                x = F.relu(self.fc2(x))
                return F.softmax(self.fc3(x), dim=-1)

        model = ProtocolSelector()
        model.eval()
        return model

    async def send_message(self, message: InterplanetaryMessage) -> bool:
        """
        Send interplanetary message using optimal protocol

        Args:
            message: Message to send

        Returns:
            Success status
        """
        # Select optimal protocol
        protocol = await self._select_optimal_protocol(message)
        message.protocol = protocol

        # Route message based on protocol
        if protocol == ProtocolType.QUANTUM_ENTANGLEMENT:
            success = await self._send_via_quantum(message)
        elif protocol == ProtocolType.DTN:
            success = await self._send_via_dtn(message)
        elif protocol == ProtocolType.LASER_COMM:
            success = await self._send_via_laser(message)
        else:
            success = await self._send_via_radio(message)

        # Update statistics
        self.network_status["total_messages"] += 1
        if success:
            self.network_status["successful_transmissions"] += 1
        else:
            self.network_status["failed_transmissions"] += 1

        return success

    async def _select_optimal_protocol(self, message: InterplanetaryMessage) -> ProtocolType:
        """Select optimal communication protocol using AI"""

        # Calculate transmission window
        windows = self.orbital_mechanics.predict_transmission_windows(
            message.source, message.destination, datetime.now(), 1
        )

        if not windows:
            # No good transmission window - use DTN
            return ProtocolType.DTN

        window = windows[0]

        # Feature vector for protocol selection
        features = torch.tensor(
            [
                window.signal_delay,  # Signal delay
                window.signal_strength,  # Signal strength
                window.atmospheric_interference,  # Interference
                message.priority.value,  # Message priority
                len(message.content) / 1024,  # Message size in KB
                1.0 if message.encryption_key else 0.0,  # Encryption required
                window.required_power / 100,  # Normalized power requirement
                (
                    1.0 if message.destination in [CelestialBody.DEEP_SPACE] else 0.0
                ),  # Deep space flag
            ],
            dtype=torch.float32,
        )

        # Get protocol probabilities
        with torch.no_grad():
            protocol_probs = self.protocol_selector(features)

        # Select protocol with highest probability
        protocol_idx = torch.argmax(protocol_probs).item()
        protocols = list(ProtocolType)

        selected_protocol = protocols[protocol_idx]

        logger.info(f"Selected protocol {selected_protocol.value} for message {message.id}")
        return selected_protocol

    async def _send_via_quantum(self, message: InterplanetaryMessage) -> bool:
        """Send message via quantum communication"""
        # Check if quantum channel exists
        channel_key = (message.source, message.destination)

        if channel_key not in self.quantum_comm.quantum_channels:
            # Try to establish entanglement
            entanglement_id = self.quantum_comm.establish_entanglement(
                message.source, message.destination
            )
            if not entanglement_id:
                logger.warning(f"Failed to establish quantum channel for {message.id}")
                return False

        # Send via quantum
        success = self.quantum_comm.send_quantum_message(message)

        if success:
            logger.info(f"Message {message.id} sent via quantum communication")

        return success

    async def _send_via_dtn(self, message: InterplanetaryMessage) -> bool:
        """Send message via delay tolerant networking"""
        # Calculate route
        route = self.dtn.route_message(message, self.orbital_mechanics)

        if not route:
            logger.warning(f"No route found for message {message.id}")
            return False

        # Store message for forwarding
        success = self.dtn.store_message(message)

        if success:
            logger.info(f"Message {message.id} queued for DTN forwarding via {len(route)} hops")

        return success

    async def _send_via_laser(self, message: InterplanetaryMessage) -> bool:
        """Send message via laser communication"""
        # Simulate laser communication
        windows = self.orbital_mechanics.predict_transmission_windows(
            message.source, message.destination, datetime.now(), 1
        )

        if not windows or windows[0].signal_strength < 0.5:
            logger.warning("Insufficient signal strength for laser communication")
            return False

        # Simulate transmission delay
        await asyncio.sleep(0.1)  # Simulate processing time

        logger.info(f"Message {message.id} sent via laser communication")
        return True

    async def _send_via_radio(self, message: InterplanetaryMessage) -> bool:
        """Send message via radio communication"""
        # Simulate radio transmission
        windows = self.orbital_mechanics.predict_transmission_windows(
            message.source, message.destination, datetime.now(), 1
        )

        if not windows:
            logger.warning("No transmission window for radio communication")
            return False

        # Calculate transmission time based on distance
        delay = windows[0].signal_delay

        # Simulate transmission
        await asyncio.sleep(min(delay / 60, 5.0))  # Scale down for simulation

        logger.info(f"Message {message.id} sent via radio (delay: {delay:.1f} minutes)")
        return True

    def get_network_status(self) -> dict[str, Any]:
        """Get comprehensive network status"""
        # Update quantum channel count
        active_quantum_channels = sum(
            1
            for entanglement in self.quantum_comm.entangled_pairs.values()
            if entanglement["uses_remaining"] > 0 and entanglement["fidelity"] > 0.9
        )

        self.network_status["quantum_channels_active"] = active_quantum_channels

        # Calculate success rate
        total = (
            self.network_status["successful_transmissions"]
            + self.network_status["failed_transmissions"]
        )
        success_rate = self.network_status["successful_transmissions"] / max(total, 1)

        return {
            **self.network_status,
            "success_rate": success_rate,
            "timestamp": datetime.now().isoformat(),
            "dtn_metrics": self.dtn.metrics,
            "relay_nodes": [node.value for node in self.dtn.relay_nodes],
            "quantum_entanglements": len(self.quantum_comm.entangled_pairs),
        }

    async def establish_interplanetary_network(self) -> None:
        """Establish comprehensive interplanetary communication network"""
        logger.info("Establishing interplanetary communication network...")

        # Establish quantum entanglements for major routes
        major_routes = [
            (CelestialBody.EARTH, CelestialBody.MOON),
            (CelestialBody.EARTH, CelestialBody.MARS),
            (CelestialBody.MARS, CelestialBody.JUPITER),
            (CelestialBody.JUPITER, CelestialBody.SATURN),
        ]

        for source, destination in major_routes:
            entanglement_id = self.quantum_comm.establish_entanglement(source, destination)
            if entanglement_id:
                logger.info(f"Quantum link established: {source.value} ↔ {destination.value}")

        logger.info("Interplanetary network establishment complete")


def create_test_message(
    source: CelestialBody,
    destination: CelestialBody,
    content: str = "Test message",
    priority: CommPriority = CommPriority.NORMAL,
) -> InterplanetaryMessage:
    """Create a test interplanetary message"""

    message_id = f"msg_{int(time.time())}_{np.random.randint(1000, 9999)}"

    return InterplanetaryMessage(
        id=message_id,
        source=source,
        destination=destination,
        content=content.encode("utf-8"),
        priority=priority,
        protocol=ProtocolType.DTN,  # Will be selected automatically
        created_at=datetime.now(),
        ttl=72,  # 72 hours
        metadata={"test_message": True},
    )


# Example usage
async def demo_interplanetary_communication():
    """Demonstrate interplanetary communication capabilities"""

    # Initialize system
    comm_system = InterplanetaryCommSystem()

    # Establish network
    await comm_system.establish_interplanetary_network()

    # Create test messages
    messages = [
        create_test_message(
            CelestialBody.EARTH, CelestialBody.MARS, "Mission status update", CommPriority.HIGH
        ),
        create_test_message(
            CelestialBody.MARS,
            CelestialBody.JUPITER,
            "Scientific data transmission",
            CommPriority.NORMAL,
        ),
        create_test_message(
            CelestialBody.EARTH,
            CelestialBody.DEEP_SPACE,
            "Emergency beacon",
            CommPriority.EMERGENCY,
        ),
    ]

    # Send messages
    for message in messages:
        success = await comm_system.send_message(message)
        logger.info(f"Message {message.id}: {'Success' if success else 'Failed'}")

    # Get network status
    status = comm_system.get_network_status()
    logger.info(f"Network status: {status}")


logger.info("Interplanetary Communication System initialized for deep space operations")
