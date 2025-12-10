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

// Your AI Fashion Images (IPFS CIDs)
const AI_IMAGES = [
  "https://gateway.pinata.cloud/ipfs/bafybeib7apvwnakha5wis6yqh6o4uim2xbp6fwqszseqagyrtetslppeoy",
  "https://gateway.pinata.cloud/ipfs/bafybeic5izleelncfnz76wcqcuc7tyuv4mdduspcxzfucms4hnurcguafu",
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
      setStatus("AI Influencer Dropping...");
      
      // 1. Simulate AI Generation Delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Randomly select one of your images
      const randomImage = AI_IMAGES[Math.floor(Math.random() * AI_IMAGES.length)];
      setCurrentImage(randomImage);
      
      setStatus("Minting Drop on Solana...");

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

      setStatus(`Drop Live! Address: ${dropAccount.publicKey.toString().slice(0, 6)}...`);
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
      setStatus("Processing Micro-payment...");

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

      setStatus("SUCCESS! You own this AI Fashion NFT.");
    } catch (err: any) {
      console.error(err);
      setStatus("Failed: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-950 text-white font-sans">
      <div className="z-10 w-full max-w-md items-center justify-between flex mb-6">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tighter">
          SolStyle
        </h1>
        <WalletMultiButton style={{ backgroundColor: '#9333ea', height: '40px', fontSize: '14px' }} />
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 w-full max-w-sm shadow-2xl flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white tracking-wide">ZAARA'S DROP</h2>
          <span className="bg-purple-900/50 text-purple-200 text-[10px] px-3 py-1 rounded-full font-bold tracking-wider border border-purple-800">LIVE</span>
        </div>

        {/* IMAGE CONTAINER - 9:16 RATIO (Story Format) */}
        <div className="aspect-[9/16] bg-gray-950 rounded-2xl overflow-hidden relative border border-gray-800 group flex items-center justify-center shadow-inner">
          {currentImage ? (
            <a 
              href={currentImage} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full h-full block cursor-zoom-in"
            >
              <img 
                src={currentImage} 
                alt="AI Fashion" 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-white font-medium text-xs bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                  View Full Resolution
                </span>
              </div>
            </a>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 flex-col gap-3">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div>
              <p className="text-xs font-medium tracking-widest uppercase opacity-60">Awaiting Drop</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-end border-b border-gray-800 pb-4">
          <div className="flex flex-col">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Current Price</span>
            <span className="text-2xl font-bold text-white">0.1 SOL</span>
          </div>
          <span className="text-gray-600 text-xs mb-1">Limited Edition</span>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={createDrop} 
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-bold text-sm transition-all border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {loading ? "Processing..." : "1. Generate & Drop (Admin)"}
          </button>

          <button 
            onClick={buyDrop} 
            disabled={loading || !dropAddress}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide disabled:shadow-none"
          >
            2. Buy Now
          </button>
        </div>

        {status && (
          <div className="mt-1 p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-center text-gray-400 font-mono">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}