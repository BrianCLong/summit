import { createInputSanitizationPlugin } from '../inputSanitizationPlugin.js';
import { GraphQLError } from 'graphql';
import { GraphQLRequestListener } from '@apollo/server';

describe('createInputSanitizationPlugin', () => {
  it('should be defined', () => {
    const plugin = createInputSanitizationPlugin();
    expect(plugin).toBeDefined();
  });

  it('should return a plugin object', () => {
    const plugin = createInputSanitizationPlugin();
    expect(plugin.requestDidStart).toBeDefined();
  });

  describe('didResolveOperation', () => {
    const plugin = createInputSanitizationPlugin();
    let didResolveOperation: any;

    beforeEach(async () => {
      const listener = await plugin.requestDidStart!({} as any);
      if (listener && typeof listener === 'object' && 'didResolveOperation' in listener) {
        didResolveOperation = (listener as GraphQLRequestListener<any>).didResolveOperation;
      }
    });

    it('should sanitize string inputs by trimming whitespace', async () => {
      const request = {
        variables: {
          name: '  John Doe  ',
          description: '  Some description  ',
        },
        operationName: 'TestOperation',
      };

      await didResolveOperation({ request } as any);

      expect(request.variables.name).toBe('John Doe');
      expect(request.variables.description).toBe('Some description');
    });

    it('should remove null bytes from string inputs', async () => {
      const request = {
        variables: {
          content: 'Hello\u0000World',
        },
        operationName: 'TestOperation',
      };

      await didResolveOperation({ request } as any);

      expect(request.variables.content).toBe('HelloWorld');
    });

    it('should handle nested objects', async () => {
      const request = {
        variables: {
          user: {
            name: '  Alice  ',
            profile: {
              bio: '  I am Alice  ',
            },
          },
        },
        operationName: 'TestOperation',
      };

      await didResolveOperation({ request } as any);

      expect(request.variables.user.name).toBe('Alice');
      expect(request.variables.user.profile.bio).toBe('I am Alice');
    });

    it('should handle arrays', async () => {
      const request = {
        variables: {
          tags: ['  tag1  ', '  tag2  '],
        },
        operationName: 'TestOperation',
      };

      await didResolveOperation({ request } as any);

      expect(request.variables.tags[0]).toBe('tag1');
      expect(request.variables.tags[1]).toBe('tag2');
    });

    it('should throw error for deeply nested objects', async () => {
      const deepObject: any = { level1: {} };
      let current = deepObject.level1;
      for (let i = 2; i <= 15; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }

      const request = {
        variables: deepObject,
        operationName: 'TestOperation',
      };

      await expect(didResolveOperation({ request } as any)).rejects.toThrow(
        /Input object is too deep/
      );
    });

    it('should throw error for string input exceeding max length', async () => {
      const longString = 'a'.repeat(10001);
      const request = {
        variables: {
          data: longString,
        },
        operationName: 'TestOperation',
      };

      await expect(didResolveOperation({ request } as any)).rejects.toThrow(
        /Input string is too long/
      );
    });

    it('should not throw for valid depth', async () => {
         const deepObject: any = { level1: { level2: { level3: "value" } } };

      const request = {
        variables: deepObject,
        operationName: 'TestOperation',
      };

       await expect(didResolveOperation({ request } as any)).resolves.not.toThrow();
    });
  });
});
