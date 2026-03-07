import React from "react";
import { Link } from "react-router-dom";

export function AppNav() {
  return (
    <nav className="rounded-2xl border p-3 flex gap-3">
      <Link className="underline" to="/cognitive-battlespace">
        Cognitive Battlespace
      </Link>
    </nav>
  );
}
