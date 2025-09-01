import express from "express";
import StatusService from "../services/StatusService.js";
const router = express.Router();
const statusService = new StatusService();
router.get("/", (_req, res) => {
    res.json(statusService.getStatus());
});
export default router;
//# sourceMappingURL=status.js.map