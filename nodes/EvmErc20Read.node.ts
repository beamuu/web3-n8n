import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPublicClient, http } from 'viem';
import { ERC20_ABI } from '../utils/erc20';
import { getCallableFunctions } from '../utils/abi';
import { serializeForN8n } from '../utils/serialization';

const ERC20_OPTIONS = getCallableFunctions(ERC20_ABI as any).map((fn: any) => ({
  name: fn.name,
  value: fn.name,
  description: `${fn.name}(${(fn.inputs || []).map((i: any) => i.type).join(', ')})`,
}));

export class EvmErc20Read implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EVM ERC20 Read',
    name: 'evmErc20Read',
    group: ['input'],
    version: 1,
    description: 'Read data from an ERC20 token contract',
    defaults: {
      name: 'EVM ERC20 Read',
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
        displayName: 'Token Address',
        name: 'contractAddress',
        type: 'string',
        default: '',
        required: true,
        description: 'Address of the ERC20 token contract',
      },
      {
        displayName: 'Function',
        name: 'functionName',
        type: 'options',
        default: 'name',
        options: ERC20_OPTIONS,
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



  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const results = [] as Array<{ success: boolean; data: any; error: string | null }>;

    for (let i = 0; i < items.length; i++) {
      const rpcUrl = this.getNodeParameter('rpcUrl', i) as string;
      const contractAddress = this.getNodeParameter('contractAddress', i) as string;
      const functionName = this.getNodeParameter('functionName', i) as string;
      const functionArgsRaw = this.getNodeParameter('functionArgs', i, '') as string;

      const callable = ERC20_ABI.find(
        (entry: any) => entry.name === functionName && entry.type === 'function'
      );

      if (!callable) {
        throw new NodeOperationError(this.getNode(), 'Selected function not found in ERC20 ABI', { itemIndex: i });
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

        const rawData = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: functionName as any,
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
