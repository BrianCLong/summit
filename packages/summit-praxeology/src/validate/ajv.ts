import Ajv from "ajv";
import addFormats from "ajv-formats";

import actionSchema from "../schemas/pg.action.schema.json" assert { type: "json" };
import playbookSchema from "../schemas/pg.playbook.schema.json" assert { type: "json" };
import hypothesisSchema from "../schemas/pg.hypothesis.schema.json" assert { type: "json" };
import writesetSchema from "../schemas/pg.writeset.schema.json" assert { type: "json" };

export function makeAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: true
  });
  addFormats(ajv);

  ajv.addSchema(actionSchema);
  ajv.addSchema(playbookSchema);
  ajv.addSchema(hypothesisSchema);
  ajv.addSchema(writesetSchema);

  return ajv;
}
