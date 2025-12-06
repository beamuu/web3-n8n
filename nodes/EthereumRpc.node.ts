import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  asBigIntString,
  asEtherFromWei,
  asGweiFromWei,
  asNumber,
  createEthereumClient,
  mapBlock,
  mapLog,
  mapSyncing,
  mapTransaction,
  mapTransactionReceipt,
  normalizeBlockTag,
} from '../utils/ethereum-rpc';
import { serializeForN8n } from '../utils/serialization';

abstract class BaseEthereumRpcNode implements INodeType {
  abstract description: INodeTypeDescription;
  abstract rpcMethod: string;

  async buildParams(this: IExecuteFunctions, _itemIndex: number): Promise<any[]> {
    return [];
  }

  mapResponse(data: any): any {
    return serializeForN8n(data);
  }

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const client = await createEthereumClient(this, this.getNode());
    const results: any[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const params = await this.buildParams(i);
        const response = await client.request({
          method: this.rpcMethod as any,
          params,
        });
        results.push(this.mapResponse(response));
      } catch (error) {
        throw new NodeOperationError(this.getNode(), (error as Error).message, {
          itemIndex: i,
        });
      }
    }

    return [this.helpers.returnJsonArray(results)];
  }
}

const baseNodeConfig = {
  group: ['input'],
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'ethereumRpcApi',
      required: true,
    },
  ],
};

export class EthChainId extends BaseEthereumRpcNode {
  rpcMethod = 'eth_chainId';

  description: INodeTypeDescription = {
    displayName: 'eth_chainId',
    name: 'ethChainId',
    description: 'Returns the chain ID of the current network.',
    defaults: { name: 'eth_chainId' },
    properties: [],
    ...baseNodeConfig,
  };

  mapResponse(data: any) {
    return {
      chainIdHex: data,
      chainId: asNumber(data),
    };
  }
}

export class EthBlockNumber extends BaseEthereumRpcNode {
  rpcMethod = 'eth_blockNumber';

  description: INodeTypeDescription = {
    displayName: 'eth_blockNumber',
    name: 'ethBlockNumber',
    description: 'Returns the latest block number.',
    defaults: { name: 'eth_blockNumber' },
    properties: [],
    ...baseNodeConfig,
  };

  mapResponse(data: any) {
    return {
      blockNumberHex: data,
      blockNumber: asNumber(data),
    };
  }
}

export class EthSyncing extends BaseEthereumRpcNode {
  rpcMethod = 'eth_syncing';

  description: INodeTypeDescription = {
    displayName: 'eth_syncing',
    name: 'ethSyncing',
    description: 'Indicates if the node is syncing.',
    defaults: { name: 'eth_syncing' },
    properties: [],
    ...baseNodeConfig,
  };

  mapResponse(data: any) {
    return mapSyncing(data);
  }
}

export class EthGetBlockByNumber extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getBlockByNumber';

  description: INodeTypeDescription = {
    displayName: 'eth_getBlockByNumber',
    name: 'ethGetBlockByNumber',
    description: 'Fetches a block by number or tag.',
    defaults: { name: 'eth_getBlockByNumber' },
    properties: [
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
        required: true,
        description: 'Block number (decimal) or tag such as latest, earliest, pending',
      },
      {
        displayName: 'Include Transactions',
        name: 'includeTransactions',
        type: 'boolean',
        default: false,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockTag = this.getNodeParameter('blockTag', itemIndex) as string;
    const includeTransactions = this.getNodeParameter(
      'includeTransactions',
      itemIndex,
      false,
    ) as boolean;
    return [normalizeBlockTag(blockTag), includeTransactions];
  }

  mapResponse(data: any) {
    const mapped = mapBlock(data);
    if (mapped?.transactions && Array.isArray(mapped.transactions)) {
      mapped.transactions = mapped.transactions.map((tx: any) =>
        typeof tx === 'string' ? tx : mapTransaction(tx),
      );
    }
    return mapped;
  }
}

