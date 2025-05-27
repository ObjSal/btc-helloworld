// A javascript Bitcoin library for node.js and browsers.
const bitcoin = require('bitcoinjs-lib');
// JavaScript implementation of Bitcoin BIP39: Mnemonic code for generating deterministic keys
const bip39 = require('bip39');
// Secp256k1 is the name of the elliptic curve used by Bitcoin to implement its public key cryptography
const ecc = require('tiny-secp256k1');
// Hierarchical Deterministic Wallets (Bip32) Implementation in JavaScript
const { BIP32Factory } = require('bip32');
// A library for managing SECP256k1 keypairs
const { ECPairFactory } = require('ecpair');

// Initialize libraries
bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// Define testnet network (applicable to testnet4)
const network = bitcoin.networks.testnet;
let path = '';
let path_change = '';

// m / purpose' / coin_type' / account' / change / address_index
if (network == bitcoin.networks.testnet) {
    // test net
    path = "m/86'/1'/0'/0/0";
    path_change = "m/86'/1'/0'/1/0";
} else {
    // main net
    path = "m/86'/0'/0'/0/0";
    path_change = "m/86'/0'/0'/1/0";
}

// Wallet Mnemonic
const mnemonic = 'diagram average divide urban office bench ready dirt popular point robust lawn';

//  Funding Transaction Details
const fundingTxId = '1862e5293c83e138a5768de66a4dc1dc529cbd8189236a88f2923b1249b63601';
const fundingIndex = 1;
const fundingAmount = BigInt(5000);

// New Transaction Output Details
const message = 'Hello World';
const fee = 150n;

// Generate seed from mnemonic
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = bip32.fromSeed(seed, network);
const taprootChild = root.derivePath(path);
// Generate the key pair to verify and sign the input we're going to spend from the transaction
const taprootKeyPair = ECPair.fromPrivateKey(taprootChild.privateKey, { network: network });
// Internal public key (x-only, 32 bytes)
const internalPubkey = taprootKeyPair.publicKey.slice(1, 33);
// Generate the p2tr to get the output for the spending input
const p2tr = bitcoin.payments.p2tr({ internalPubkey: internalPubkey, network });
  
// Create the change p2tr to get the address where we're going to receive the change
const changeChild = root.derivePath(path_change);
const changeInternalPubkey = changeChild.publicKey.slice(1, 33);
const changep2tr = bitcoin.payments.p2tr({ internalPubkey: changeInternalPubkey, network });

// Create PSBT
const psbt = new bitcoin.Psbt({ network });

// Add Taproot input
psbt.addInput({
    hash: fundingTxId,
    index: fundingIndex,
    witnessUtxo: {
        script: Uint8Array.from(p2tr.output),
        value: fundingAmount,
    },
    tapInternalKey: internalPubkey,
    sequence: 0xfffffffd // Enable RBF by setting sequence < 0xffffffff
});
  
// Add OP_RETURN output
const data = Buffer.from(message, 'utf8');
const opReturnScript = bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, data]);
psbt.addOutput({
    script: Uint8Array.from(opReturnScript), // Convert Buffer to Uint8Array
    value: 0n, // OP_RETURN outputs should have a value of 0
});
  
// Add change output
const changeAmount = fundingAmount - fee;
if (changeAmount < 0n) {
    throw new Error("Input amount is less than the fee");
}

psbt.addOutput({
    address: changep2tr.address,
    value: changeAmount,
});
  
// Used for signing, since the output and address are using a tweaked key
// We must tweak the signer in the same way.
const tweakedChildNode = taprootKeyPair.tweak(
    Buffer.from(bitcoin.crypto.taggedHash('TapTweak', internalPubkey))
);

psbt.signInput(0, tweakedChildNode, [bitcoin.Transaction.SIGHASH_DEFAULT]);
psbt.finalizeAllInputs();
  
const tx = psbt.extractTransaction();
console.log('Transaction:', tx.toHex());

    // const vsize = tx.virtualSize();
    // console.log('Virtual Size:', vsize, 'virtual bytes');
    // console.log('Transaction:', tx.toHex());
    // console.log('Transaction ID:', tx.getId());
    // const reversedHash = Buffer.from(tx.ins[0].hash).reverse().toString('hex');
    // console.log('Funding TxID (little-endian):', fundingTxId);
    // console.log('Transaction Ins[0].hash (big-endian):', tx.ins[0].hash.toString('hex'));
    // console.log('Transaction Ins[0].hash reversed (little-endian):', reversedHash);
    // console.log('Transaction Size:', tx.virtualSize(), 'bytes');
    // console.log('Transaction Fee:', fee, 'satoshis');
    // console.log('Change Amount:', changeAmount, 'satoshis');
    // console.log('Change Key Pair Address:', change86p2tr.address);
    // console.log('Change Key Pair Network:', network);