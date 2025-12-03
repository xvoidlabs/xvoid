#!/usr/bin/env node

/**
 * Utility script to generate Solana wallet keypairs
 * Usage: node scripts/generate-wallet.js
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

const keypair = Keypair.generate();

console.log('\n=== Solana Wallet Generated ===\n');
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('\nSecret Key (base58):');
console.log(bs58.encode(keypair.secretKey));
console.log('\nSecret Key (JSON array):');
console.log(JSON.stringify(Array.from(keypair.secretKey)));
console.log('\n=== Use this in your .env file ===\n');
console.log('For base58 format:');
console.log(`XVOID_ENTRY_WALLET_SECRET_KEY=${bs58.encode(keypair.secretKey)}`);
console.log('\nFor JSON array format:');
console.log(`XVOID_ENTRY_WALLET_SECRET_KEY=${JSON.stringify(Array.from(keypair.secretKey))}`);
console.log('\n');

