import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import pino from 'pino';

const logger = pino();

export const serviceAuthzMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const sourceSpiffeId = req.headers['x-spiffe-id'];
  const destinationService = req.hostname;

  if (!sourceSpiffeId) {
    return res.status(401).send('Missing SPIFFE ID');
  }

  try {
    const response = await axios.post(
      'http://localhost:8181/v1/data/services/allow',
      {
        input: {
          source_spiffe_id: sourceSpiffeId,
          destination_service: destinationService,
        },
      },
    );

    if (response.data.result) {
      next();
    } else {
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};
