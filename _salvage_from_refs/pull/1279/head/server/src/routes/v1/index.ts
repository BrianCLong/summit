import { Router } from "express";
import health from "./health";
import cases from "./cases";
import entities from "./entities";
import edges from "./edges";
import ingest from "./ingest";
import search from "./search";
import auth from "./auth";
import prov from "./prov";

export const routerV1 = Router();

routerV1.use("/health", health);
routerV1.use("/cases", cases);
routerV1.use("/entities", entities);
routerV1.use("/edges", edges);
routerV1.use("/ingest", ingest);
routerV1.use("/search", search);
routerV1.use("/auth", auth);
routerV1.use("/prov", prov);