export class EthGetBlockByHash extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getBlockByHash';

  description: INodeTypeDescription = {
    displayName: 'eth_getBlockByHash',
    name: 'ethGetBlockByHash',
    description: 'Fetches a block by hash.',
    defaults: { name: 'eth_getBlockByHash' },
    properties: [
      {
        displayName: 'Block Hash',
        name: 'blockHash',
        type: 'string',
        default: '',
        required: true,
        description: '32-byte block hash prefixed by 0x',
      },
      {
        displayName: 'Include Transactions',
        name: 'includeTransactions',
        type: 'boolean',
        default: false,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockHash = this.getNodeParameter('blockHash', itemIndex) as string;
    const includeTransactions = this.getNodeParameter(
      'includeTransactions',
      itemIndex,
      false,
    ) as boolean;
    return [blockHash, includeTransactions];
  }

  mapResponse(data: any) {
    const mapped = mapBlock(data);
    if (mapped?.transactions && Array.isArray(mapped.transactions)) {
      mapped.transactions = mapped.transactions.map((tx: any) =>
        typeof tx === 'string' ? tx : mapTransaction(tx),
      );
    }
    return mapped;
  }
}

export class EthGetBlockTransactionCountByNumber extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getBlockTransactionCountByNumber';

  description: INodeTypeDescription = {
    displayName: 'eth_getBlockTransactionCountByNumber',
    name: 'ethGetBlockTransactionCountByNumber',
    description: 'Returns the number of transactions in a block by number.',
    defaults: { name: 'eth_getBlockTransactionCountByNumber' },
    properties: [
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockTag = this.getNodeParameter('blockTag', itemIndex) as string;
    return [normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return { countHex: data, count: asNumber(data) };
  }
}

export class EthGetBlockTransactionCountByHash extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getBlockTransactionCountByHash';

  description: INodeTypeDescription = {
    displayName: 'eth_getBlockTransactionCountByHash',
    name: 'ethGetBlockTransactionCountByHash',
    description: 'Returns the number of transactions in a block by hash.',
    defaults: { name: 'eth_getBlockTransactionCountByHash' },
    properties: [
      {
        displayName: 'Block Hash',
        name: 'blockHash',
        type: 'string',
        default: '',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockHash = this.getNodeParameter('blockHash', itemIndex) as string;
    return [blockHash];
  }

  mapResponse(data: any) {
    return { countHex: data, count: asNumber(data) };
  }
}

export class EthGetUncleCountByBlockNumber extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getUncleCountByBlockNumber';

  description: INodeTypeDescription = {
    displayName: 'eth_getUncleCountByBlockNumber',
    name: 'ethGetUncleCountByBlockNumber',
    description: 'Returns uncle count for a block number.',
    defaults: { name: 'eth_getUncleCountByBlockNumber' },
    properties: [
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockTag = this.getNodeParameter('blockTag', itemIndex) as string;
    return [normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return { uncleCountHex: data, uncleCount: asNumber(data) };
  }
}

export class EthGetUncleCountByBlockHash extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getUncleCountByBlockHash';

  description: INodeTypeDescription = {
    displayName: 'eth_getUncleCountByBlockHash',
    name: 'ethGetUncleCountByBlockHash',
    description: 'Returns uncle count for a block hash.',
    defaults: { name: 'eth_getUncleCountByBlockHash' },
    properties: [
      {
        displayName: 'Block Hash',
        name: 'blockHash',
        type: 'string',
        default: '',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockHash = this.getNodeParameter('blockHash', itemIndex) as string;
    return [blockHash];
  }

  mapResponse(data: any) {
    return { uncleCountHex: data, uncleCount: asNumber(data) };
  }
}

export class EthGetBalance extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getBalance';

  description: INodeTypeDescription = {
    displayName: 'eth_getBalance',
    name: 'ethGetBalance',
    description: 'Returns account balance (in wei).',
    defaults: { name: 'eth_getBalance' },
    properties: [
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const address = this.getNodeParameter('address', itemIndex) as string;
    const blockTag = this.getNodeParameter('blockTag', itemIndex, 'latest') as string;
    return [address, normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return {
      balanceWei: data,
      balanceEther: asEtherFromWei(data),
    };
  }
}

export class EthGetTransactionCount extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getTransactionCount';

  description: INodeTypeDescription = {
    displayName: 'eth_getTransactionCount',
    name: 'ethGetTransactionCount',
    description: 'Returns the nonce for an address.',
    defaults: { name: 'eth_getTransactionCount' },
    properties: [
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const address = this.getNodeParameter('address', itemIndex) as string;
    const blockTag = this.getNodeParameter('blockTag', itemIndex, 'latest') as string;
    return [address, normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return {
      nonceHex: data,
      nonce: asNumber(data),
    };
  }
}

export class EthGetCode extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getCode';

  description: INodeTypeDescription = {
    displayName: 'eth_getCode',
    name: 'ethGetCode',
    description: 'Returns contract bytecode at an address.',
    defaults: { name: 'eth_getCode' },
    properties: [
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const address = this.getNodeParameter('address', itemIndex) as string;
    const blockTag = this.getNodeParameter('blockTag', itemIndex, 'latest') as string;
    return [address, normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return { code: data };
  }
}

export class EthGetStorageAt extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getStorageAt';

  description: INodeTypeDescription = {
    displayName: 'eth_getStorageAt',
    name: 'ethGetStorageAt',
    description: 'Reads storage slot at an address.',
    defaults: { name: 'eth_getStorageAt' },
    properties: [
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Slot (hex or decimal)',
        name: 'slot',
        type: 'string',
        default: '0x0',
        required: true,
      },
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const address = this.getNodeParameter('address', itemIndex) as string;
    const slot = this.getNodeParameter('slot', itemIndex) as string;
    const blockTag = this.getNodeParameter('blockTag', itemIndex, 'latest') as string;
    return [address, slot, normalizeBlockTag(blockTag)];
  }

  mapResponse(data: any) {
    return { value: data };
  }
}

export class EthGetTransactionByHash extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getTransactionByHash';

  description: INodeTypeDescription = {
    displayName: 'eth_getTransactionByHash',
    name: 'ethGetTransactionByHash',
    description: 'Returns transaction details by hash.',
    defaults: { name: 'eth_getTransactionByHash' },
    properties: [
      {
        displayName: 'Transaction Hash',
        name: 'txHash',
        type: 'string',
        default: '',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const txHash = this.getNodeParameter('txHash', itemIndex) as string;
    return [txHash];
  }

  mapResponse(data: any) {
    return mapTransaction(data);
  }
}

export class EthGetTransactionReceipt extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getTransactionReceipt';

  description: INodeTypeDescription = {
    displayName: 'eth_getTransactionReceipt',
    name: 'ethGetTransactionReceipt',
    description: 'Returns transaction receipt with logs.',
    defaults: { name: 'eth_getTransactionReceipt' },
    properties: [
      {
        displayName: 'Transaction Hash',
        name: 'txHash',
        type: 'string',
        default: '',
        required: true,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const txHash = this.getNodeParameter('txHash', itemIndex) as string;
    return [txHash];
  }

  mapResponse(data: any) {
    return mapTransactionReceipt(data);
  }
}

export class EthCall extends BaseEthereumRpcNode {
  rpcMethod = 'eth_call';

  description: INodeTypeDescription = {
    displayName: 'eth_call',
    name: 'ethCall',
    description: 'Executes a read-only call on a contract.',
    defaults: { name: 'eth_call' },
    properties: [
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Block Tag',
        name: 'blockTag',
        type: 'string',
        default: 'latest',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const to = this.getNodeParameter('to', itemIndex) as string;
    const data = this.getNodeParameter('data', itemIndex) as string;
    const blockTag = this.getNodeParameter('blockTag', itemIndex, 'latest') as string;
    return [
      {
        to,
        data,
      },
      normalizeBlockTag(blockTag),
    ];
  }

  mapResponse(data: any) {
    return { result: data };
  }
}

export class EthEstimateGas extends BaseEthereumRpcNode {
  rpcMethod = 'eth_estimateGas';

  description: INodeTypeDescription = {
    displayName: 'eth_estimateGas',
    name: 'ethEstimateGas',
    description: 'Simulates a transaction and estimates gas usage.',
    defaults: { name: 'eth_estimateGas' },
    properties: [
      {
        displayName: 'From (optional)',
        name: 'from',
        type: 'string',
        default: '',
      },
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Data (optional)',
        name: 'data',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Value (wei, optional)',
        name: 'value',
        type: 'string',
        default: '',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const from = (this.getNodeParameter('from', itemIndex) as string) || undefined;
    const to = this.getNodeParameter('to', itemIndex) as string;
    const data = (this.getNodeParameter('data', itemIndex) as string) || undefined;
    const value = (this.getNodeParameter('value', itemIndex) as string) || undefined;

    const tx: Record<string, string> = { to };
    if (from) tx.from = from;
    if (data) tx.data = data;
    if (value) tx.value = value;

    return [tx];
  }

  mapResponse(data: any) {
    return {
      gasHex: data,
      gas: asNumber(data) ?? asBigIntString(data),
    };
  }
}

export class EthCreateAccessList extends BaseEthereumRpcNode {
  rpcMethod = 'eth_createAccessList';

  description: INodeTypeDescription = {
    displayName: 'eth_createAccessList',
    name: 'ethCreateAccessList',
    description: 'Generates access list for EIP-2930 transactions (still read-only).',
    defaults: { name: 'eth_createAccessList' },
    properties: [
      {
        displayName: 'Transaction (JSON)',
        name: 'transaction',
        type: 'json',
        default: {},
        required: true,
        description: 'Transaction object with to/from/data/value fields as needed',
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const transaction = this.getNodeParameter('transaction', itemIndex) as Record<string, any>;
    return [transaction];
  }
}

export class EthGetLogs extends BaseEthereumRpcNode {
  rpcMethod = 'eth_getLogs';

  description: INodeTypeDescription = {
    displayName: 'eth_getLogs',
    name: 'ethGetLogs',
    description: 'Returns logs matching the given filter.',
    defaults: { name: 'eth_getLogs' },
    properties: [
      {
        displayName: 'From Block',
        name: 'fromBlock',
        type: 'string',
        default: 'latest',
      },
      {
        displayName: 'To Block',
        name: 'toBlock',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Topics (JSON array)',
        name: 'topics',
        type: 'json',
        default: undefined,
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const filter: Record<string, any> = {};

    const fromBlock = this.getNodeParameter('fromBlock', itemIndex, '') as string;
    const toBlock = this.getNodeParameter('toBlock', itemIndex, '') as string;
    const address = this.getNodeParameter('address', itemIndex, '') as string;
    const topics = this.getNodeParameter('topics', itemIndex) as any;

    filter.fromBlock = normalizeBlockTag(fromBlock || 'latest');
    if (toBlock) filter.toBlock = normalizeBlockTag(toBlock);
    if (address) filter.address = address;
    if (topics !== undefined && topics !== null && topics !== '') {
      filter.topics = topics;
    }

    return [filter];
  }

  mapResponse(data: any) {
    const logs = Array.isArray(data) ? data.map((log) => mapLog(log)) : data;
    return { logs };
  }
}

export class EthGasPrice extends BaseEthereumRpcNode {
  rpcMethod = 'eth_gasPrice';

  description: INodeTypeDescription = {
    displayName: 'eth_gasPrice',
    name: 'ethGasPrice',
    description: 'Returns the current gas price in wei.',
    defaults: { name: 'eth_gasPrice' },
    properties: [],
    ...baseNodeConfig,
  };

  mapResponse(data: any) {
    return {
      gasPriceWei: data,
      gasPriceGwei: asGweiFromWei(data),
    };
  }
}

export class EthFeeHistory extends BaseEthereumRpcNode {
  rpcMethod = 'eth_feeHistory';

  description: INodeTypeDescription = {
    displayName: 'eth_feeHistory',
    name: 'ethFeeHistory',
    description: 'Returns historical gas base fees and priority fees.',
    defaults: { name: 'eth_feeHistory' },
    properties: [
      {
        displayName: 'Block Count',
        name: 'blockCount',
        type: 'number',
        default: 10,
        required: true,
      },
      {
        displayName: 'Newest Block',
        name: 'newestBlock',
        type: 'string',
        default: 'latest',
      },
      {
        displayName: 'Reward Percentiles (JSON array)',
        name: 'rewardPercentiles',
        type: 'json',
        default: [25, 50, 75],
      },
    ],
    ...baseNodeConfig,
  };

  async buildParams(this: IExecuteFunctions, itemIndex: number) {
    const blockCount = this.getNodeParameter('blockCount', itemIndex) as number;
    const newestBlock = this.getNodeParameter('newestBlock', itemIndex, 'latest') as string;
    const rewardPercentiles = this.getNodeParameter('rewardPercentiles', itemIndex) as number[];
    return [blockCount, normalizeBlockTag(newestBlock), rewardPercentiles];
  }

  mapResponse(data: any) {
    return {
      ...data,
      oldestBlockDecimal: asNumber(data?.oldestBlock ?? null),
      baseFeePerGasDecimal: Array.isArray(data?.baseFeePerGas)
        ? data.baseFeePerGas.map((fee: any) => asBigIntString(fee))
        : undefined,
      rewardDecimal:
        Array.isArray(data?.reward) && data.reward.length > 0
          ? data.reward.map((bucket: any[]) => bucket.map((fee) => asBigIntString(fee)))
          : undefined,
    };
  }
}
