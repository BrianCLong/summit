# Science Adapter API

The Science Adapter API provides a unified interface for interacting with physics foundation models (e.g., Walrus, AION-1).

## Interface

See `src/models/adapters/science/base.py` for the abstract base class.

## Usage

Adapters are intended to be implemented for specific models and loaded dynamically.
The interface enforces a clean separation between the Summit runtime and the model implementation.
