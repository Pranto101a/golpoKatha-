// গল্পকথা — সংখ্যা যুদ্ধ — Online Multiplayer Server (Socket.io)
// Run:  cd public/game && npm install && npm start
// Open: http://localhost:3000

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(__dirname));

const POINT_POOL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
function pickCornerNumbers(total) {
  const pool = []; for (let i = 1; i <= 150; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, total);
}
function buildDeck(numPlayers, cardsPer) {
  const total = numPlayers * cardsPer;
  const ids = []; for (let i = 1; i <= total; i++) ids.push(i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const corners = pickCornerNumbers(total);
  return ids.map((n, i) => {
    const isEven = n % 2 === 0;
    const point = isEven ? POINT_POOL[Math.floor(Math.random() * POINT_POOL.length)] : 0;
    return { id: n, corner: corners[i], isEven, point };
  });
}

const rooms = {}; // code -> room
function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return rooms[c] ? makeCode() : c;
}

function publicRoom(r) {
  return {
    code: r.code, phase: r.phase, round: r.round, currentTurn: r.players[r.currentTurn]?.id,
    targetScore: r.targetScore, teamMode: r.teamMode, cardsPer: r.cardsPer,
    table: r.table, gameWinner: r.gameWinner, isFirstRoundEver: r.isFirstRoundEver,
    openCardId: r.openCardId, firstTrickOfRound: r.firstTrickOfRound,
    players: r.players.map(p => ({
      id: p.id, name: p.name, host: p.host, score: p.score, team: p.team,
      bid: p.bid, tricksWon: p.tricksWon, livePts: p.livePts || 0,
      cardCount: p.cards.length, roundScore: p.roundScore
    }))
  };
}
function sendLobby(r){ io.to(r.code).emit('lobby', publicRoom(r)); }
function sendState(r){ io.to(r.code).emit('state', publicRoom(r)); }
function sendDealt(r){ r.players.forEach(p => io.to(p.id).emit('dealt', { yourCards: p.cards, state: publicRoom(r) })); }
function sendMyCards(r, playerId){
  const p = r.players.find(x => x.id === playerId);
  if (p) io.to(playerId).emit('yourCards', { yourCards: p.cards, state: publicRoom(r) });
}

function dealRoom(r) {
  const deck = buildDeck(r.players.length, r.cardsPer);
  r.players.forEach((p, i) => {
    p.cards = deck.slice(i * r.cardsPer, (i + 1) * r.cardsPer).sort((a, b) => a.corner - b.corner);
    p.bid = null; p.tricksWon = 0; p.collected = []; p.livePts = 0; p.roundScore = 0;
  });
  r.table = [];
  let minCorner = Infinity;
  r.players.forEach(p => p.cards.forEach(c => { if (c.corner < minCorner) minCorner = c.corner; }));
  let op = r.players.findIndex(p => p.cards.some(c => c.corner === minCorner));
  if (op < 0) op = 0; r.currentTurn = op; r.firstTrickOfRound = true;
  r.openCardId = minCorner;
  r.phase = r.isFirstRoundEver ? 'play' : 'bid'; r.bidIndex = 0;
  r.gameWinner = null;
}

function closeRoom(code, reason){
  const r = rooms[code]; if (!r) return;
  io.to(code).emit('roomClosed', { reason: reason || 'রুম বন্ধ হয়েছে' });
  // force-leave all sockets in the room
  const ids = r.players.map(p => p.id);
  ids.forEach(id => { const s = io.sockets.sockets.get(id); if (s) s.leave(code); });
  delete rooms[code];
}

