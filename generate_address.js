// A javascript Bitcoin library for node.js and browsers.
const bitcoin = require('bitcoinjs-lib');
// JavaScript implementation of Bitcoin BIP39: Mnemonic code for generating deterministic keys
const bip39 = require('bip39');
// Hierarchical Deterministic Wallets (Bip32) Implementation in JavaScript
const { BIP32Factory } = require('bip32');
// Secp256k1 is the name of the elliptic curve used by Bitcoin to implement its public key cryptography
const ecc = require('tiny-secp256k1');

// Initialize libraries
bitcoin.initEccLib(ecc);
const BIP32 = BIP32Factory(ecc);

const network = bitcoin.networks.testnet;
let path = '';

// m / purpose' / coin_type' / account' / change / address_index
if (network == bitcoin.networks.testnet) {
    // test net
    path = "m/86'/1'/0'/0/0";
} else {
    // main net
    path = "m/86'/0'/0'/0/0";
}

const mnemonic = bip39.generateMnemonic();
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = BIP32.fromSeed(seed, network);
const child = root.derivePath(path);

// Removes the first byte (the 0x02 or 0x03 prefix) from the 33-byte compressed public key
// leaving the 32-byte X-coordinate to construct the Taproot output script (P2TR address).
// Schnorr signatures and Taproot scripts operate on the X-coordinate alone, assuming the Y-coordinate has even parity (a convention that simplifies processing and reduces size).
// By dropping the prefix byte, the public key becomes 32 bytes, which is used as the internal public key for Taproot.
internalPubkey = Buffer.from(child.publicKey.slice(1, 33));

const p2tr = bitcoin.payments.p2tr({
  internalPubkey: internalPubkey,
  network: network
});

console.log('Mnemonic:', mnemonic);
console.log('Taproot Address:', p2tr.address);