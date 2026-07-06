import {Router} from "express";
import {createCommentarySchema, listCommentaryQuerySchema} from "../validation/commentary.js";
import {matchIdParamSchema} from "../validation/matches.js";
import {commentary} from "../db/schema.js";
import {db} from "../db/db.js";
import {desc, eq} from "drizzle-orm";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({mergeParams: true});

commentaryRouter.get('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({error: 'Invalid match id.', details: JSON.stringify(parsedParams.error)})
    }

    const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json({error: 'Invalid query.', details: JSON.stringify(parsedQuery.error)})
    }

    const limit = Math.min(parsedQuery.data.limit ?? 100, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, parsedParams.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        res.json({data});
    } catch (e) {
        console.error("Failed to list commentary:", e);
        res.status(500).json({error: "Failed to list commentary."})
    }
});

commentaryRouter.post('/', async (req, res) => {
    const parsedParams = matchIdParamSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({error: 'Invalid match id.', details: JSON.stringify(parsedParams.error)})
    }

    const parsedBody = createCommentarySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({error: 'Invalid payload.', details: JSON.stringify(parsedBody.error)})
    }

    const {minute, sequence, period, eventType, actor, team, message, metadata, tags} = parsedBody.data;

    try {
        const [event] = await db.insert(commentary).values({
            matchId: parsedParams.data.id,
            minute,
            sequence,
            period,
            eventType,
            actor,
            team,
            message,
            metadata,
            tags,
        }).returning();

        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(event.matchId, event);
        }

        res.status(201).json({data: event});
    } catch (e) {
        console.error("Failed to create commentary:", e);
        res.status(500).json({error: "Failed to create commentary."})
    }
});

