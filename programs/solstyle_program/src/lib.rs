use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::state::Creator;
use anchor_lang::solana_program::{program::invoke_signed, sysvar::rent::Rent};


declare_id!("8ZRrkfYETaq36m1rcrnMgjEUZobzXBkpMyiTbvkCP5QG"); // Replace with your final Program ID after deploy

#[program]
pub mod solstyle_program {
    use super::*;

    pub fn create_drop(
        ctx: Context<CreateDrop>,
        price: u64,
        commission_bps: u16,
        metadata_uri: String,
    ) -> Result<()> {
        let drop = &mut ctx.accounts.drop;

        require!(commission_bps <= 10000, ErrorCode::InvalidCommissionBps);

        drop.seller = ctx.accounts.seller.key();
        drop.price = price;
        drop.commission_bps = commission_bps;
        drop.metadata_uri = metadata_uri;

        Ok(())
    }
    
    
    pub fn buy_drop(
        ctx: Context<BuyDrop>,
        amount_lamports: u64, 
    ) -> Result<()> {
        let drop = &ctx.accounts.drop;
        let commission_bps = drop.commission_bps;

        
        require_eq!(amount_lamports, drop.price, ErrorCode::IncorrectPaymentAmount);

        let commission_lamports = (amount_lamports * commission_bps as u64) / 10000;
        let seller_lamports = amount_lamports.checked_sub(commission_lamports).unwrap();

        
        // 1. Transfer SOL to the Seller
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_lamports,
        )?;

        // 2. Transfer SOL to the Commission Address
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.commission_recipient.to_account_info(),
                },
            ),
            commission_lamports,
        )?;

        
        // FIX: Get the bump seed from the context.bumps map (required when PDA is AccountInfo)
        let bump_seed = *ctx.bumps.get("pda_authority").unwrap();
        let signer_seeds: &[&[u8]; 2] = &[
            b"authority",
            &[bump_seed], 
        ];
        let signer_seeds_slice: &[&[&u8]] = &[&signer_seeds];


        // 3. Action: Mint the 1 token NFT to the Buyer's Token Account
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.pda_authority.to_account_info(), // Signed by PDA
                },
                signer_seeds_slice,
            ),
            1, // Mint exactly 1 token (NFT supply)
        )?;

        
        // 4. Action: Create the Metaplex Metadata Account
        let creators = vec![
            Creator {
                address: ctx.accounts.pda_authority.key(),
                verified: true,
                share: 100, // PDA owns 100% of the primary share
            },
        ];

        // CPI Call to Metaplex
        let instruction = mpl_token_metadata::instruction::create_metadata_accounts_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.metadata_account.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.pda_authority.key(), // Mint authority
            ctx.accounts.buyer.key(),         // Payer
            ctx.accounts.pda_authority.key(), // Update authority
            String::from("SolStyle Fit"),     // NFT Name
            String::from("SOLSTYL"),          // NFT Symbol
            drop.metadata_uri.clone(),        // Metadata URI (from the Drop account)
            Some(creators),
            0,
            true, // Is mutable
            false, // Uses standard token
            None,
            None,
            None,
        );

        // Invoke the Metaplex instruction with the PDA signature
        invoke_signed(
            &instruction,
            &[
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.pda_authority.to_account_info(),
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
            signer_seeds_slice, // Use the corrected signer seeds
        )?;


        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateDrop<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Drop::INIT_SPACE
    )]
    pub drop: Account<'info, Drop>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts, Bumps)] 
pub struct BuyDrop<'info>{
    // Existing Accounts
    #[account(
        has_one = seller,
        mut
    )]
    pub drop: Account<'info, Drop>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    /// CHECK: The seller key is verified via the drop.has_one check above.
    pub seller: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: This is a fixed, known platform wallet for receiving commissions.
    pub commission_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

    
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,             // NFTs must have 0 decimals
        mint::authority = pda_authority // Minting authority is set to the Program PDA
    )]
    pub mint: Account<'info, Mint>,

    
    #[account(
        init_if_needed, // Requires feature 'init-if-needed'
        payer = buyer,
        token::mint = mint,
        token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    
    /// CHECK: This PDA is used as the minting authority, validated by Anchor.
    #[account(seeds = [b"authority"], bump)]
    pub pda_authority: AccountInfo<'info>,
    
    /// CHECK: Handled by Metaplex CPI
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub metadata_account: AccountInfo<'info>,

    
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    /// CHECK: We are only using this account to reference the Metadata Program ID.
    pub token_metadata_program: AccountInfo<'info>,
}

#[account]
pub struct Drop {
    pub seller: Pubkey,
    pub price: u64,
    pub commission_bps: u16,
    pub metadata_uri: String,
}

impl Drop {
    pub const INIT_SPACE: usize =
        32 + // seller pubkey
        8 +  // price
        2 +  // commission_bps
        4 + 200; // metadata uri (max 200 chars)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Commission basis points must be <= 10000")]
    InvalidCommissionBps,
    #[msg("The amount of SOL sent does not match the required drop price.")]
    IncorrectPaymentAmount,
}