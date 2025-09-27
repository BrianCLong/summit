package util

import (
    "encoding/json"
    "net/http"
)

func WriteJSON(w http.ResponseWriter, status int, payload any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if payload == nil {
        return
    }
    _ = json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, err error) {
    type errorResponse struct {
        Error string `json:"error"`
    }
    WriteJSON(w, status, errorResponse{Error: err.Error()})
}

