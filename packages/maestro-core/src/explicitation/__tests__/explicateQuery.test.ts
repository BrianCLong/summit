import { explicateQuery, isExplicitationArtifact } from '../explicateQuery';
import { assertRetrievalAllowed } from '../retrievalGate';
import { ExplicitationInput } from '../types';

describe('explicateQuery', () => {
  it('produces a valid explicitation artifact schema', () => {
    const input: ExplicitationInput = {
      userText: 'How do I fix this? ',
      imageRefs: [
        {
          id: 'img-1',
          type: 'screenshot',
          altText: 'Login screen with an error banner',
          detectedText: 'Error 403: Forbidden',
        },
      ],
    };

    const artifact = explicateQuery(input);

    expect(isExplicitationArtifact(artifact)).toBe(true);
    expect(artifact.explicit_query).toContain('How do I fix the screenshot content?');
    expect(artifact.visual_evidence[0]).toContain('Error 403');
    expect(artifact.imputed_intentions).toHaveLength(23);
  });

  it('replaces deictic references with explicit subjects', () => {
    const artifact = explicateQuery({
      userText: 'What is this?',
      imageRefs: [{ id: 'img-2', type: 'photo', altText: 'metal cylinder with fins' }],
    });

    expect(artifact.explicit_query).toContain('What is the photo content?');
  });

  it('preserves scope by keeping the original intent', () => {
    const artifact = explicateQuery({
      userText: 'Explain this diagram of the network.',
      imageRefs: [{ id: 'img-3', type: 'diagram', altText: 'Network nodes A-B-C' }],
    });

    expect(artifact.intent).toBe('explain');
    expect(artifact.explicit_query).toContain('Explain the diagram content of the network.');
  });

  it('builds golden explicitation outputs for underspecified inputs', () => {
    const fixtures: Array<{ input: ExplicitationInput; explicit: string }> = [
      {
        input: {
          userText: 'How do I fix this?',
          imageRefs: [
            {
              id: 'ui-1',
              type: 'screenshot',
              altText: 'Settings page with a red error banner',
              detectedText: 'Sync failed: ERROR 5312',
            },
          ],
        },
        explicit:
          'How do I fix the screenshot content? Visual evidence: Provided screenshot; shows: Settings page with a red error banner; detected text: Sync failed: ERROR 5312.',
      },
      {
        input: {
          userText: 'What is this thing?',
          imageRefs: [
            {
              id: 'photo-1',
              type: 'photo',
              altText: 'small black device with antenna and LCD display',
            },
          ],
        },
        explicit:
          'What is the photo content? Visual evidence: Provided photo; shows: small black device with antenna and LCD display.',
      },
      {
        input: {
          userText: 'Explain this',
          imageRefs: [
            {
              id: 'diagram-1',
              type: 'diagram',
              altText: 'architecture diagram with API gateway and workers',
            },
          ],
        },
        explicit:
          'Explain the diagram content. Visual evidence: Provided diagram; shows: architecture diagram with API gateway and workers.',
      },
      {
        input: {
          userText: 'Is this safe to travel?',
          imageRefs: [
            {
              id: 'map-1',
              type: 'map',
              altText: 'map showing coastal route near Odessa',
            },
          ],
        },
        explicit:
          'Is the map content safe to travel? Visual evidence: Provided map; shows: map showing coastal route near Odessa.',
      },
      {
        input: {
          userText: 'Why does it fail here?',
          imageRefs: [
            {
              id: 'ui-2',
              type: 'screenshot',
              altText: 'email client error dialog',
              detectedText: 'Error code 0x8004',
            },
          ],
          conversationContext: {
            summary: 'User is troubleshooting Outlook sync failures.',
          },
        },
        explicit:
          'Why does the screenshot content fail in the screenshot content? Visual evidence: Provided screenshot; shows: email client error dialog; detected text: Error code 0x8004. Context: User is troubleshooting Outlook sync failures.',
      },
      {
        input: {
          userText: 'How do I fix this in the diagram?',
          imageRefs: [
            {
              id: 'diagram-2',
              type: 'diagram',
              altText: 'process flow with step 3 highlighted',
            },
          ],
        },
        explicit:
          'How do I fix the diagram content in the diagram? Visual evidence: Provided diagram; shows: process flow with step 3 highlighted.',
      },
    ];

    fixtures.forEach(({ input, explicit }) => {
      const artifact = explicateQuery(input);
      expect(artifact.explicit_query).toBe(explicit);
    });
  });

  it('blocks retrieval without explicitation unless waived', () => {
    expect(() => assertRetrievalAllowed({ explicitation: null })).toThrow(
      'Retrieval blocked',
    );

    const artifact = explicateQuery({ userText: 'What is this?' });
    expect(assertRetrievalAllowed({ explicitation: artifact })).toEqual(artifact);

    const waiverArtifact = assertRetrievalAllowed({
      explicitation: null,
      governanceWaiver: {
        waiverId: 'WAIVER-123',
        approvedBy: 'governance',
        reason: 'Emergency bypass',
      },
    });
    expect(waiverArtifact.intent).toBe('governance-waiver');
  });
});
