import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Abi } from 'viem';

export function parseAbi(abiParam: string, node: INode, itemIndex?: number): Abi {
  let parsedAbi: Abi;
  try {
    parsedAbi = JSON.parse(abiParam) as Abi;
  } catch (error) {
    throw new NodeOperationError(node, 'ABI must be valid JSON', { itemIndex });
  }

  if (!Array.isArray(parsedAbi)) {
    throw new NodeOperationError(node, 'ABI must be an array', { itemIndex });
  }
  return parsedAbi;
}

export function getCallableFunctions(abi: Abi): any[] {
  return abi.filter(
    (entry: any) =>
      entry?.type === 'function' &&
      (entry.stateMutability === 'view' || entry.stateMutability === 'pure'),
  );
}
