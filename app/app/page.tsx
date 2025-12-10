"use client";

import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN, web3 } from "@project-serum/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "@/utils/idl.json";

// --- CONFIGURATION ---
const PROGRAM_ID = new PublicKey("3PAQx8QnCzQxywuN2WwSyc8G7UNH95zqb1ZdsFm5fZC6");

// --- INFLUENCER DATA ---
const INFLUENCERS = [
  {
    id: "kylie",
    name: "Kylie Jenner",
    description: "Prominent American media personality and businesswoman",
    avatar: "https://gateway.pinata.cloud/ipfs/bafybeieyssevqd76uyeto3iyb4mypqamvkjazq2r4luqw4c4geffc2d3bm",
    outfits: [
      "https://gateway.pinata.cloud/ipfs/bafybeiaxa75frhtavwvbg2suakgfbdbkd5gy6a3hkcqpbkcp4wdtwg5zoa",
      "https://gateway.pinata.cloud/ipfs/bafybeihypze6geh7gp7zkqf6qhcchvd6e3rvkztqzc6jehct7n4fa32xji"
    ]
  },
  {
    id: "kartik",
    name: "Kartik",
    description: "AI Fashion Influencer",
    avatar: "https://gateway.pinata.cloud/ipfs/bafybeidsb6z7qlkruvbizva7y3tuav2kb3wam5iljm5xv75nqopitetwfe",
    outfits: [
      "https://gateway.pinata.cloud/ipfs/bafybeib7apvwnakha5wis6yqh6o4uim2xbp6fwqszseqagyrtetslppeoy",
      "https://gateway.pinata.cloud/ipfs/bafybeih54oijwpop5mcu2skwonv2eq45qzgfrjfjqvkv3bit3lclr52liu"
    ]
  },
  {
    id: "zaara",
    name: "Zaara",
    description: "AI streetwear fashion influencer",
    avatar: "https://gateway.pinata.cloud/ipfs/bafybeifyhzodq2uw3wktuhzncpjwpqtvgbnf73nxoyzvhmomtq6elp5vxe",
    outfits: [
      "https://gateway.pinata.cloud/ipfs/bafybeiaovpznfolrtyltyg4k5xnceuqpu5rikijn7wo26opzdq26lxu2dq",
      "https://gateway.pinata.cloud/ipfs/bafybeia5jga4u2dfe5fcplshpzrlwcaqnmbbc76ec2bvfbbssytcadp75y"
    ]
  },
  {
    id: "trump",
    name: "Donald Trump",
    description: "American Politician",
    avatar: "https://gateway.pinata.cloud/ipfs/bafybeigpjvycjpsxw7ki2olithmmm3iiqyfqucj4rtox6lsfzfzkmw2rhm",
    outfits: [
      "https://gateway.pinata.cloud/ipfs/bafkreidujfu5ugwhnoia64ebdpnkmj2whzho6faz4jl2toqhw57trcguoa",
      "https://gateway.pinata.cloud/ipfs/bafybeibjfaksoz5zoivcbrbvhrgstp5fixbuhlxqycmwln6y3lpqcw5lym"
    ]
  },
  {
    id: "david",
    name: "David",
    description: "AI Traveller",
    avatar: "https://gateway.pinata.cloud/ipfs/bafybeibvxwnzeujx5tbzwyhmpg2zplyvglmxjodkoclyepszbj4r2a4rau",
    outfits: [
      "https://gateway.pinata.cloud/ipfs/bafybeiby2wbjmrivlzff4c3o43bb6sqiujlykhru5trcdppspsdjy25otm",
      "https://gateway.pinata.cloud/ipfs/bafybeigryfxotup2gdyy452ejpwlhulqxa5v3idti6rxrv2txsduw5wmue"
    ]
  }
];

