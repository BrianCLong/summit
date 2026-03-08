"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimelinePane;
function TimelinePane({ events }) {
    return (<ul className="p-2 border">
      {events.map((e) => (<li key={e.id}>{e.label}</li>))}
    </ul>);
}
