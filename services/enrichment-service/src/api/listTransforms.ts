import { Request, Response } from 'express';

export const listTransforms = (req: Request, res: Response) => {
  const transforms = [
    {
      id: 'TRANS-001',
      name: 'To IP Address',
      description: 'Resolves a domain to an IP address.',
      inputTypes: ['Domain'],
      outputTypes: ['IPv4Address'],
    },
    {
      id: 'TRANS-002',
      name: 'To DNS Name',
      description: 'Resolves an IP address to a DNS name.',
      inputTypes: ['IPv4Address'],
      outputTypes: ['Domain'],
    },
    {
      id: 'TRANS-003',
      name: 'To Email Address',
      description: 'Finds email addresses associated with a domain or person.',
      inputTypes: ['Domain', 'Person'],
      outputTypes: ['Email'],
    },
    {
      id: 'TRANS-004',
      name: 'To Social Media Profile',
      description: 'Finds social media profiles for an email or person.',
      inputTypes: ['Email', 'Person'],
      outputTypes: ['SocialProfile'],
    },
    {
      id: 'TRANS-005',
      name: 'Extract Entities',
      description: 'Extracts entities from text.',
      inputTypes: ['Text'],
      outputTypes: ['Person', 'Location', 'Organization'],
    }
  ];

  res.json({ transforms });
};