export default function Home() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  
  // State for Navigation & Logic
  const [selectedInfluencer, setSelectedInfluencer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dropAddress, setDropAddress] = useState<string>("");
  const [currentImage, setCurrentImage] = useState<string>(""); 

  const getProgram = () => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
    // @ts-ignore
    return new Program(idl, PROGRAM_ID, provider);
  };

  const filteredInfluencers = INFLUENCERS.filter(inf => 
    inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inf.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createDrop = async () => {
    if (!wallet) return alert("Connect wallet to proceed");
    const program = getProgram();
    if (!program) return;

    try {
      setLoading(true);
      setStatus("Curating Style...");
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Pick a random outfit specifically from the SELECTED influencer
      const outfits = selectedInfluencer.outfits;
      const randomImage = outfits[Math.floor(Math.random() * outfits.length)];
      setCurrentImage(randomImage);
      
      setStatus("Minting Drop on Solana...");

      const dropAccount = web3.Keypair.generate();
      const price = new BN(100000000); 
      const commission = 500; 
      
      await program.methods
        .createDrop(price, commission, randomImage) 
        .accounts({
          drop: dropAccount.publicKey,
          seller: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([dropAccount])
        .rpc();

      setStatus(`Drop Live. Address: ${dropAccount.publicKey.toString().slice(0, 8)}...`);
      setDropAddress(dropAccount.publicKey.toString()); 

    } catch (err: any) {
      console.error(err);
      setStatus("Failed: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const buyDrop = async () => {
    if (!wallet || !dropAddress) return alert("Generate a drop first");
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
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
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

      setStatus("Purchase Successful. NFT added to wallet.");
    } catch (err: any) {
      console.error(err);
      setStatus("Transaction Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-[#0a0a0a] text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* NAVBAR */}
      <div className="z-10 w-full max-w-6xl items-center justify-between flex mb-12 border-b border-gray-800 pb-6">
        <h1 
          onClick={() => { setSelectedInfluencer(null); setDropAddress(""); setCurrentImage(""); }}
          className="text-3xl font-extrabold tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
        >
          SolStyle
        </h1>
        <WalletMultiButton style={{ backgroundColor: '#262626', height: '40px', fontSize: '14px', borderRadius: '8px' }} />
      </div>

      {!selectedInfluencer ? (
        // --- VIEW 1: INFLUENCER SELECTION ---
        <div className="w-full max-w-6xl flex flex-col gap-10 animate-fade-in">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">Select Influencer</h2>
            <p className="text-gray-400 text-lg">Choose a personality to generate your next exclusive drop.</p>
            
            {/* SEARCH BAR */}
            <div className="max-w-xl mx-auto relative pt-4">
              <input 
                type="text" 
                placeholder="Search influencers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-gray-800 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
              />
            </div>
          </div>

          {/* INFLUENCER GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInfluencers.map((inf) => (
              <div 
                key={inf.id}
                onClick={() => setSelectedInfluencer(inf)}
                className="bg-[#111] rounded-2xl border border-gray-800 p-6 hover:border-gray-600 hover:bg-[#161616] transition-all cursor-pointer group flex flex-col gap-4"
              >
                {/* Avatar: Aspect Square */}
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-800 relative">
                    <img 
                      src={inf.avatar} 
                      alt={inf.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white">{inf.name}</h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">{inf.description}</p>
                </div>

                <div className="mt-auto pt-4 w-full">
                   <div className="w-full bg-white text-black py-3 rounded-lg text-center text-sm font-bold uppercase tracking-wider group-hover:bg-gray-200 transition-colors">
                     Select
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // --- VIEW 2: GENERATOR UI (9:16 OUTFIT) ---
        <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in-up">
          <button 
            onClick={() => { setSelectedInfluencer(null); setDropAddress(""); setCurrentImage(""); setStatus(""); }}
            className="text-gray-500 hover:text-white flex items-center gap-2 mb-2 text-sm transition-colors"
          >
            ← Back to Influencers
          </button>

          <div className="bg-[#111] p-6 rounded-3xl border border-gray-800 shadow-2xl flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <img src={selectedInfluencer.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-600" />
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedInfluencer.name}</h2>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Generator Active</p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>

            {/* OUTFIT CONTAINER - 9:16 ASPECT RATIO */}
            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border border-gray-800 group flex items-center justify-center">
              {currentImage ? (
                <a href={currentImage} target="_blank" rel="noopener noreferrer" className="w-full h-full block cursor-zoom-in">
                  <img 
                    src={currentImage} 
                    alt="AI Fashion" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                  />
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                  <div className="w-8 h-8 border-2 border-gray-800 border-t-white rounded-full animate-spin"></div>
                  <p className="text-xs font-mono tracking-widest uppercase opacity-60">
                    Awaiting Generation
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end px-1">
               <div>
                 <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total</p>
                 <p className="text-xl font-bold text-white">0.1 SOL</p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-gray-500">Gas ~0.000005 SOL</p>
               </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={createDrop} 
                disabled={loading}
                className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {loading ? "Generating..." : "Generate Outfit"}
              </button>

              <button 
                onClick={buyDrop} 
                disabled={loading || !dropAddress}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 hover:border-gray-500 py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-wide"
              >
                Purchase Drop
              </button>
            </div>

            {status && (
              <div className="mt-1 text-center">
                <p className="text-xs text-gray-400 font-mono">{status}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}