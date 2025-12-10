"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "@/utils/idl.json";

// REPLACE THIS WITH YOUR PROGRAM ID
const PROGRAM_ID = new PublicKey("3PAQx8QnCzQxywuN2WwSyc8G7UNH95zqb1ZdsFm5fZC6");

export default function Home() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dropAddress, setDropAddress] = useState<string>("");

  const getProgram = () => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
    // @ts-ignore
    return new Program(idl, PROGRAM_ID, provider);
  };

  const createDrop = async () => {
    if (!wallet) return alert("Connect wallet!");
    const program = getProgram();
    if (!program) return;

    try {
      setLoading(true);
      setStatus("Creating Drop...");
      const dropAccount = web3.Keypair.generate();
      const price = new BN(100000000); // 0.1 SOL
      const commission = 500; // 5%
      const uri = "https://ipfs.io/ipfs/QmExample"; 

      await program.methods
        .createDrop(price, commission, uri)
        .accounts({
          drop: dropAccount.publicKey,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dropAccount])
        .rpc();

      setStatus(`Drop Created! Address: ${dropAccount.publicKey.toString()}`);
      setDropAddress(dropAccount.publicKey.toString()); 
    } catch (err: any) {
      console.error(err);
      setStatus("Failed: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const buyDrop = async () => {
    if (!wallet || !dropAddress) return alert("Create a drop first!");
    const program = getProgram();
    if (!program) return;

    try {
      setLoading(true);
      setStatus("Buying...");
      const dropPubkey = new PublicKey(dropAddress);
      // Fetch Drop Data
      // @ts-ignore
      const dropAccountData = await program.account.drop.fetch(dropPubkey);
      const sellerPubkey = dropAccountData.seller;
      
      const mintKeypair = web3.Keypair.generate();

      const [pdaAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority")],
        PROGRAM_ID
      );

      const buyerTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey
      );

      const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
      const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const price = new BN(100000000); 

      await program.methods
        .buyDrop(price)
        .accounts({
          drop: dropPubkey,
          buyer: wallet.publicKey,
          seller: sellerPubkey,
          commissionRecipient: wallet.publicKey, 
          mint: mintKeypair.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          pdaAuthority: pdaAuthority,
          metadataAccount: metadataAddress,
          rent: web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([mintKeypair]) 
        .rpc();

      setStatus("SUCCESS! NFT Minted.");
    } catch (err: any) {
      console.error(err);
      setStatus("Failed: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex mb-10">
        <h1 className="text-4xl font-bold text-purple-500">SolStyle</h1>
        <WalletMultiButton />
      </div>

      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-[400px] flex flex-col gap-4">
        <h2 className="text-xl font-bold">👟 AI Fashion Drop</h2>
        <div className="h-40 bg-gray-700 rounded flex items-center justify-center text-gray-500">
          [Image Placeholder]
        </div>
        <p className="text-purple-400 font-bold">Price: 0.1 SOL</p>

        <button 
          onClick={createDrop} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold"
        >
          1. Create Drop
        </button>

        <button 
          onClick={buyDrop} 
          disabled={loading || !dropAddress}
          className="bg-pink-600 hover:bg-pink-700 p-3 rounded font-bold disabled:opacity-50"
        >
          2. Buy Drop
        </button>

        {status && <div className="bg-black p-2 rounded text-xs text-yellow-300 break-all">{status}</div>}
      </div>
    </main>
  );
}