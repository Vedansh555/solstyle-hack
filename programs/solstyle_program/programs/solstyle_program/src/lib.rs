use anchor_lang::prelude::*;

declare_id!("8ZRrkfYETaq36m1rcrnMgjEUZobzXBkpMyiTbvkCP5QG"); // placeholder, replaced after deploy

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

        // Commission max 100% or 10,000 basis points
        require!(commission_bps <= 10000, ErrorCode::InvalidCommissionBps);

        drop.seller = ctx.accounts.seller.key();
        drop.price = price;
        drop.commission_bps = commission_bps;
        drop.metadata_uri = metadata_uri;

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
        8 +  // price
        2 +  // commission_bps
        4 + 200; // metadata uri (max 200 chars)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Commission basis points must be <= 10000")]
    InvalidCommissionBps,
}
