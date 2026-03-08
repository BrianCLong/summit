"use strict";
/**
 * Quantum Simulation Types
 * Defines interfaces for quantum circuits and simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GateType = void 0;
var GateType;
(function (GateType) {
    // Single-qubit gates
    GateType["IDENTITY"] = "I";
    GateType["PAULI_X"] = "X";
    GateType["PAULI_Y"] = "Y";
    GateType["PAULI_Z"] = "Z";
    GateType["HADAMARD"] = "H";
    GateType["PHASE"] = "S";
    GateType["T_GATE"] = "T";
    GateType["RX"] = "RX";
    GateType["RY"] = "RY";
    GateType["RZ"] = "RZ";
    // Two-qubit gates
    GateType["CNOT"] = "CNOT";
    GateType["CZ"] = "CZ";
    GateType["SWAP"] = "SWAP";
    // Three-qubit gates
    GateType["TOFFOLI"] = "TOFFOLI";
    GateType["FREDKIN"] = "FREDKIN";
    // Measurement
    GateType["MEASURE"] = "MEASURE";
})(GateType || (exports.GateType = GateType = {}));
