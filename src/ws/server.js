import {WebSocket, WebSocketServer} from "ws";
import {wsArcjet} from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);

    if (subscribers) {
        subscribers.delete(socket);

        if (subscribers.size === 0) {
            matchSubscribers.delete(matchId);
        }
    }
}

function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        try {
            sendJson(client, payload);
        } catch (err) {
            console.error(err);
        }
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (matchSubscribers.has(matchId)) {
        const message = JSON.stringify(payload);

        for (const client of subscribers) {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
}

function handleMessage(socket, data) {
    let message;

    try {
        message = JSON.parse(data.toString());
    } catch (err) {
        sendJson(socket, {type: 'error', message: 'Invalid JSON'});
    }

    if (message?.type === 'subscribe' && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, {type: 'subscribed', matchId: message.matchId});
        return;
    }

    if (message?.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, {type: 'unsubscribed', matchId: message.matchId});
    }
}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({noServer: true, maxPayload: 1024 * 1024,})

    server.on('upgrade', async (request, socket, head) => {
        const {pathname} = new URL(request.url, `http://${request.headers.host}`);

        if (pathname !== '/ws') {
            socket.destroy();
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(request);
                if (decision.isDenied()) {
                    socket.destroy();
                    return;
                }
            } catch (e) {
                console.error('WS connection error:', e);
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    wss.on('connection', async (socket) => {

        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });

        socket.subscriptions = new Set();

        sendJson(socket, {type: 'welcome'});

        socket.on('message', (data) => handleMessage(socket, data));

        socket.on('error', () => {
            socket.terminate();
        });

        socket.on('close', () => {
            cleanupSubscriptions(socket);
        })

        socket.on('error', console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, {type: 'match_created', data: match});
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, {type: 'commentary', data: comment});
    }

    return {broadcastMatchCreated, broadcastCommentary}
}