
## Stellar: Sign transaction
Asks device to sign given transaction. User is asked to confirm all transaction
details on Trezor.

ES6
```javascript
const result = await OneKeyConnect.stellarSignTransaction(params);
```

CommonJS
```javascript
OneKeyConnect.stellarSignTransaction(params).then(function(result) {

});
```

### Params
[****Optional common params****](commonParams.md)
###### [flowtype](../../src/js/types/params.js#L149-L154)
* `path` — *obligatory* `string | Array<number>` minimum length is `3`. [read more](path.md)
* `networkPassphrase` - *obligatory* `string` network passphrase
* `transaction` - *obligatory* `Object` type of [StellarTransaction](../../src/js/types/stellar.js#L129)

### Stellar SDK compatibility
`stellar-sdk` is not a part of `@onekeyhq/connect` repository.
To transform `StellarSDK.Transaction` object into `OneKeyConnect.StellarTransaction` object copy [this plugin](../../src/js/plugins/stellar/plugin.js) into your project.
```javascript
import StellarSDK from 'stellar-sdk';
import transformTrezorTransaction from '<path-to-plugin>/index.js';

const tx = new StellarSdk.TransactionBuilder(...);
...
tx.build();

const params = transformTrezorTransaction(tx);
const result = OneKeyConnect.stellarSignTransaction(params);

if (result.success) {
    tx.addSignature('account-public-key', result.payload.signature);
}
```

### Example
```javascript
OneKeyConnect.stellarSignTransaction(
    path: "m/44'/148'/0'",
    networkPassphrase: "Test SDF Network ; September 2015",
    transaction: {
        source: "GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV",
        fee: 100,
        sequence: 4294967296,
        memo: {
            type: 0,
        },
        operations: [
            {
                type: "payment",
                source: "GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV",
                destination: "GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV",
                amount: "10000"
            }
        ]
    }
});
```

### Result
###### [flowtype](../../src/js/types/response.js#L129-L132)
```javascript
{
    success: true,
    payload: {
        publicKey: string,
        signature: string,
    }
}
```
Error
```javascript
{
    success: false,
    payload: {
        error: string // error message
    }
}
```
