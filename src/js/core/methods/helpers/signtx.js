/* @flow */
import { ERRORS } from '../../../constants';
import type { BitcoinNetworkInfo } from '../../../types';
import type { RefTransaction, TransactionOptions, SignedTransaction } from '../../../types/networks/bitcoin';

import type {
    TypedCall,
    TxRequest,
    TxInputType,
    TxOutputType,
    TxRequestSerializedType,
} from '../../../types/trezor/protobuf';

type RefTxs = { [hash: string]: RefTransaction };
type Props = {
    typedCall: TypedCall;
    txRequest: TxRequest;
    refTxs: RefTxs;
    inputs: TxInputType[];
    outputs: TxOutputType[];
    serializedTx: string[];
    signatures: string[];
};

const requestPrevTxInfo = ({
    typedCall,
    txRequest: { request_type, details },
    refTxs,
}: Props) => {
    const { tx_hash } = details;
    if (!tx_hash) {
        throw ERRORS.TypedError('Runtime', 'requestPrevTxInfo: unknown details.tx_hash');
    }
    const tx = refTxs[tx_hash.toLowerCase()];
    if (!tx) {
        throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Requested unknown tx: ${tx_hash}`);
    }
    if (request_type === 'TXINPUT') {
        // bin_outputs not present in tx = invalid RefTransaction object
        if (!tx.bin_outputs) throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Requested unknown TXINPUT: ${tx_hash}`);
        return typedCall('TxAckPrevInput', 'TxRequest', { tx: { input: tx.inputs[details.request_index] } });
    }
    if (request_type === 'TXOUTPUT') {
        // bin_outputs not present in tx = invalid RefTransaction object
        if (!tx.bin_outputs) throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Requested unknown TXOUTPUT: ${tx_hash}`);
        return typedCall('TxAckPrevOutput', 'TxRequest', { tx: { output: tx.bin_outputs[details.request_index] } });
    }
    if (request_type === 'TXORIGINPUT') {
        // outputs not present in tx = invalid RefTransaction object
        if (!tx.outputs) throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Requested unknown TXORIGINPUT: ${tx_hash}`);
        return typedCall('TxAckInput', 'TxRequest', { tx: { input: tx.inputs[details.request_index] } });
    }
    if (request_type === 'TXORIGOUTPUT') {
        // outputs not present in tx = invalid RefTransaction object
        if (!tx.outputs) throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Requested unknown TXORIGOUTPUT: ${tx_hash}`);
        return typedCall('TxAckOutput', 'TxRequest', { tx: { output: tx.outputs[details.request_index] } });
    }
    if (request_type === 'TXEXTRADATA') {
        if (typeof details.extra_data_len !== 'number') {
            throw ERRORS.TypedError('Runtime', 'requestPrevTxInfo: Missing extra_data_len');
        }
        if (typeof details.extra_data_offset !== 'number') {
            throw ERRORS.TypedError('Runtime', 'requestPrevTxInfo: Missing extra_data_offset');
        }
        if (typeof tx.extra_data !== 'string') {
            throw ERRORS.TypedError('Runtime', 'requestPrevTxInfo: No extra data for transaction ' + tx.hash);
        }
        const data = tx.extra_data;
        const dataLen = details.extra_data_len;
        const dataOffset = details.extra_data_offset;
        const extra_data_chunk = data.substring(dataOffset * 2, (dataOffset + dataLen) * 2);
        return typedCall('TxAckPrevExtraData', 'TxRequest', { tx: { extra_data_chunk } });
    }
    if (request_type === 'TXMETA') {
        const data = tx.extra_data;
        const meta = {
            version: tx.version,
            lock_time: tx.lock_time,
            inputs_count: tx.inputs.length,
            outputs_count: tx.outputs ? tx.outputs.length : tx.bin_outputs.length,
            timestamp: tx.timestamp,
            version_group_id: tx.version_group_id,
            expiry: tx.expiry,
            branch_id: tx.branch_id,
            extra_data_len: data ? data.length / 2 : undefined,
        };
        return typedCall('TxAckPrevMeta', 'TxRequest', { tx: meta });
    }
    throw ERRORS.TypedError('Runtime', `requestPrevTxInfo: Unknown request type: ${request_type}`);
};

const requestSignedTxInfo = ({
    typedCall,
    txRequest: { request_type, details },
    inputs,
    outputs,
}: Props) => {
    if (request_type === 'TXINPUT') {
        return typedCall('TxAckInput', 'TxRequest', { tx: { input: inputs[details.request_index] } });
    }
    if (request_type === 'TXOUTPUT') {
        return typedCall('TxAckOutput', 'TxRequest', { tx: { output: outputs[details.request_index] } });
    }
    if (request_type === 'TXMETA') {
        throw ERRORS.TypedError('Runtime', 'requestSignedTxInfo: Cannot read TXMETA from signed transaction');
    }
    if (request_type === 'TXEXTRADATA') {
        throw ERRORS.TypedError('Runtime', 'requestSignedTxInfo: Cannot read TXEXTRADATA from signed transaction');
    }
    throw ERRORS.TypedError('Runtime', `requestSignedTxInfo: Unknown request type: ${request_type}`);
};

// requests information about a transaction
// can be either signed transaction itself of prev transaction
const requestTxAck = (props: Props) => {
    const { tx_hash } = props.txRequest.details;
    if (tx_hash) {
        return requestPrevTxInfo(props);
    } else {
        return requestSignedTxInfo(props);
    }
};

const saveTxSignatures = (
    txRequest?: TxRequestSerializedType,
    serializedTx: string[],
    signatures: string[],
) => {
    if (!txRequest) return;
    const { signature_index, signature, serialized_tx } = txRequest;
    if (serialized_tx) {
        serializedTx.push(serialized_tx);
    }
    if (typeof signature_index === 'number') {
        if (!signature) {
            throw ERRORS.TypedError('Runtime', 'saveTxSignatures: Unexpected null in trezor:TxRequestSerialized signature.');
        }
        signatures[signature_index] = signature;
    }
};

const processTxRequest = async (props: Props) => {
    const {
        typedCall,
        txRequest,
        refTxs,
        inputs,
        outputs,
        serializedTx,
        signatures,
    } = props;
    saveTxSignatures(txRequest.serialized, serializedTx, signatures);
    if (txRequest.request_type === 'TXFINISHED') {
        return Promise.resolve({
            signatures: signatures,
            serializedTx: serializedTx.join(''),
        });
    }

    const { message } = await requestTxAck(props);
    return processTxRequest({
        typedCall,
        txRequest: message,
        refTxs,
        inputs,
        outputs,
        serializedTx,
        signatures,
    });
};

export default async (
    typedCall: TypedCall,
    inputs: TxInputType[],
    outputs: TxOutputType[],
    refTxsArray: RefTransaction[],
    options: TransactionOptions,
    coinInfo: BitcoinNetworkInfo,
): Promise<SignedTransaction> => {
    const refTxs: RefTxs = {};
    refTxsArray.forEach(tx => {
        refTxs[tx.hash.toLowerCase()] = tx;
    });

    const { message } = await typedCall('SignTx', 'TxRequest', {
        ...options,
        inputs_count: inputs.length,
        outputs_count: outputs.length,
        coin_name: coinInfo.name,
    });

    return processTxRequest({
        typedCall,
        txRequest: message,
        refTxs,
        inputs,
        outputs,
        serializedTx: [],
        signatures: [],
    });
};
