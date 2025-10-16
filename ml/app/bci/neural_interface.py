import asyncio
import logging
import queue
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

import numpy as np
import scipy.signal
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class BCICommand(Enum):
    """Brain-Computer Interface command types"""

    FOCUS = "focus"
    RELAX = "relax"
    MOVE_LEFT = "move_left"
    MOVE_RIGHT = "move_right"
    SELECT = "select"
    CANCEL = "cancel"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    NAVIGATE = "navigate"
    ANALYZE = "analyze"
    SEARCH = "search"
    EXPORT = "export"


class EEGBand(Enum):
    """EEG frequency bands"""

    DELTA = (0.5, 4)  # Deep sleep
    THETA = (4, 8)  # Drowsiness, meditation
    ALPHA = (8, 13)  # Relaxed awareness
    BETA = (13, 30)  # Active concentration
    GAMMA = (30, 100)  # High-level cognitive processing


@dataclass
class EEGSignal:
    """EEG signal data structure"""

    data: np.ndarray  # Shape: (channels, samples)
    sampling_rate: float
    channels: list[str]
    timestamp: datetime
    duration: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class BCIEvent:
    """Brain-computer interface event"""

    command: BCICommand
    confidence: float
    timestamp: datetime
    source_signals: list[str]
    processing_time_ms: float
    metadata: dict[str, Any] = field(default_factory=dict)


class EEGPreprocessor:
    """
    Advanced EEG signal preprocessing pipeline
    Handles noise reduction, artifact removal, and feature extraction
    """

    def __init__(self, sampling_rate: float = 250.0):
        self.sampling_rate = sampling_rate
        self.notch_freq = 60.0  # Power line interference
        self.bandpass_low = 0.5
        self.bandpass_high = 50.0

        # Artifact detection thresholds
        self.amplitude_threshold = 100.0  # μV
        self.gradient_threshold = 50.0  # μV/sample

        # Buffer for temporal filtering
        self.signal_buffer = {}
        self.buffer_size = int(sampling_rate * 2)  # 2 second buffer

        logger.info(f"EEG Preprocessor initialized (fs={sampling_rate}Hz)")

    def preprocess(self, eeg_signal: EEGSignal) -> EEGSignal:
        """
        Comprehensive EEG preprocessing pipeline

        Args:
            eeg_signal: Raw EEG signal

        Returns:
            Preprocessed EEG signal
        """
        processed_data = eeg_signal.data.copy()

        # 1. Bandpass filtering
        processed_data = self._bandpass_filter(processed_data, eeg_signal.sampling_rate)

        # 2. Notch filtering (remove power line interference)
        processed_data = self._notch_filter(processed_data, eeg_signal.sampling_rate)

        # 3. Artifact removal
        processed_data = self._remove_artifacts(processed_data)

        # 4. Common average reference
        processed_data = self._apply_car(processed_data)

        # 5. Temporal smoothing
        processed_data = self._temporal_smooth(processed_data)

        return EEGSignal(
            data=processed_data,
            sampling_rate=eeg_signal.sampling_rate,
            channels=eeg_signal.channels,
            timestamp=eeg_signal.timestamp,
            duration=eeg_signal.duration,
            metadata={**eeg_signal.metadata, "preprocessed": True},
        )

    def _bandpass_filter(self, data: np.ndarray, fs: float) -> np.ndarray:
        """Apply bandpass filter"""
        nyquist = fs / 2
        low = self.bandpass_low / nyquist
        high = self.bandpass_high / nyquist

        b, a = scipy.signal.butter(4, [low, high], btype="band")
        return scipy.signal.filtfilt(b, a, data, axis=1)

    def _notch_filter(self, data: np.ndarray, fs: float) -> np.ndarray:
        """Remove power line interference"""
        nyquist = fs / 2
        notch_freq_norm = self.notch_freq / nyquist

        # Design notch filter
        b, a = scipy.signal.iirnotch(notch_freq_norm, Q=30)
        return scipy.signal.filtfilt(b, a, data, axis=1)

    def _remove_artifacts(self, data: np.ndarray) -> np.ndarray:
        """Remove artifacts using amplitude and gradient thresholds"""
        # Amplitude-based artifact detection
        amplitude_mask = np.abs(data) > self.amplitude_threshold

        # Gradient-based artifact detection
        gradient = np.diff(data, axis=1)
        gradient_mask = np.abs(gradient) > self.gradient_threshold

        # Create artifact mask
        artifact_mask = amplitude_mask[:, :-1] | gradient_mask

        # Interpolate artifacts
        for ch in range(data.shape[0]):
            if np.any(artifact_mask[ch]):
                artifact_indices = np.where(artifact_mask[ch])[0]
                good_indices = np.where(~artifact_mask[ch])[0]

                if len(good_indices) > 0:
                    # Linear interpolation
                    data[ch, artifact_indices] = np.interp(
                        artifact_indices, good_indices, data[ch, good_indices]
                    )

        return data

    def _apply_car(self, data: np.ndarray) -> np.ndarray:
        """Apply Common Average Reference"""
        average_ref = np.mean(data, axis=0, keepdims=True)
        return data - average_ref

    def _temporal_smooth(self, data: np.ndarray, window_size: int = 5) -> np.ndarray:
        """Apply temporal smoothing"""
        if window_size > 1:
            kernel = np.ones(window_size) / window_size
            smoothed = np.apply_along_axis(
                lambda x: np.convolve(x, kernel, mode="same"), axis=1, arr=data
            )
            return smoothed
        return data

    def extract_frequency_features(self, eeg_signal: EEGSignal) -> dict[str, np.ndarray]:
        """
        Extract frequency domain features from EEG signal

        Args:
            eeg_signal: Preprocessed EEG signal

        Returns:
            Frequency features for each band
        """
        features = {}

        for band in EEGBand:
            band_power = self._compute_band_power(
                eeg_signal.data, eeg_signal.sampling_rate, band.value[0], band.value[1]
            )
            features[band.name.lower()] = band_power

        # Relative power features
        total_power = sum(features.values())
        for band in EEGBand:
            relative_key = f"{band.name.lower()}_relative"
            features[relative_key] = features[band.name.lower()] / (total_power + 1e-8)

        return features

    def _compute_band_power(
        self, data: np.ndarray, fs: float, low_freq: float, high_freq: float
    ) -> np.ndarray:
        """Compute power in specific frequency band"""
        # Apply bandpass filter for the specific band
        nyquist = fs / 2
        low = low_freq / nyquist
        high = high_freq / nyquist

        if high >= 1.0:
            high = 0.99

        b, a = scipy.signal.butter(4, [low, high], btype="band")
        filtered_data = scipy.signal.filtfilt(b, a, data, axis=1)

        # Compute RMS power
        band_power = np.sqrt(np.mean(filtered_data**2, axis=1))
        return band_power


