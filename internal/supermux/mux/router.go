package mux

import (
	"sync"
	pkg "supermux/pkg/supermux"
)

type Router struct {
	mu          sync.RWMutex
	subscribers map[pkg.SessionID][]chan *Frame
	globalSub   []chan *Frame
}

func NewRouter() *Router {
	return &Router{
		subscribers: make(map[pkg.SessionID][]chan *Frame),
	}
}

func (r *Router) Subscribe(session pkg.SessionID) chan *Frame {
	ch := make(chan *Frame, 100)
	r.mu.Lock()
	defer r.mu.Unlock()

	if session == "" {
		r.globalSub = append(r.globalSub, ch)
	} else {
		r.subscribers[session] = append(r.subscribers[session], ch)
	}
	return ch
}

func (r *Router) Unsubscribe(session pkg.SessionID, ch chan *Frame) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if session == "" {
		for i, sub := range r.globalSub {
			if sub == ch {
				r.globalSub = append(r.globalSub[:i], r.globalSub[i+1:]...)
				close(ch)
				return
			}
		}
	} else {
		subs := r.subscribers[session]
		for i, sub := range subs {
			if sub == ch {
				r.subscribers[session] = append(subs[:i], subs[i+1:]...)
				close(ch)
				return
			}
		}
	}
}

func (r *Router) Route(frame *Frame) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, ch := range r.globalSub {
		select {
		case ch <- frame:
		default: // non-blocking drop or buffer handling could be added
		}
	}

	if subs, exists := r.subscribers[frame.SessionID]; exists {
		for _, ch := range subs {
			select {
			case ch <- frame:
			default: // non-blocking
			}
		}
	}
}
