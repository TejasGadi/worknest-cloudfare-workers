import OpenAI from 'openai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
	OPEN_AI_KEY: string;
	AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	'/*',
	cors({
		origin: '*', // Allow requests from your Next.js app
		allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests', 'Content-Type'], // Add Content-Type to the allowed headers to fix CORS
		allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT'],
		exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
		maxAge: 600,
		credentials: true,
	})
);

app.post('/chatToDocument', async (c) => {
	const openai = new OpenAI({
		apiKey: c.env.OPEN_AI_KEY,
	});

	const { documentData, question } = await c.req.json();

	const chatCompletion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'You are a assistant helping the user to chat to a document, I am providing a JSON file of the markdown for the document. Using this, answer the users question in the clearest way possible, the document is about ' +
					documentData,
			},
			{
				role: 'user',
				content: 'My Question is: ' + question,
			},
		],
		model: 'gpt-4o-mini',
		temperature: 0.5,
	});

	const response = chatCompletion.choices[0].message.content;

	return c.json({ message: response });
});

app.post('/translateDocument', async (c) => {
	try {
		const openai = new OpenAI({
			apiKey: c.env.OPEN_AI_KEY,
		});

		// Parse JSON request body
		const { documentData, targetLang } = await c.req.json();

		// Ensure required parameters are provided
		if (!documentData || !targetLang) {
			return c.json({ error: 'Missing documentData or targetLang' }, 400);
		}

		// Translate the document using OpenAI Chat Completion
		console.log(`Translating document to ${targetLang}...`);
		const chatCompletion = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `You are a professional translator. Translate the following document into ${targetLang}.
					Ignore input structure and return the answer in standard markdown(.md) format.`,
				},
				{
					role: 'user',
					content: documentData,
				},
			],
			model: 'gpt-4o-mini',
			temperature: 0.5,
		});

		const translatedText = chatCompletion.choices[0].message.content;

		// Return translated response
		return c.json({ translatedText });
	} catch (error) {
		console.error('Error processing /translateDocument:', error);
		return c.json({ error: 'Internal Server Error' }, 500);
	}
});

export default app;