import { fetchLiveQuote } from './yahooService.js';

const activeStreams = new Map();

export const initializeSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(` Connection channel mounted: ${socket.id}`);
    const subscribedSymbols = new Set();

    const unsubscribe = (symbol) => {
      if (subscribedSymbols.has(symbol)) {
        socket.leave(symbol);
        subscribedSymbols.delete(symbol);
        console.log(` Tracking dismantled for: ${symbol}`);
        
        const stream = activeStreams.get(symbol);
        if (stream) {
          stream.subscriberCount--;
          if (stream.subscriberCount === 0) {
            clearInterval(stream.interval);
            activeStreams.delete(symbol);
            console.log(` Interval cleared for: ${symbol}`);
          }
        }
      }
    };

    socket.on('subscribe', (symbol) => {
      socket.join(symbol);
      subscribedSymbols.add(symbol);
      console.log(` Tracking registered for: ${symbol}`);

      if (!activeStreams.has(symbol)) {
        const interval = setInterval(async () => {
          const data = await fetchLiveQuote(symbol);
          if (data) {
            io.to(symbol).emit('tick', data);
          }
        }, 2000);
        activeStreams.set(symbol, { interval, subscriberCount: 1 });
      } else {
        activeStreams.get(symbol).subscriberCount++;
      }
    });

    socket.on('unsubscribe', (symbol) => {
      unsubscribe(symbol);
    });

    socket.on('disconnect', () => {
      console.log(` Client disconnected.`);
      subscribedSymbols.forEach(symbol => unsubscribe(symbol));
    });
  });
};