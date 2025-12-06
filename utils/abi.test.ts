import { describe, expect, it } from 'bun:test';
import { getCallableFunctions } from './abi';

describe('getCallableFunctions', () => {
  it('should return only view and pure functions', () => {
    const abi = [
      {
        type: 'function',
        name: 'viewFunc',
        stateMutability: 'view',
        inputs: [],
        outputs: [],
      },
      {
        type: 'function',
        name: 'pureFunc',
        stateMutability: 'pure',
        inputs: [],
        outputs: [],
      },
      {
        type: 'function',
        name: 'payableFunc',
        stateMutability: 'payable',
        inputs: [],
        outputs: [],
      },
      {
        type: 'function',
        name: 'nonpayableFunc',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
      },
      {
        type: 'event',
        name: 'SomeEvent',
        inputs: [],
      },
    ] as const;

    const result = getCallableFunctions(abi as any);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.name)).toEqual(['viewFunc', 'pureFunc']);
  });

  it('should return empty array if no callable functions found', () => {
    const abi = [
      {
        type: 'event',
        name: 'SomeEvent',
        inputs: [],
      },
    ] as const;

    const result = getCallableFunctions(abi as any);
    expect(result).toEqual([]);
  });
});
