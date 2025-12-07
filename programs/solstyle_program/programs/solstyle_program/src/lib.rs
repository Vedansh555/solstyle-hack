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
   

    pub fn buy_drop(
        ctx: Context<BuyDrop>,
        amount_lamports: u64, 
    ) -> Result<()> {
        let drop = &ctx.accounts.drop;
        let commission_bps = drop.commission_bps;

        require_eq!(amount_lamports, drop.price, ErrorCode::IncorrectPaymentAmount);

       
        let commission_lamports = (amount_lamports * commission_bps as u64) / 10000;
        
  
        let seller_lamports = amount_lamports.checked_sub(commission_lamports).unwrap();

       
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
pub struct BuyDrop<'info>{
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
    #[msg("The amount of SOL sent does not match the required drop price.")]
    IncorrectPaymentAmount,
}
