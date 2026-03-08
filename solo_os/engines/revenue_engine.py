from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence


class RevenueEngine:
    name = "revenue_engine"

    VALID_STATES = ["new", "engaged", "qualified", "proposal", "won", "lost"]

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        leads = req.payload.get("leads", [])

        processed_leads = []
        for lead in leads:
            name = lead.get("name", "Unknown")
            current_state = lead.get("state", "new")
            if current_state not in self.VALID_STATES:
                current_state = "new"

            # Simple state transition logic
            next_state = current_state
            if current_state == "new":
                next_state = "engaged"
            elif current_state == "engaged":
                next_state = "qualified"
            elif current_state == "qualified":
                next_state = "proposal"

            processed_leads.append({
                "name": name,
                "previous_state": current_state,
                "current_state": next_state,
                "follow_up_draft": self._generate_draft(name, next_state)
            })

        summary = {
            "status": "Revenue follow-up drafts generated",
            "leads": processed_leads
        }
        metrics = {
            "leads_processed": len(processed_leads),
            "state_advancements": sum(1 for l in processed_leads if l["current_state"] != l["previous_state"])
        }

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)

    def _generate_draft(self, name: str, state: str) -> str:
        templates = {
            "engaged": f"Hi {name}, thanks for your interest! Let's chat about your needs.",
            "qualified": f"Hi {name}, it looks like we're a great fit. I've prepared some details for you.",
            "proposal": f"Hi {name}, here is the formal proposal for our partnership.",
            "won": f"Welcome aboard, {name}! Let's get started.",
            "lost": f"Thanks for your time, {name}. Let us know if things change.",
            "new": f"Hello {name}, nice to meet you!"
        }
        return templates.get(state, f"Hello {name}!")
