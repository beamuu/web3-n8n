import { EvmReadContract } from './nodes/EvmReadContract.node';
import { EvmErc20Read } from './nodes/EvmErc20Read.node';
import {
  EthBlockNumber,
  EthCall,
  EthChainId,
  EthCreateAccessList,
  EthEstimateGas,
  EthFeeHistory,
  EthGasPrice,
  EthGetBalance,
  EthGetBlockByHash,
  EthGetBlockByNumber,
  EthGetBlockTransactionCountByHash,
  EthGetBlockTransactionCountByNumber,
  EthGetCode,
  EthGetLogs,
  EthGetStorageAt,
  EthGetTransactionByHash,
  EthGetTransactionCount,
  EthGetTransactionReceipt,
  EthGetUncleCountByBlockHash,
  EthGetUncleCountByBlockNumber,
  EthSyncing,
} from './nodes/EthereumRpc.node';
import { EthereumRpcApi } from './credentials/EthereumRpcApi.credentials';

export const nodes = [
  EvmReadContract,
  EvmErc20Read,
  EthChainId,
  EthBlockNumber,
  EthSyncing,
  EthGetBlockByNumber,
  EthGetBlockByHash,
  EthGetBlockTransactionCountByNumber,
  EthGetBlockTransactionCountByHash,
  EthGetUncleCountByBlockNumber,
  EthGetUncleCountByBlockHash,
  EthGetBalance,
  EthGetTransactionCount,
  EthGetCode,
  EthGetStorageAt,
  EthGetTransactionByHash,
  EthGetTransactionReceipt,
  EthCall,
  EthEstimateGas,
  EthCreateAccessList,
  EthGetLogs,
  EthGasPrice,
  EthFeeHistory,
];

export const credentials = [EthereumRpcApi];
