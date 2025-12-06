import { describe, expect, it } from 'bun:test';
import { serializeForN8n } from './serialization';

describe('serializeForN8n', () => {
  it('should convert BigInt to string', () => {
    const input = 123456789012345678901234567890n;
    const result = serializeForN8n(input);
    expect(result).toBe('123456789012345678901234567890');
  });

  it('should handle arrays recursively', () => {
    const input = [1n, 2n, [3n]];
    const result = serializeForN8n(input);
    expect(result).toEqual(['1', '2', ['3']]);
  });

  it('should handle objects recursively', () => {
    const input = { a: 1n, b: { c: 2n } };
    const result = serializeForN8n(input);
    expect(result).toEqual({ a: '1', b: { c: '2' } });
  });

  it('should handle mixed types', () => {
    const input = {
      num: 123,
      str: 'hello',
      bool: true,
      big: 999n,
      arr: [10n, { nested: 20n }],
    };
    const result = serializeForN8n(input);
    expect(result).toEqual({
      num: 123,
      str: 'hello',
      bool: true,
      big: '999',
      arr: ['10', { nested: '20' }],
    });
  });

  it('should return null/undefined as is', () => {
    expect(serializeForN8n(null)).toBe(null);
    expect(serializeForN8n(undefined)).toBe(undefined);
  });
});
