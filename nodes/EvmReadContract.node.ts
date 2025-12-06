import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeType,
  INodeTypeDescription,
  INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { type Abi } from 'viem';
import { parseAbi, serializeForN8n, getCallableFunctions } from '../utils/evm';
import { createEthereumClient } from '../utils/ethereum-rpc';

export class EvmReadContract implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EVM Read Contract',
    name: 'evmReadContract',
    group: ['input'],
    version: 1,
    description: 'Call a read-only function on an EVM contract',
    defaults: {
      name: 'EVM Read Contract',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'ethereumRpcApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Contract Address',
        name: 'contractAddress',
        type: 'string',
        default: '',
        required: true,
        description: 'Address of the target smart contract',
      },
      {
        displayName: 'Contract ABI (JSON)',
        name: 'abi',
        type: 'string',
        default: '',
        required: true,
        description: 'Full ABI JSON for the contract. Only view/pure functions are allowed.',
        typeOptions: {
          rows: 6,
        },
      },
      {
        displayName: 'Function',
        name: 'functionName',
        type: 'options',
        default: '',
        options: [],
        // @ts-ignore
        loadOptionsMethod: 'getFunctions',
        loadOptionsDependsOn: ['abi'],
      },
      {
        displayName: 'Function Arguments (JSON Array)',
        name: 'functionArgs',
        type: 'string',
        default: '',
        required: false,
        description: 'Optional JSON array of arguments for the function call',
        typeOptions: {
          rows: 3,
        },
      },
    ],
  };

  methods = {
    loadOptions: {
      async getFunctions(this: ILoadOptionsFunctions) {
        try {
          const abiParam = this.getNodeParameter('abi', 0) as string;
          const parsedAbi = parseAbi(abiParam, this.getNode());

          const functions = getCallableFunctions(parsedAbi);
          
          return functions.map((fn: any) => ({
            name: fn.name,
            value: fn.name,
            description: `${fn.name}(${(fn.inputs || []).map((i: any) => i.type).join(', ')})`,
          }));
        } catch (error) {
          console.error(error);
          return [];
        }
      },
    },
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const results = [] as Array<{ success: boolean; data: any; error: string | null }>;

    for (let i = 0; i < items.length; i++) {
      const contractAddress = this.getNodeParameter('contractAddress', i) as string;
      const abiParam = this.getNodeParameter('abi', i) as string;
      const functionName = this.getNodeParameter('functionName', i) as string;
      const functionArgsRaw = this.getNodeParameter('functionArgs', i, '') as string;

      const parsedAbi = parseAbi(abiParam, this.getNode(), i);

      const callable = parsedAbi.find(
        (entry: any) =>
          entry?.type === 'function' &&
          (entry.stateMutability === 'view' || entry.stateMutability === 'pure') &&
          entry.name === functionName,
      );

      if (!callable) {
        throw new NodeOperationError(this.getNode(), 'Selected function not found in ABI', { itemIndex: i });
      }

      let args: unknown[] = [];
      if (functionArgsRaw && functionArgsRaw.trim().length > 0) {
        try {
          const parsedArgs = JSON.parse(functionArgsRaw);
          if (!Array.isArray(parsedArgs)) {
            throw new Error('Function arguments must be provided as a JSON array');
          }
          args = parsedArgs;
        } catch (error) {
          throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
        }
      }

      try {
        const client = await createEthereumClient(this, this.getNode());

        const rawData = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: parsedAbi,
          functionName,
          args: args as any,
        });

        const data = serializeForN8n(rawData);

        results.push({ success: true, data, error: null });
      } catch (error) {
        results.push({
          success: false,
          data: null,
          error: (error as Error).message,
        });
      }
    }

    return [this.helpers.returnJsonArray(results)];
  }
}
