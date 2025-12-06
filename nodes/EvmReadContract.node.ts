import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPublicClient, http, type Abi } from 'viem';

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
    credentials: [],
    properties: [
      {
        displayName: 'RPC URL',
        name: 'rpcUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'HTTPS RPC endpoint of the EVM network',
      },
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
        noDataExpression: true,
        required: true,
        description: 'Select a view/pure function from the provided ABI',
        options: [],
        loadOptionsMethod: 'getFunctions',
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
        const abiParam = this.getNodeParameter('abi', 0) as string;

        let parsedAbi: Abi;
        try {
          parsedAbi = JSON.parse(abiParam) as Abi;
        } catch (error) {
          throw new NodeOperationError(this.getNode(), 'ABI must be valid JSON');
        }

        if (!Array.isArray(parsedAbi)) {
          throw new NodeOperationError(this.getNode(), 'ABI must be an array');
        }

        const functions = parsedAbi.filter(
          (entry: any) =>
            entry?.type === 'function' &&
            (entry.stateMutability === 'view' || entry.stateMutability === 'pure'),
        );

        return functions.map((fn: any) => ({
          name: fn.name,
          value: fn.name,
          description: `${fn.name}(${(fn.inputs || []).map((i: any) => i.type).join(', ')})`,
        }));
      },
    },
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const results = [] as Array<{ success: boolean; data: unknown; error: string | null }>;

    for (let i = 0; i < items.length; i++) {
      const rpcUrl = this.getNodeParameter('rpcUrl', i) as string;
      const contractAddress = this.getNodeParameter('contractAddress', i) as string;
      const abiParam = this.getNodeParameter('abi', i) as string;
      const functionName = this.getNodeParameter('functionName', i) as string;
      const functionArgsRaw = this.getNodeParameter('functionArgs', i, '') as string;

      let parsedAbi: Abi;
      try {
        parsedAbi = JSON.parse(abiParam) as Abi;
      } catch (error) {
        throw new NodeOperationError(this.getNode(), 'ABI must be valid JSON', { itemIndex: i });
      }

      if (!Array.isArray(parsedAbi)) {
        throw new NodeOperationError(this.getNode(), 'ABI must be an array', { itemIndex: i });
      }

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
        const client = createPublicClient({
          transport: http(rpcUrl),
        });

        const data = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: parsedAbi,
          functionName,
          args: args as any,
        });

        results.push({ success: true, data, error: null });
      } catch (error) {
        results.push({
          success: false,
          data: null,
          error: (error as Error).message,
        });
      }
    }

    return this.helpers.returnJsonArray(results);
  }
}
