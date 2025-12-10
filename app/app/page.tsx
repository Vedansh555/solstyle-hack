"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "@/utils/idl.json";

// --- CONFIGURATION ---
// Your Deployed Devnet Program ID
const PROGRAM_ID = new PublicKey("3PAQx8QnCzQxywuN2WwSyc8G7UNH95zqb1ZdsFm5fZC6");

// Your AI Fashion Images (OUTFIT 2 REMOVED)
const AI_IMAGES = [
  "https://gateway.pinata.cloud/ipfs/bafybeib7apvwnakha5wis6yqh6o4uim2xbp6fwqszseqagyrtetslppeoy",
  // Outfit 2 removed
  "https://gateway.pinata.cloud/ipfs/bafybeia5jga4u2dfe5fcplshpzrlwcaqnmbbc76ec2bvfbbssytcadp75y",
  "https://gateway.pinata.cloud/ipfs/bafybeih54oijwpop5mcu2skwonv2eq45qzgfrjfjqvkv3bit3lclr52liu",
  "https://gateway.pinata.cloud/ipfs/bafybeie7elxzgccb6nyxbajdemduaqaqpwhjqya45fxqxmp7c5vhzswkry",
  "https://gateway.pinata.cloud/ipfs/bafybeidoe2b3wwnk2geyemexyw2oexsnalq47xbjf5uw6ezfk75mraiilm",
  "https://gateway.pinata.cloud/ipfs/bafybeidlicbhvhzlacvmas5ddsgqyqplhoo6mmooeunafvboamtbs3ggsa",
  "https://gateway.pinata.cloud/ipfs/bafybeiaovpznfolrtyltyg4k5xnceuqpu5rikijn7wo26opzdq26lxu2dq"
];

export default function Home() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dropAddress, setDropAddress] = useState<string>("");
  
  // State to hold the selected image for the current drop
  const [currentImage, setCurrentImage] = useState<string>(""); 

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
      setStatus("🤖 AI Agent Generating Outfit...");
      
      // 1. Simulate AI Generation Delay (2 seconds for effect)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Randomly select one of your images
      const randomImage = AI_IMAGES[Math.floor(Math.random() * AI_IMAGES.length)];
      setCurrentImage(randomImage);
      
      setStatus("✨ Minting Drop on Solana...");

      // 3. Create the Drop on-chain
      const dropAccount = web3.Keypair.generate();
      const price = new BN(100000000); // 0.1 SOL
      const commission = 500; // 5%
      
      await program.methods
        .createDrop(price, commission, randomImage) 
        .accounts({
          drop: dropAccount.publicKey,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dropAccount])
        .rpc();

      setStatus(`✅ Drop Live! Address: ${dropAccount.publicKey.toString().slice(0, 6)}...`);
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
      setStatus("🛍️ Processing Micro-payment...");

      const dropPubkey = new PublicKey(dropAddress);
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

      setStatus("🎉 SUCCESS! You own this AI Fashion NFT.");
    } catch (err: any) {
      console.error(err);
      setStatus("Failed: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950 text-white font-sans">
      <div className="z-10 w-full max-w-5xl items-center justify-between flex mb-12">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tighter">
          SolStyle
        </h1>
        <WalletMultiButton style={{ backgroundColor: '#9333ea' }} />
      </div>

      <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">✨ Zaara's Latest Drop</h2>
          <span className="bg-purple-900 text-purple-200 text-xs px-3 py-1 rounded-full font-medium">LIVE</span>
        </div>

        {/* IMAGE CONTAINER - CHANGED TO 3:4 PORTRAIT RATIO */}
        <div className="aspect-[3/4] bg-gray-950 rounded-2xl overflow-hidden relative border border-gray-700 group flex items-center justify-center">
          {currentImage ? (
            <a 
              href={currentImage} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-center cursor-zoom-in"
            >
              <img 
                src={currentImage} 
                alt="AI Fashion" 
                // object-contain ensures the whole image fits without cropping
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
              />
              {