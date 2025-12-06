import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  createPublicClient,
  formatEther,
  formatGwei,
  hexToBigInt,
  hexToNumber,
  http,
  numberToHex,
  type PublicClient,
} from 'viem';
import type { IExecuteFunctions } from 'n8n-workflow';

export function normalizeBlockTag(tag: string): string {
  if (tag === undefined || tag === null) {
    return 'latest';
  }

  if (/^\d+$/.test(tag)) {
    return numberToHex(BigInt(tag));
  }

  return tag;
}

export function asNumber(hexValue: string | null | undefined): number | null {
  if (!hexValue) {
    return null;
  }

  try {
    return hexToNumber(hexValue as `0x${string}`);
  } catch (error) {
    return null;
  }
}

export function asBigIntString(hexValue: string | null | undefined): string | null {
  if (!hexValue) {
    return null;
  }

  try {
    return hexToBigInt(hexValue as `0x${string}`).toString();
  } catch (error) {
    return null;
  }
}

export function asEtherFromWei(hexValue: string | null | undefined): string | null {
  if (!hexValue) {
    return null;
  }

  try {
    return formatEther(hexToBigInt(hexValue as `0x${string}`));
  } catch (error) {
    return null;
  }
}

export function asGweiFromWei(hexValue: string | null | undefined): string | null {
  if (!hexValue) {
    return null;
  }

  try {
    return formatGwei(hexToBigInt(hexValue as `0x${string}`));
  } catch (error) {
    return null;
  }
}

export function mapBlock(block: any) {
  if (!block) return null;

  return {
    ...block,
    numberDecimal: asNumber(block?.number ?? null),
    timestamp: asNumber(block?.timestamp ?? null),
    gasUsedDecimal: asBigIntString(block?.gasUsed ?? null),
    gasLimitDecimal: asBigIntString(block?.gasLimit ?? null),
  };
}

export function mapTransaction(tx: any) {
  if (!tx) return null;
  return {
    ...tx,
    blockNumberDecimal: asNumber(tx?.blockNumber ?? null),
    transactionIndexDecimal: asNumber(tx?.transactionIndex ?? null),
    valueDecimal: asBigIntString(tx?.value ?? null),
    gasDecimal: asBigIntString(tx?.gas ?? null),
    gasPriceDecimal: asBigIntString(tx?.gasPrice ?? null),
  };
}

export function mapTransactionReceipt(receipt: any) {
  if (!receipt) return null;
  return {
    ...receipt,
    blockNumberDecimal: asNumber(receipt?.blockNumber ?? null),
    transactionIndexDecimal: asNumber(receipt?.transactionIndex ?? null),
    cumulativeGasUsedDecimal: asBigIntString(receipt?.cumulativeGasUsed ?? null),
    effectiveGasPriceDecimal: asBigIntString(receipt?.effectiveGasPrice ?? null),
    gasUsedDecimal: asBigIntString(receipt?.gasUsed ?? null),
    logs: Array.isArray(receipt?.logs)
      ? receipt.logs.map((log: any) => mapLog(log))
      : receipt?.logs,
  };
}

export function mapLog(log: any) {
  if (!log) return null;
  return {
    ...log,
    blockNumberDecimal: asNumber(log?.blockNumber ?? null),
    logIndexDecimal: asNumber(log?.logIndex ?? null),
    transactionIndexDecimal: asNumber(log?.transactionIndex ?? null),
  };
}

export function mapSyncing(syncing: any) {
  if (syncing === false) {
    return { syncing: false, currentBlock: null, highestBlock: null };
  }

  return {
    syncing: true,
    currentBlock: asNumber(syncing?.currentBlock ?? null),
    highestBlock: asNumber(syncing?.highestBlock ?? null),
    knownStates: asNumber(syncing?.knownStates ?? null),
    pulledStates: asNumber(syncing?.pulledStates ?? null),
  };
}

export async function createEthereumClient(
  context: IExecuteFunctions,
  node: INode,
): Promise<PublicClient> {
  const credentials = await context.getCredentials('ethereumRpcApi');
  const rpcUrl = (credentials?.rpcUrl as string | undefined)?.trim();

  if (!rpcUrl) {
    throw new NodeOperationError(node, 'No Ethereum RPC connection URL found.');
  }

  return createPublicClient({
    transport: http(rpcUrl),
  });
}
