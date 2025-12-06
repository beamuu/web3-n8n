import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class EthereumRpcApi implements ICredentialType {
  name = 'ethereumRpcApi';
  displayName = 'Ethereum RPC';
  documentationUrl = 'https://ethereum.org/en/developers/docs/apis/json-rpc/';
  properties: INodeProperties[] = [
    {
      displayName: 'RPC URL',
      name: 'rpcUrl',
      type: 'string',
      default: '',
      required: true,
      description: 'HTTPS JSON-RPC endpoint for the Ethereum-compatible network',
    },
  ];
}
