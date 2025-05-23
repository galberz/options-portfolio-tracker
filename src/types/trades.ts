import { OptionType, PositionType, SharePosition, OptionPosition } from './portfolio';

export enum TradeAction {
  BUY_SHARE = 'BUY_SHARE',
  SELL_SHARE = 'SELL_SHARE',
  BUY_TO_OPEN_OPTION = 'BUY_TO_OPEN_OPTION',
  SELL_TO_OPEN_OPTION = 'SELL_TO_OPEN_OPTION',
  BUY_TO_CLOSE_OPTION = 'BUY_TO_CLOSE_OPTION',
  SELL_TO_CLOSE_OPTION = 'SELL_TO_CLOSE_OPTION',
  OPTION_EXPIRED = 'OPTION_EXPIRED',
  OPTION_ASSIGNED = 'OPTION_ASSIGNED',
  OPTION_EXERCISED = 'OPTION_EXERCISED'
}

export interface Trade {
  id: string;
  date: string;
  ticker: string;
  action: TradeAction;
  quantity: number;
  pricePerShare?: number;
  optionType?: OptionType;
  positionType?: PositionType;
  strikePrice?: number;
  expirationDate?: string;
  premiumPerContract?: number;
  optionId?: string;
  brokerage?: number;
  realizedPL?: number;
}

export interface ProcessedPortfolio {
  openShares: SharePosition[];
  openOptions: OptionPosition[];
  realizedPL: number;
  transactionLog: Trade[];
}
