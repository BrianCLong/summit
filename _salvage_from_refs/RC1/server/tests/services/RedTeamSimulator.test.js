const bus = require("../../src/workers/eventBus");
const RedTeamSimulator = require("../../src/services/RedTeamSimulator");
require("../../src/workers/normalizationWorker");

describe("RedTeamSimulator", () => {
  test("injects scenario events", (done) => {
    const sim = new RedTeamSimulator();
    bus.once("normalized-event", (evt) => {
      try {
        expect(evt.source).toBe("red-team");
        expect(evt.payload.type).toBe("phishing");
        done();
      } catch (err) {
        done(err);
      }
    });
    sim.inject("phishing-campaign");
  });
});