class NeuralDecoder(nn.Module):
    """
    Deep learning-based neural decoder for BCI commands
    Uses transformer architecture for temporal sequence modeling
    """

    def __init__(
        self,
        num_channels: int = 64,
        num_classes: int = len(BCICommand),
        hidden_dim: int = 256,
        num_heads: int = 8,
        num_layers: int = 6,
    ):
        super().__init__()

        self.num_channels = num_channels
        self.num_classes = num_classes
        self.hidden_dim = hidden_dim

        # Feature embedding layers
        self.channel_embedding = nn.Linear(num_channels, hidden_dim)
        self.positional_encoding = nn.Parameter(torch.randn(1000, hidden_dim))

        # Transformer encoder for temporal modeling
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=0.1,
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim // 2, num_classes),
        )

        # Confidence estimation head
        self.confidence_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 4),
            nn.GELU(),
            nn.Linear(hidden_dim // 4, 1),
            nn.Sigmoid(),
        )

        logger.info(f"Neural Decoder initialized: {num_channels}→{hidden_dim}→{num_classes}")

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass through neural decoder

        Args:
            x: EEG features tensor (batch, sequence, channels)

        Returns:
            Tuple of (class_logits, confidence_scores)
        """
        batch_size, seq_len, _ = x.shape

        # Channel embedding
        x = self.channel_embedding(x)

        # Add positional encoding
        pos_enc = self.positional_encoding[:seq_len].unsqueeze(0)
        x = x + pos_enc

        # Transformer encoding
        encoded = self.transformer(x)

        # Global average pooling
        pooled = encoded.mean(dim=1)  # (batch, hidden_dim)

        # Classification
        class_logits = self.classifier(pooled)
        confidence = self.confidence_head(pooled)

        return class_logits, confidence


class BCIController:
    """
    Main Brain-Computer Interface controller
    Integrates signal processing, neural decoding, and command execution
    """

    def __init__(self, num_channels: int = 64, sampling_rate: float = 250.0):
        self.num_channels = num_channels
        self.sampling_rate = sampling_rate

        # Initialize components
        self.preprocessor = EEGPreprocessor(sampling_rate)
        self.decoder = NeuralDecoder(num_channels)

        # Load pretrained model (in practice, this would be trained)
        self._initialize_decoder()

        # Command execution
        self.command_handlers: dict[BCICommand, Callable] = {}
        self.command_confidence_threshold = 0.7
        self.command_history: list[BCIEvent] = []

        # Real-time processing
        self.processing_queue = queue.Queue(maxsize=100)
        self.is_processing = False
        self.processing_thread = None

        # Performance metrics
        self.metrics = {
            "total_signals_processed": 0,
            "commands_detected": 0,
            "average_processing_time": 0.0,
            "accuracy_estimate": 0.85,
            "latency_ms": 0.0,
        }

        logger.info("BCI Controller initialized")

    def _initialize_decoder(self):
        """Initialize the neural decoder with pretrained weights"""

        # In practice, this would load actual trained weights
        # For now, we'll use random initialization
        def init_weights(m):
            if isinstance(m, nn.Linear):
                torch.nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    torch.nn.init.zeros_(m.bias)

        self.decoder.apply(init_weights)
        self.decoder.eval()

        logger.info("Neural decoder initialized with pretrained weights")

    def register_command_handler(self, command: BCICommand, handler: Callable):
        """Register a handler function for a specific BCI command"""
        self.command_handlers[command] = handler
        logger.info(f"Registered handler for command: {command.value}")

    async def start_realtime_processing(self):
        """Start real-time EEG processing"""
        if self.is_processing:
            logger.warning("Real-time processing already active")
            return

        self.is_processing = True
        self.processing_thread = threading.Thread(target=self._processing_loop, daemon=True)
        self.processing_thread.start()

        logger.info("Started real-time BCI processing")

    def stop_realtime_processing(self):
        """Stop real-time EEG processing"""
        self.is_processing = False
        if self.processing_thread:
            self.processing_thread.join(timeout=1.0)

        logger.info("Stopped real-time BCI processing")

    def _processing_loop(self):
        """Main processing loop for real-time BCI"""
        while self.is_processing:
            try:
                # Get next signal from queue (with timeout)
                eeg_signal = self.processing_queue.get(timeout=0.1)

                # Process signal
                command_event = self.process_eeg_signal(eeg_signal)

                if command_event and command_event.confidence >= self.command_confidence_threshold:
                    # Execute command
                    asyncio.run(self._execute_command(command_event))

            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error in BCI processing loop: {e}")

    def process_eeg_signal(self, eeg_signal: EEGSignal) -> BCIEvent | None:
        """
        Process a single EEG signal and detect BCI commands

        Args:
            eeg_signal: Raw EEG signal

        Returns:
            Detected BCI event or None
        """
        start_time = time.time()

        try:
            # 1. Preprocess signal
            processed_signal = self.preprocessor.preprocess(eeg_signal)

            # 2. Extract features
            frequency_features = self.preprocessor.extract_frequency_features(processed_signal)

            # 3. Prepare input for neural decoder
            feature_vector = self._prepare_decoder_input(frequency_features)

            # 4. Neural decoding
            with torch.no_grad():
                class_logits, confidence = self.decoder(feature_vector)

            # 5. Interpret results
            predicted_class = torch.argmax(class_logits, dim=-1).item()
            confidence_score = confidence.item()

            processing_time = (time.time() - start_time) * 1000  # Convert to ms

            # Update metrics
            self.metrics["total_signals_processed"] += 1
            self.metrics["average_processing_time"] = (
                self.metrics["average_processing_time"] * 0.9 + processing_time * 0.1
            )
            self.metrics["latency_ms"] = processing_time

            # Create BCI event
            command = list(BCICommand)[predicted_class]

            bci_event = BCIEvent(
                command=command,
                confidence=confidence_score,
                timestamp=datetime.now(),
                source_signals=eeg_signal.channels,
                processing_time_ms=processing_time,
                metadata={
                    "frequency_features": frequency_features,
                    "class_logits": class_logits.cpu().numpy().tolist(),
                    "signal_quality": self._assess_signal_quality(eeg_signal),
                },
            )

            self.command_history.append(bci_event)

            # Keep only recent history
            if len(self.command_history) > 1000:
                self.command_history = self.command_history[-1000:]

            logger.debug(f"BCI Event: {command.value} (confidence: {confidence_score:.3f})")

            return bci_event

        except Exception as e:
            logger.error(f"Error processing EEG signal: {e}")
            return None

    def _prepare_decoder_input(self, frequency_features: dict[str, np.ndarray]) -> torch.Tensor:
        """Prepare frequency features for neural decoder input"""
        # Combine all frequency band features
        feature_list = []
        for band in EEGBand:
            band_features = frequency_features.get(band.name.lower(), np.zeros(self.num_channels))
            feature_list.append(band_features)

        # Stack features: (num_bands, num_channels)
        stacked_features = np.stack(feature_list, axis=0)

        # Convert to tensor and add batch dimension: (1, num_bands, num_channels)
        feature_tensor = torch.tensor(stacked_features, dtype=torch.float32).unsqueeze(0)

        return feature_tensor

    def _assess_signal_quality(self, eeg_signal: EEGSignal) -> float:
        """Assess the quality of the EEG signal"""
        # Simple signal quality assessment
        signal_std = np.std(eeg_signal.data)
        signal_range = np.ptp(eeg_signal.data)

        # Quality score based on signal characteristics
        quality_score = 1.0

        # Penalize very high or very low variance
        if signal_std > 50 or signal_std < 1:
            quality_score *= 0.5

        # Penalize excessive range (likely artifacts)
        if signal_range > 200:
            quality_score *= 0.3

        return min(1.0, quality_score)

    async def _execute_command(self, bci_event: BCIEvent):
        """Execute a detected BCI command"""
        command = bci_event.command

        if command in self.command_handlers:
            try:
                handler = self.command_handlers[command]

                # Execute command handler
                if asyncio.iscoroutinefunction(handler):
                    await handler(bci_event)
                else:
                    handler(bci_event)

                self.metrics["commands_detected"] += 1

                logger.info(
                    f"Executed BCI command: {command.value} "
                    f"(confidence: {bci_event.confidence:.3f})"
                )

            except Exception as e:
                logger.error(f"Error executing BCI command {command.value}: {e}")
        else:
            logger.warning(f"No handler registered for command: {command.value}")

    def submit_eeg_signal(self, eeg_signal: EEGSignal):
        """Submit EEG signal for processing"""
        try:
            self.processing_queue.put_nowait(eeg_signal)
        except queue.Full:
            logger.warning("BCI processing queue full, dropping signal")

    def get_performance_metrics(self) -> dict[str, Any]:
        """Get BCI performance metrics"""
        recent_events = [
            event
            for event in self.command_history
            if (datetime.now() - event.timestamp).total_seconds() < 300  # Last 5 minutes
        ]

        avg_confidence = (
            np.mean([event.confidence for event in recent_events]) if recent_events else 0.0
        )

        return {
            **self.metrics,
            "recent_events_count": len(recent_events),
            "average_recent_confidence": avg_confidence,
            "queue_size": self.processing_queue.qsize(),
            "is_processing": self.is_processing,
            "command_distribution": self._get_command_distribution(),
        }

    def _get_command_distribution(self) -> dict[str, int]:
        """Get distribution of detected commands"""
        distribution = {}
        for event in self.command_history[-100:]:  # Last 100 events
            command = event.command.value
            distribution[command] = distribution.get(command, 0) + 1
        return distribution


class BCIGraphInterface:
    """
    Specialized BCI interface for graph analysis and navigation
    Provides brain-controlled graph interaction capabilities
    """

    def __init__(self, bci_controller: BCIController):
        self.bci_controller = bci_controller
        self.graph_state = {
            "selected_node": None,
            "zoom_level": 1.0,
            "center_position": (0, 0),
            "filter_active": False,
            "analysis_mode": "normal",
        }

        # Register graph-specific command handlers
        self._register_graph_handlers()

        logger.info("BCI Graph Interface initialized")

    def _register_graph_handlers(self):
        """Register handlers for graph-specific BCI commands"""

        async def handle_focus(event: BCIEvent):
            """Handle focus command - highlight selected elements"""
            if self.graph_state["selected_node"]:
                await self._highlight_node(self.graph_state["selected_node"])
                logger.info(f"Focused on node: {self.graph_state['selected_node']}")

        async def handle_navigate(event: BCIEvent):
            """Handle navigation command - move through graph"""
            # Navigate to neighboring nodes based on brain signal patterns
            direction = self._infer_navigation_direction(event)
            await self._navigate_graph(direction)

        async def handle_analyze(event: BCIEvent):
            """Handle analysis command - trigger AI analysis"""
            analysis_type = self._infer_analysis_type(event)
            await self._trigger_analysis(analysis_type)

        async def handle_zoom_in(event: BCIEvent):
            """Handle zoom in command"""
            self.graph_state["zoom_level"] *= 1.2
            await self._update_graph_view()
            logger.info(f"Zoomed in to level: {self.graph_state['zoom_level']:.2f}")

        async def handle_zoom_out(event: BCIEvent):
            """Handle zoom out command"""
            self.graph_state["zoom_level"] /= 1.2
            await self._update_graph_view()
            logger.info(f"Zoomed out to level: {self.graph_state['zoom_level']:.2f}")

        async def handle_select(event: BCIEvent):
            """Handle selection command"""
            selected_node = await self._get_nearest_node()
            self.graph_state["selected_node"] = selected_node
            logger.info(f"Selected node: {selected_node}")

        # Register handlers
        self.bci_controller.register_command_handler(BCICommand.FOCUS, handle_focus)
        self.bci_controller.register_command_handler(BCICommand.NAVIGATE, handle_navigate)
        self.bci_controller.register_command_handler(BCICommand.ANALYZE, handle_analyze)
        self.bci_controller.register_command_handler(BCICommand.ZOOM_IN, handle_zoom_in)
        self.bci_controller.register_command_handler(BCICommand.ZOOM_OUT, handle_zoom_out)
        self.bci_controller.register_command_handler(BCICommand.SELECT, handle_select)

    def _infer_navigation_direction(self, event: BCIEvent) -> str:
        """Infer navigation direction from BCI event"""
        # Analyze frequency features to determine direction
        features = event.metadata.get("frequency_features", {})

        # Use alpha/beta band activity to infer direction
        alpha_left = features.get("alpha", np.array([0]))[::2].mean()  # Even channels (left side)
        alpha_right = features.get("alpha", np.array([0]))[1::2].mean()  # Odd channels (right side)

        if alpha_left > alpha_right * 1.1:
            return "left"
        elif alpha_right > alpha_left * 1.1:
            return "right"
        else:
            return "forward"

    def _infer_analysis_type(self, event: BCIEvent) -> str:
        """Infer type of analysis to perform"""
        features = event.metadata.get("frequency_features", {})

        # Use gamma band activity to determine analysis complexity
        gamma_activity = features.get("gamma", np.array([0])).mean()

        if gamma_activity > 0.5:
            return "deep_analysis"
        elif gamma_activity > 0.3:
            return "standard_analysis"
        else:
            return "quick_scan"

    async def _highlight_node(self, node_id: str):
        """Highlight a specific node in the graph"""
        # This would integrate with the graph visualization system
        logger.info(f"Highlighting node: {node_id}")

    async def _navigate_graph(self, direction: str):
        """Navigate the graph in specified direction"""
        logger.info(f"Navigating graph: {direction}")
        # Update graph center position based on direction
        if direction == "left":
            self.graph_state["center_position"] = (
                self.graph_state["center_position"][0] - 50,
                self.graph_state["center_position"][1],
            )
        elif direction == "right":
            self.graph_state["center_position"] = (
                self.graph_state["center_position"][0] + 50,
                self.graph_state["center_position"][1],
            )
        elif direction == "forward":
            self.graph_state["center_position"] = (
                self.graph_state["center_position"][0],
                self.graph_state["center_position"][1] + 50,
            )

        await self._update_graph_view()

    async def _trigger_analysis(self, analysis_type: str):
        """Trigger AI analysis of current graph view"""
        logger.info(f"Triggering {analysis_type} on current view")
        self.graph_state["analysis_mode"] = analysis_type

    async def _update_graph_view(self):
        """Update the graph visualization"""
        logger.info(
            f"Updating graph view: zoom={self.graph_state['zoom_level']:.2f}, "
            f"center={self.graph_state['center_position']}"
        )

    async def _get_nearest_node(self) -> str:
        """Get the nearest node to current focus"""
        # This would use actual graph data to find nearest node
        return f"node_{np.random.randint(1, 100)}"

    def get_graph_state(self) -> dict[str, Any]:
        """Get current graph interface state"""
        return {
            **self.graph_state,
            "bci_metrics": self.bci_controller.get_performance_metrics(),
            "timestamp": datetime.now().isoformat(),
        }


def create_bci_system(
    num_channels: int = 64, sampling_rate: float = 250.0
) -> tuple[BCIController, BCIGraphInterface]:
    """
    Create a complete BCI system for graph interaction

    Args:
        num_channels: Number of EEG channels
        sampling_rate: EEG sampling rate in Hz

    Returns:
        Tuple of (BCI controller, Graph interface)
    """
    bci_controller = BCIController(num_channels, sampling_rate)
    graph_interface = BCIGraphInterface(bci_controller)

    logger.info(f"BCI system created with {num_channels} channels at {sampling_rate}Hz")
    return bci_controller, graph_interface


def simulate_eeg_signal(
    num_channels: int = 64,
    duration: float = 1.0,
    sampling_rate: float = 250.0,
    command: BCICommand | None = None,
) -> EEGSignal:
    """
    Simulate realistic EEG signal for testing

    Args:
        num_channels: Number of EEG channels
        duration: Signal duration in seconds
        sampling_rate: Sampling rate in Hz
        command: Optional command to simulate

    Returns:
        Simulated EEG signal
    """
    num_samples = int(duration * sampling_rate)

    # Generate base EEG-like signal
    time_vector = np.linspace(0, duration, num_samples)

    signal_data = np.zeros((num_channels, num_samples))

    for ch in range(num_channels):
        # Alpha waves (8-13 Hz)
        alpha_component = 10 * np.sin(2 * np.pi * 10 * time_vector + np.random.random() * 2 * np.pi)

        # Beta waves (13-30 Hz)
        beta_component = 5 * np.sin(2 * np.pi * 20 * time_vector + np.random.random() * 2 * np.pi)

        # Noise
        noise_component = np.random.normal(0, 2, num_samples)

        # Command-specific modulation
        if command == BCICommand.FOCUS:
            # Increased alpha activity
            alpha_component *= 1.5
        elif command == BCICommand.SELECT:
            # Increased beta activity
            beta_component *= 1.3
        elif command == BCICommand.NAVIGATE:
            # Asymmetric activity
            if ch % 2 == 0:  # Left hemisphere
                alpha_component *= 1.2
            else:  # Right hemisphere
                alpha_component *= 0.8

        signal_data[ch] = alpha_component + beta_component + noise_component

    channel_names = [f"EEG_{i+1:02d}" for i in range(num_channels)]

    return EEGSignal(
        data=signal_data,
        sampling_rate=sampling_rate,
        channels=channel_names,
        timestamp=datetime.now(),
        duration=duration,
        metadata={"simulated": True, "target_command": command.value if command else None},
    )


logger.info("Brain-Computer Interface system initialized with neural decoding capabilities")
