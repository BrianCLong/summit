import { createRequire } from 'node:module';
import { AdaptiveConsentSDK } from '../src/sdk.js';
import { ConsentArtifact, ConsentDecision, PolicyTemplatePack } from '../src/types.js';

const require = createRequire(import.meta.url);
const pack = require('../templates/policyPack.json') as PolicyTemplatePack;

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4ZMiSBOZ92zaa
RVrz/A1ZG8XvA+qBAAr7+OnmjPFJNizky28ruCgYpwpraTClOS/dOPRUR9BV+3P8
3mazx1qpQQ2yoqcyMyHi6+rozAIZ7TQNTIbzN/tJdFtrwBANOh8yIF+l1LKU3aRT
V5E0z5fJrNMK31oTxpHVPKZ5rUZH810FJ1x4xvytYESd5R7RSgz431Jjzoo5rUou
0It+U9l4BF1nICuhJdI0YUHBcciY4yW+KblwypqVt2jr+GhuVQNuqmejMINnOB6t
kc5YWnRbQAaEP1z44MmJyjicgIjSuDBQpR0s8b209VFJByOwRrujKa3HQtXveOCl
1QCifFIdAgMBAAECggEARjS1OwdbnNKwjPdYJGo0yNcuuwzCJgCWrg49PDcwjR/v
4uLj/oDc31oGORQxXc8Svsd3G3nGRF57cG1bLBr8lVG7/eY5A399aPFLHPzD1gw+
08tt3D/V0MdZIYLcebTF+Odjk3eS0OQ8szC1jCZ4E+TV659TpBDoKIixl8VV64GC
nWJRWPINatDhiV7vYxNqGG1VcV64YJOMORLFltTPV/LE8kfbejtE0ilVgwzMEVwg
oGy0zFhNxWNKM11pvSg0XZzYKx8eBf1GbMDA3Cd3nXpdiDyB/5pVLUGOAzY8HPje
iP/Js2XviSJis7YjYsEDJouCwS3wh7t15AgqU9L3TwKBgQDuq3rHNRrtYfZM8Tx0
Ycp+PXEThUSdpkuzPQ8Po8Q3xvr5JieCLuhCJKfLGeywTFqf6SMZBukRiuWL/Kmy
4DW3XLp7B47gLdb8pUjDF/n1nGznBiky7JcuJyHgPVyAT3ntk1nEzCiXNIRmJMJR
HxnVTgkmJ69Qp8RwJR/ziAljhwKBgQDFyGPhxZV+0l6PeKitsqyhgOalrsYmYola
M6hfPS0k0MNUo2nGeX3NUQJYW/ngpQzZkH/TKWI2vRfeJiINvrt42Cihdm7DsHAS
VxYvvYTU2pjruipvQeUl9Z4Jar8wefVjL7mzDK/xiU+sn9yIpgdjCoyVtnqEHneH
ED9J/lcOOwKBgGLxYf/tqxEYGISDSZ2x4MF+9T6zc+OrShyvRmwkZzb8XZUmVSCq
E41AJvOS9sWLkdJTU0KP09V68HidMTi/rGUsov5X/so/Fq48UzLV4MEKrTcFHdVH
sdDnVirhJVToHdL40DE+teEhW3YA7TG2I/6C0FYqA4r7Uftv2JQcJFBHAoGAUjBd
4VpcL2F4TiKT5eqT9mE8d6lTSmw0K7m/xCQF+ICQS0HFGOcvsfxx/wnposKzvk1f
8P4HhDu8CWLLT+7stOEOsVon2UYerGBoJdqZsmJMndi0/ZrigI266KrlXF2x7U/N
2WvySWsIIvIjkN19wFiH50b3TqPig8vqoPMCdjUCgYEAiCaAi+uXglgE709Xm5Oe
GHYmc0bFjY9PeqCeK335tJBVLDWTNDWuB1YQKFie/yW7aJS5580DvsMzV0SxK4xw
ENF514k0OjOaLggeG3dkYYDjOOCxVbVHAbiPAgdW0jYhjOixCSzZhmLgujhEhF27
OMSe69p4+hmWFeysEsHnF2A=
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuGTIkgTmfds2mkVa8/wN
WRvF7wPqgQAK+/jp5ozxSTYs5MtvK7goGKcKa2kwpTkv3Tj0VEfQVftz/N5ms8da
qUENsqKnMjMh4uvq6MwCGe00DUyG8zf7SXRba8AQDTofMiBfpdSylN2kU1eRNM+X
yazTCt9aE8aR1Tymea1GR/NdBSdceMb8rWBEneUe0UoM+N9SY86KOa1KLtCLflPZ
eARdZyAroSXSNGFBwXHImOMlvim5cMqalbdo6/hoblUDbqpnozCDZzgerZHOWFp0
W0AGhD9c+ODJico4nICI0rgwUKUdLPG9tPVRSQcjsEa7oymtx0LV73jgpdUAonxS
HQIDAQAB
-----END PUBLIC KEY-----`;

describe('Consent artifacts', () => {
  const sdk = new AdaptiveConsentSDK(pack);

  it('signs and verifies artifacts offline', () => {
    const artifact = sdk.emitSignedArtifact('user-123', 'accept', { locale: 'en-US' }, PRIVATE_KEY);
    expect(AdaptiveConsentSDK.verifyArtifact(artifact, PUBLIC_KEY)).toBe(true);
  });

  it('fails verification when payload is altered', () => {
    const artifact = sdk.emitSignedArtifact('user-123', 'accept', { locale: 'en-US' }, PRIVATE_KEY);
    const tampered: ConsentArtifact = {
      ...artifact,
      payload: {
        ...artifact.payload,
        decision: 'reject' as ConsentDecision
      }
    };
    expect(AdaptiveConsentSDK.verifyArtifact(tampered, PUBLIC_KEY)).toBe(false);
  });
});
