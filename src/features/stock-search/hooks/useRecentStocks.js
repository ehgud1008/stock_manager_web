import { useState } from 'react';
import { readRecentStocks, saveRecentStock } from '../services/recentStockStorage';

export default function useRecentStocks() {
  const [recentStocks, setRecentStocks] = useState(readRecentStocks);

  const rememberStock = (stock) => {
    const nextStocks = saveRecentStock(stock);
    setRecentStocks(nextStocks);
  };

  return { recentStocks, rememberStock };
}