io.on('connection', socket => {
  socket.on('createRoom', ({ name, maxPlayers = 2, cardsPer = 5, targetScore = 100, teamMode = 'solo' }) => {
    const code = makeCode();
    const room = {
      code, players: [], maxPlayers: +maxPlayers, cardsPer: +cardsPer,
      targetScore: +targetScore, teamMode, phase: 'lobby',
      table: [], round: 1, isFirstRoundEver: true
    };
    room.players.push({ id: socket.id, name: name || 'Host', host: true, cards: [], bid: null,
      score: 0, tricksWon: 0, collected: [], livePts: 0, team: null });
    rooms[code] = room;
    socket.join(code);
    socket.emit('roomCreated', publicRoom(room));
    sendLobby(room);
  });

  socket.on('joinRoom', ({ code, name }) => {
    const room = rooms[code];
    if (!room) { socket.emit('errMsg', 'রুম পাওয়া যায়নি'); return; }
    if (room.players.length >= room.maxPlayers) { socket.emit('errMsg', 'রুম পূর্ণ'); return; }
    if (room.phase !== 'lobby') { socket.emit('errMsg', 'গেম ইতিমধ্যে শুরু'); return; }
    room.players.push({ id: socket.id, name: name || 'Player', host: false, cards: [], bid: null,
      score: 0, tricksWon: 0, collected: [], livePts: 0, team: null });
    socket.join(code);
    socket.emit('joined', publicRoom(room));
    sendLobby(room);
  });

  socket.on('leaveRoom', ({ code }) => {
    const room = rooms[code]; if (!room) return;
    const me = room.players.find(p => p.id === socket.id); if (!me) return;
    socket.leave(code);
    if (me.host || room.phase !== 'lobby') {
      closeRoom(code, me.host ? 'হোস্ট রুম ছেড়ে দিয়েছে' : `${me.name} রুম ছেড়ে দিয়েছে`);
    } else {
      room.players = room.players.filter(p => p.id !== socket.id);
      sendLobby(room);
    }
  });

  socket.on('startGame', ({ code }) => {
    const room = rooms[code]; if (!room) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.host) return;
    if (room.players.length < 2) { socket.emit('errMsg', 'সর্বনিম্ন ২ জন'); return; }
    if (room.teamMode !== 'solo') {
      const sz = +room.teamMode.split('v')[0];
      if (room.players.length === sz * 2) {
        room.players.forEach((p, i) => p.team = (i % 2 === 0) ? 'A' : 'B');
      }
    }
    dealRoom(room); sendDealt(room);
  });

  socket.on('placeBid', ({ code, bid }) => {
    const room = rooms[code]; if (!room || room.phase !== 'bid') return;
    if (room.players[room.currentTurn].id !== socket.id) return;
    const p = room.players[room.currentTurn];
    p.bid = Math.max(0, Math.min(50, +bid || 0));
    room.bidIndex++;
    if (room.bidIndex >= room.players.length) {
      room.phase = 'play';
      let op = room.players.findIndex(x => x.cards.some(c => c.corner === room.openCardId));
      if (op < 0) op = 0; room.currentTurn = op;
    } else room.currentTurn = (room.currentTurn + 1) % room.players.length;
    sendState(room);
  });

  socket.on('playCard', ({ code, cardId }) => {
    const room = rooms[code]; if (!room || room.phase !== 'play') return;
    if (room.players[room.currentTurn].id !== socket.id) {
      socket.emit('errMsg', 'আপনার পালা নয়'); sendMyCards(room, socket.id); return;
    }
    const p = room.players[room.currentTurn];
    const idx = p.cards.findIndex(c => c.id === cardId);
    if (idx < 0) { sendMyCards(room, socket.id); return; }
    if (room.firstTrickOfRound && room.isFirstRoundEver && room.table.length === 0 && p.cards[idx].corner !== room.openCardId) {
      socket.emit('errMsg', 'প্রথম চালে সর্বনিম্ন কার্ড (ওপেন কার্ড) দিতে হবে');
      sendMyCards(room, socket.id); return;
    }
    const card = p.cards.splice(idx, 1)[0];
    room.table.push({ playerId: socket.id, pid: p.id, card });

    if (room.table.length === room.players.length) {
      let win = 0; room.table.forEach((t, i) => { if (t.card.corner > room.table[win].card.corner) win = i; });
      const winner = room.players.find(x => x.id === room.table[win].playerId);
      winner.tricksWon++; winner.collected.push(...room.table.map(t => t.card));
      winner.livePts = winner.collected.reduce((s, c) => s + c.point, 0);
      room.firstTrickOfRound = false;
      room.currentTurn = room.players.findIndex(x => x.id === winner.id);
      const taken = room.table.slice(); room.table = [];
      io.to(code).emit('trickWon', { winnerId: winner.id, cards: taken, state: publicRoom(room) });

      if (room.players.every(x => x.cards.length === 0)) {
        room.players.forEach(pp => {
          const pts = pp.collected.reduce((s, c) => s + c.point, 0);
          pp.roundScore = pts;
          if (room.isFirstRoundEver) pp.score += pts;
          else if (pts >= pp.bid) pp.score += pp.bid;
          else pp.score -= pp.bid;
        });
        room.isFirstRoundEver = false;
        let gameWinner = null;
        if (room.teamMode !== 'solo') {
          const A = room.players.filter(p => p.team === 'A').reduce((s, p) => s + p.score, 0);
          const B = room.players.filter(p => p.team === 'B').reduce((s, p) => s + p.score, 0);
          if (A >= room.targetScore || B >= room.targetScore) gameWinner = A >= B ? 'Team A' : 'Team B';
        } else {
          const top = [...room.players].sort((a, b) => b.score - a.score)[0];
          if (top.score >= room.targetScore) gameWinner = top.name;
        }
        room.phase = gameWinner ? 'gameOver' : 'roundEnd';
        room.gameWinner = gameWinner;
        io.to(code).emit('roundEnd', { state: publicRoom(room) });
      } else sendState(room);
    } else {
      room.currentTurn = (room.currentTurn + 1) % room.players.length;
      sendState(room);
    }
  });

  socket.on('nextRound', ({ code }) => {
    const room = rooms[code]; if (!room) return;
    const me = room.players.find(p => p.id === socket.id);
    if (!me || !me.host) return;
    if (room.phase === 'gameOver') return;
    room.round++; dealRoom(room); sendDealt(room);
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(code => {
      const r = rooms[code];
      const me = r.players.find(p => p.id === socket.id);
      if (!me) return;
      // If host leaves OR game is in progress: close the room for everyone
      if (me.host || r.phase !== 'lobby') {
        closeRoom(code, me.host ? 'হোস্ট চলে গিয়েছে — রুম বন্ধ' : `${me.name} চলে গিয়েছে — রুম বন্ধ`);
        return;
      }
      // Lobby + non-host: just remove that player
      r.players = r.players.filter(p => p.id !== socket.id);
      if (!r.players.length) { delete rooms[code]; return; }
      sendLobby(r);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`গল্পকথা server: http://localhost:${PORT}`));
