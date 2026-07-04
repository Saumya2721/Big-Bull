import crypto from 'crypto';
import pool from '../config/db.js';
import { fetchLiveQuote } from '../services/yahooService.js';

/**
 * Executes an order ticket and updates the user's cash account ledger
 */
export const executeOrder = async (req, res) => {
  const { tickerSymbol, orderType, action, quantity, price } = req.body;
  const userId = req.user.UserId || req.user.userid;

  if (!tickerSymbol || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Invalid transactional ticket inputs.' });
  }

  let orderPriceNum = parseFloat(price);

  if (orderType === 'MARKET') {
    const quote = await fetchLiveQuote(tickerSymbol);
    if (!quote || !quote.price) {
      return res.status(400).json({ message: 'Live quote unavailable. Cannot execute MARKET order.' });
    }
    orderPriceNum = quote.price;
  } else if (!price || orderPriceNum <= 0) {
    return res.status(400).json({ message: 'Invalid limit price for ticket.' });
  }

  const orderQtyInt = parseInt(quantity);
  const totalCost = orderPriceNum * orderQtyInt;
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Resolve Trading Account and Pre-Trade Risk Check
    const accountRes = await client.query(
      'SELECT TradingAccId, AvlBalance FROM bigbull.TradingAccount WHERE UserId = $1 FOR UPDATE',
      [userId]
    );

    if (accountRes.rows.length === 0) {
      throw new Error('Trading account not found. Please complete your profile onboarding setup first.');
    }

    const tradingAccId = accountRes.rows[0].tradingaccid;
    let currentBalance = parseFloat(accountRes.rows[0].avlbalance);

    if (action === 'BUY') {
      if (currentBalance < totalCost) {
        return res.status(400).json({ 
          message: `Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}` 
        });
      }
      // Lock cash immediately
      await client.query(
        'UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance - $1 WHERE TradingAccId = $2',
        [totalCost, tradingAccId]
      );
    } else if (action === 'SELL') {
      // Check if they own enough shares
      // Calculate from Portfolio Holds (assuming we have it, or we sum trades)
      // Actually, since this is a new matching engine, let's sum from portfolio_holds 
      // OR we can sum from `Orders` history like the original code did. 
      // But wait! Orders history now includes 'Pending' orders. We only own shares that are in `trade` (executions) or `portfolio_holds`.
      // Let's use the `portfolio_holds` table directly, it's safer. Or sum from `trade`.
      // Since the original code summed from `Orders` (before we had matching), we need a better way.
      // Let's query `current_quantity_held` from `portfolio_holds` (which we will update during settlement).
      const holdingsRes = await client.query(
        'SELECT current_quantity_held FROM bigbull.portfolio_holds WHERE demataccid = (SELECT demataccid FROM bigbull.demataccount WHERE userid = $1) AND ticker_symbol = $2',
        [userId, tickerSymbol]
      );
      
      const netSharesOwned = holdingsRes.rows.length > 0 ? parseInt(holdingsRes.rows[0].current_quantity_held) : 0;
      
      // Also account for pending sell orders!
      const pendingSellsRes = await client.query(
        `SELECT COALESCE(SUM(unfilledqty), 0) as pending_sell_qty FROM bigbull.orders 
         WHERE tradingaccid = $1 AND ticker_symbol = $2 AND order_type = 'SELL' AND status IN ('Pending', 'Partial')`,
        [tradingAccId, tickerSymbol]
      );
      const pendingSells = parseInt(pendingSellsRes.rows[0].pending_sell_qty);
      const availableSharesToSell = netSharesOwned - pendingSells;

      if (availableSharesToSell < orderQtyInt) {
        return res.status(400).json({ 
          message: `Order rejected. You only have ${availableSharesToSell} available shares of ${tickerSymbol} to sell.` 
        });
      }
      // Shares are effectively "locked" because the new pending sell order will be inserted and caught by the pendingSells query.
    }

    // 2. Auto-provision the Company and Instrument if they don't exist yet
    const instrumentCheck = await client.query('SELECT companyname FROM bigbull.financial_instruments WHERE ticker_symbol = $1', [tickerSymbol]);
    
    let companyName = tickerSymbol + ' Ltd.';
    let sector = 'General';

    if (instrumentCheck.rows.length === 0) {
      // It's a completely new stock. Fetch real sector & name from Yahoo Finance
      try {
        const YahooFinance = (await import('yahoo-finance2')).default;
        const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
        const summary = await yf.quoteSummary(tickerSymbol, { modules: ['assetProfile', 'price'] });
        
        sector = summary.assetProfile?.sector || 'General';
        companyName = summary.price?.longName || summary.price?.shortName || companyName;
      } catch (err) {
        console.error(`Failed to fetch quoteSummary for ${tickerSymbol}`, err.message);
      }

      await client.query(`
        INSERT INTO bigbull.Company (CompanyName, Sector) 
        VALUES ($1, $2) 
        ON CONFLICT (CompanyName) DO NOTHING
      `, [companyName, sector]);

      await client.query(`
        INSERT INTO bigbull.Financial_Instruments (Ticker_Symbol, Instrument_Type, Exchange, CompanyName)
        VALUES ($1, 'Equity', 'NSE', $2)
        ON CONFLICT (Ticker_Symbol) DO NOTHING
      `, [tickerSymbol, companyName]);
    } else {
      const sectorCheck = await client.query('SELECT c.sector FROM bigbull.company c JOIN bigbull.financial_instruments fi ON c.companyname = fi.companyname WHERE fi.ticker_symbol = $1', [tickerSymbol]);
      if (sectorCheck.rows.length > 0 && sectorCheck.rows[0].sector === 'General') {
        try {
          const YahooFinance = (await import('yahoo-finance2')).default;
          const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
          const summary = await yf.quoteSummary(tickerSymbol, { modules: ['assetProfile'] });
          if (summary.assetProfile?.sector && summary.assetProfile.sector !== 'General') {
            await client.query('UPDATE bigbull.company SET sector = $1 FROM bigbull.financial_instruments fi WHERE bigbull.company.companyname = fi.companyname AND fi.ticker_symbol = $2', [summary.assetProfile.sector, tickerSymbol]);
          }
        } catch (err) {
          console.error(`Failed to fetch quoteSummary for ${tickerSymbol} during sector update`, err.message);
        }
      }
    }

    // 3. Log the New Order into the Order Book
    const orderId = 'ORD_' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const insertOrderQuery = `
      INSERT INTO bigbull.orders (order_id, ticker_symbol, order_type, status, orderqty, price, tradingaccid, timestamp, unfilledqty)
      VALUES ($1, $2, $3, 'Pending', $4, $5, $6, NOW(), $7)
    `;
    await client.query(insertOrderQuery, [orderId, tickerSymbol, action, orderQtyInt, orderPriceNum, tradingAccId, orderQtyInt]);

    let remainingToFill = orderQtyInt;
    
    // 4. The Matching Engine
    // Find opposing orders in the book
    let oppositeSide = action === 'BUY' ? 'SELL' : 'BUY';
    let priceCondition = action === 'BUY' ? '<=' : '>=';
    let sortOrder = action === 'BUY' ? 'ASC' : 'DESC'; // Buy matches cheapest sells. Sell matches highest buys.

    const matchingQuery = `
      SELECT order_id, tradingaccid, price, unfilledqty 
      FROM bigbull.orders
      WHERE ticker_symbol = $1 
        AND order_type = $2 
        AND status IN ('Pending', 'Partial')
        AND tradingaccid != $3 -- Don't match with own orders
        AND price ${priceCondition} $4
      ORDER BY price ${sortOrder}, timestamp ASC
      FOR UPDATE SKIP LOCKED
    `;

    const potentialMatches = await client.query(matchingQuery, [tickerSymbol, oppositeSide, tradingAccId, orderPriceNum]);

    for (const match of potentialMatches.rows) {
      if (remainingToFill <= 0) break;

      const matchOrderId = match.order_id;
      const matchAccId = match.tradingaccid;
      const matchPrice = parseFloat(match.price);
      const matchUnfilled = parseInt(match.unfilledqty);

      const execQty = Math.min(remainingToFill, matchUnfilled);
      const execPrice = matchPrice; // Price improvement: maker's price is used

      // Create Executions (Trades)
      const tradeIdBuy = 'TRD_' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const tradeIdSell = 'TRD_' + crypto.randomBytes(6).toString('hex').toUpperCase();

      const buyerOrderId = action === 'BUY' ? orderId : matchOrderId;
      const sellerOrderId = action === 'SELL' ? orderId : matchOrderId;
      
      const buyerAccId = action === 'BUY' ? tradingAccId : matchAccId;
      const sellerAccId = action === 'SELL' ? tradingAccId : matchAccId;

      // Get Demat Acc IDs for portfolio_holds updates
      const buyerDematRes = await client.query('SELECT demataccid FROM bigbull.tradingaccount t JOIN bigbull.demataccount d ON t.userid = d.userid WHERE t.tradingaccid = $1', [buyerAccId]);
      const sellerDematRes = await client.query('SELECT demataccid FROM bigbull.tradingaccount t JOIN bigbull.demataccount d ON t.userid = d.userid WHERE t.tradingaccid = $1', [sellerAccId]);
      
      const buyerDemat = buyerDematRes.rows[0].demataccid;
      const sellerDemat = sellerDematRes.rows[0].demataccid;

      await client.query(`
        INSERT INTO bigbull.trade (trade_id, order_id, demataccid, execution_qty, execution_price, execution_time)
        VALUES ($1, $2, $3, $4, $5, NOW()), ($6, $7, $8, $9, $10, NOW())
      `, [tradeIdBuy, buyerOrderId, buyerDemat, execQty, execPrice, tradeIdSell, sellerOrderId, sellerDemat, execQty, execPrice]);

      // Update Order Unfilled Qtys
      remainingToFill -= execQty;
      const newMatchUnfilled = matchUnfilled - execQty;
      const matchStatus = newMatchUnfilled === 0 ? 'Executed' : 'Pending';

      await client.query('UPDATE bigbull.orders SET unfilledqty = $1, status = $2 WHERE order_id = $3', [newMatchUnfilled, matchStatus, matchOrderId]);

      // Settlement
      // Buyer Settlement
      // Cash was already deducted for the *limit* price. If matched at a *better* price, refund the difference.
      if (action === 'BUY' && orderPriceNum > execPrice) {
        const refund = (orderPriceNum - execPrice) * execQty;
        await client.query('UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance + $1 WHERE TradingAccId = $2', [refund, buyerAccId]);
      } else if (action === 'SELL' && matchPrice > execPrice) {
        // If the opposing BUY order paid more initially than the execution price (shouldn't happen with standard price-time priority as taker gets maker price, but safe to have)
        const refund = (matchPrice - execPrice) * execQty;
        await client.query('UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance + $1 WHERE TradingAccId = $2', [refund, buyerAccId]);
      }

      // Credit shares to buyer
      await client.query(`
        INSERT INTO bigbull.portfolio_holds (demataccid, ticker_symbol, current_quantity_held)
        VALUES ($1, $2, $3)
        ON CONFLICT (demataccid, ticker_symbol) 
        DO UPDATE SET current_quantity_held = portfolio_holds.current_quantity_held + $3
      `, [buyerDemat, tickerSymbol, execQty]);

      // Seller Settlement
      // Credit cash to seller
      const proceeds = execPrice * execQty;
      await client.query('UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance + $1 WHERE TradingAccId = $2', [proceeds, sellerAccId]);
      
      // Deduct shares from seller
      await client.query(`
        UPDATE bigbull.portfolio_holds 
        SET current_quantity_held = current_quantity_held - $1
        WHERE demataccid = $2 AND ticker_symbol = $3
      `, [execQty, sellerDemat, tickerSymbol]);
    }

    // Update the Taker's order status if there is remaining quantity and it's a MARKET order
    if (remainingToFill > 0 && orderType === 'MARKET') {
      // The House (System) steps in to provide infinite liquidity for MARKET orders!
      const execQty = remainingToFill;
      const execPrice = orderPriceNum; 
      
      const tradeId = 'TRD_' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const userDematRes = await client.query('SELECT demataccid FROM bigbull.tradingaccount t JOIN bigbull.demataccount d ON t.userid = d.userid WHERE t.tradingaccid = $1', [tradingAccId]);
      const userDemat = userDematRes.rows[0].demataccid;

      // Log execution for the user
      await client.query(`
        INSERT INTO bigbull.trade (trade_id, order_id, demataccid, execution_qty, execution_price, execution_time)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [tradeId, orderId, userDemat, execQty, execPrice]);

      if (action === 'BUY') {
        // Cash was already locked, credit the shares
        await client.query(`
          INSERT INTO bigbull.portfolio_holds (demataccid, ticker_symbol, current_quantity_held)
          VALUES ($1, $2, $3)
          ON CONFLICT (demataccid, ticker_symbol) 
          DO UPDATE SET current_quantity_held = portfolio_holds.current_quantity_held + $3
        `, [userDemat, tickerSymbol, execQty]);
      } else if (action === 'SELL') {
        // Credit the cash proceeds and deduct shares
        const proceeds = execPrice * execQty;
        await client.query('UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance + $1 WHERE TradingAccId = $2', [proceeds, tradingAccId]);
        
        await client.query(`
          UPDATE bigbull.portfolio_holds 
          SET current_quantity_held = current_quantity_held - $1
          WHERE demataccid = $2 AND ticker_symbol = $3
        `, [execQty, userDemat, tickerSymbol]);
      }
      
      remainingToFill = 0; // Fully filled by the house
    }

    // Update the Taker's order status
    const takerStatus = remainingToFill === 0 ? 'Executed' : 'Pending';
    await client.query('UPDATE bigbull.orders SET unfilledqty = $1, status = $2 WHERE order_id = $3', [remainingToFill, takerStatus, orderId]);

    await client.query('COMMIT');
    
    let msg = takerStatus === 'Executed' ? `${action} order completely executed and settled.` : 
              (remainingToFill < orderQtyInt) ? `${action} order partially executed. Remaining: ${remainingToFill}.` : 
              `${action} order placed in book. Status: Pending.`;
              
    const fillType = (takerStatus === 'Executed' && potentialMatches.rows.length === 0) ? 'HOUSE' : potentialMatches.rows.length > 0 ? 'MATCHED' : 'PENDING';
    return res.status(201).json({ message: msg, orderId, status: takerStatus, fillType });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back clean:', err);
    return res.status(500).json({ message: 'Order matching engine processing error.', error: err.message });
  } finally {
    client.release();
  }
};

export const getUserHoldings = async (req, res) => {
  const userId = req.user.UserId || req.user.userid;

  try {
    // 1. Resolve trading account and demat reference
    const accountRes = await pool.query(`
      SELECT t.TradingAccId, d.demataccid 
      FROM bigbull.TradingAccount t 
      JOIN bigbull.demataccount d ON t.userid = d.userid 
      WHERE t.UserId = $1`, [userId]
    );
    
    if (accountRes.rows.length === 0) {
      return res.json({ holdings: [] });
    }
    const dematAccId = accountRes.rows[0].demataccid;

    // 2. Fetch current holdings
    const holdingsQuery = `
      SELECT 
        p.ticker_symbol,
        c.sector,
        p.current_quantity_held
      FROM bigbull.portfolio_holds p
      JOIN bigbull.financial_instruments fi ON p.ticker_symbol = fi.ticker_symbol 
      JOIN bigbull.company c ON fi.companyname = c.companyname 
      WHERE p.demataccid = $1 AND p.current_quantity_held > 0;
    `;
    const holdingsResult = await pool.query(holdingsQuery, [dematAccId]);
    
    if (holdingsResult.rows.length === 0) {
      return res.json({ holdings: [] });
    }

    // 3. Fetch all historical trades for this demat to calculate true Average Cost Basis (ACB)
    const tradesQuery = `
      SELECT 
        o.ticker_symbol,
        o.order_type,
        t.execution_qty,
        t.execution_price
      FROM bigbull.trade t
      JOIN bigbull.orders o ON t.order_id = o.order_id
      WHERE t.demataccid = $1
      ORDER BY t.execution_time ASC
    `;
    const tradesResult = await pool.query(tradesQuery, [dematAccId]);

    const acbMap = {};
    for (const trade of tradesResult.rows) {
      const sym = trade.ticker_symbol;
      if (!acbMap[sym]) acbMap[sym] = { qty: 0, acb: 0 };
      
      const execQty = parseFloat(trade.execution_qty);
      const execPrice = parseFloat(trade.execution_price);
      
      if (trade.order_type === 'BUY') {
        const newQty = acbMap[sym].qty + execQty;
        if (newQty > 0) {
          acbMap[sym].acb = ((acbMap[sym].qty * acbMap[sym].acb) + (execQty * execPrice)) / newQty;
        }
        acbMap[sym].qty = newQty;
      } else if (trade.order_type === 'SELL') {
        acbMap[sym].qty = Math.max(0, acbMap[sym].qty - execQty);
        if (acbMap[sym].qty === 0) {
           acbMap[sym].acb = 0; // reset basis if position is completely closed
        }
      }
    }

    // 4. Map safely to match variable names expected by your frontend dashboard cards
    const formattedHoldings = holdingsResult.rows.map(row => {
      const sym = row.ticker_symbol;
      const trueBuyPrice = acbMap[sym] ? acbMap[sym].acb : 0;
      
      return {
        Ticker_Symbol: sym,
        Sector: row.sector,
        Current_Quantity_Held: parseInt(row.current_quantity_held),
        Avg_Buy_Price: trueBuyPrice.toFixed(2)
      };
    });

    return res.json({ holdings: formattedHoldings });
  } catch (err) {
    console.error('Error executing holdings aggregation query:', err.message);
    return res.status(500).json({ message: 'Failed to compile portfolio assets ledger.', error: err.message });
  }
};

export const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.UserId || req.user.userid;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get Trading Account ID
    const accountRes = await client.query(
      'SELECT TradingAccId FROM bigbull.TradingAccount WHERE UserId = $1',
      [userId]
    );
    if (accountRes.rows.length === 0) {
      throw new Error('Trading account not found.');
    }
    const tradingAccId = accountRes.rows[0].tradingaccid;

    // Lock the specific order to cancel
    const orderRes = await client.query(
      `SELECT status, order_type, unfilledqty, price 
       FROM bigbull.orders 
       WHERE order_id = $1 AND tradingaccid = $2 
       FOR UPDATE`,
      [orderId, tradingAccId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'Pending' && order.status !== 'Partial') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot cancel order with status: ${order.status}` });
    }

    // Set order status to Cancelled
    await client.query(
      "UPDATE bigbull.orders SET status = 'Cancelled', unfilledqty = 0 WHERE order_id = $1",
      [orderId]
    );

    // Refund if BUY order
    if (order.order_type === 'BUY') {
      const refundAmount = parseFloat(order.price) * parseInt(order.unfilledqty);
      await client.query(
        'UPDATE bigbull.TradingAccount SET AvlBalance = AvlBalance + $1 WHERE TradingAccId = $2',
        [refundAmount, tradingAccId]
      );
    }

    await client.query('COMMIT');
    return res.json({ message: 'Order successfully cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', err);
    return res.status(500).json({ message: 'Failed to cancel order.', error: err.message });
  } finally {
    client.release();
  }
};

export const getOrderHistory = async (req, res) => {
  const userId = req.user.UserId || req.user.userid;
  
  try {
    const query = `
      SELECT o.* 
      FROM bigbull.orders o 
      JOIN bigbull.tradingaccount t ON o.tradingaccid = t.tradingaccid 
      WHERE t.userid = $1 
      ORDER BY o.timestamp DESC
    `;
    const result = await pool.query(query, [userId]);
    return res.json({ orders: result.rows });
  } catch (err) {
    console.error('Error fetching order history:', err);
    return res.status(500).json({ message: 'Failed to fetch order history.', error: err.message });
  }
};