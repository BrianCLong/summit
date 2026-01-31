type LegalHoldRequest = {
  params: { id: string };
  db: {
    case: {
      findUnique: (input: { where: { id: string } }) => Promise<{ legalHold?: boolean } | null>;
    };
  };
};

type LegalHoldReply = {
  code: (status: number) => { send: (payload: { error: string }) => unknown };
};

export const denyWhenHold = async (req: LegalHoldRequest, reply: LegalHoldReply) => {
  const { id } = req.params;
  const c = await req.db.case.findUnique({ where: { id } });
  if (c?.legalHold) {
    return reply
      .code(423)
      .send({ error: 'Legal hold active: operation locked' });
  }
};
