use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::metadata::{
    create_metadata_accounts_v3,
    CreateMetadataAccountsV3,
    mpl_token_metadata::types::{Creator, DataV2},
    Metadata,
};

declare_id!("3PAQx8QnCzQxywuN2WwSyc8G7UNH95zqb1ZdsFm5fZC6");

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
        
        require_eq!(amount_lamports, drop.price, ErrorCode::IncorrectPaymentAmount);

        let commission_lamports = (amount_lamports * drop.commission_bps as u64) / 10000;
        let seller_lamports = amount_lamports.checked_sub(commission_lamports).unwrap();

        // 1. Transfer SOL to Seller
        let ix_seller = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.seller.key(),
            seller_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix_seller,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 2. Transfer SOL to Commission
        let ix_comm = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.commission_recipient.to_account_info().key(),
            commission_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix_comm,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.commission_recipient.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 3. Mint NFT
        // FIX: Direct field access is the correct way in Anchor 0.29.0
        let bump = ctx.bumps.pda_authority; 
        let signer_seeds: &[&[u8]] = &[b"authority", &[bump]];
        let signer_seeds_slice: &[&[&[u8]]] = &[signer_seeds];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.pda_authority.to_account_info(),
                },
                signer_seeds_slice,
            ),
            1,
        )?;

        // 4. Create Metadata
        let creators = vec![
            Creator {
                address: ctx.accounts.pda_authority.key(),
                verified: true,
                share: 100,
            },
        ];

        let data_v2 = DataV2 {
            name: String::from("SolStyle Fit"),
            symbol: String::from("SOLSTYL"),
            uri: drop.metadata_uri.clone(),
            seller_fee_basis_points: 0,
            creators: Some(creators),
            collection: None,
            uses: None,
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.pda_authority.to_account_info(),
                payer: ctx.accounts.buyer.to_account_info(),
                update_authority: ctx.accounts.pda_authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds_slice,
        );

        create_metadata_accounts_v3(
            cpi_ctx,
            data_v2,
            true, 
            true, 
            None,
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

#[derive(Accounts)]
pub struct BuyDrop<'info> {
    #[account(has_one = seller, mut)]
    pub drop: Account<'info, Drop>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    /// CHECK: Verified via has_one
    pub seller: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: Known wallet
    pub commission_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = pda_authority
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init, 
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"authority"], bump)]
    /// CHECK: PDA signer
    pub pda_authority: AccountInfo<'info>,

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
    /// CHECK: Metaplex
    pub metadata_account: AccountInfo<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
}

#[account]
pub struct Drop {
    pub seller: Pubkey,
    pub price: u64,
    pub commission_bps: u16,
    pub metadata_uri: String,
}

impl Drop {
    pub const INIT_SPACE: usize = 32 + 8 + 2 + 4 + 200;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Commission basis points must be <= 10000")]
    InvalidCommissionBps,
    #[msg("The amount of SOL sent does not match the required drop price.")]
    IncorrectPaymentAmount,
}