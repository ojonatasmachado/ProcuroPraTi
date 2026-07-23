import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import dotenv from 'dotenv';
import { VitePWA } from 'vite-plugin-pwa';

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';
let inlineEditPlugin, editModeDevPlugin;

if (isDev) {
	inlineEditPlugin = (await import('./plugins/visual-editor/vite-plugin-react-inline-editor.js')).default;
	editModeDevPlugin = (await import('./plugins/visual-editor/vite-plugin-edit-mode.js')).default;
}

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		return {
			html,
			tags: [
				{
					tag: 'script',
					attrs: { type: 'module' },
					children: configHorizonsRuntimeErrorHandler,
					injectTo: 'head',
				},
				{
					tag: 'script',
					attrs: { type: 'module' },
					children: configHorizonsViteErrorHandler,
					injectTo: 'head',
				},
				{
					tag: 'script',
					attrs: {type: 'module'},
					children: configHorizonsConsoleErrroHandler,
					injectTo: 'head',
				},
				{
					tag: 'script',
					attrs: { type: 'module' },
					children: configWindowFetchMonkeyPatch,
					injectTo: 'head',
				},
			],
		};
	},
};

const adminPreviewDataPlugin = () => ({
	name: 'admin-preview-supabase-data',
	configureServer(server) {
		const getAdminConnection = () => {
			const supabaseUrl = process.env.VITE_SUPABASE_URL;
			const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			if (!supabaseUrl || !serviceKey) throw new Error('Supabase não configurado no servidor local.');
			return {
				baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
				headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
			};
		};

		server.middlewares.use('/api/admin-catalog', async (request, response) => {
			try {
				const { baseUrl, headers } = getAdminConnection();
				if (request.method === 'GET') {
					const url = new URL(request.url || '/', 'http://localhost');
					const search = (url.searchParams.get('search') || '').trim();
					const status = url.searchParams.get('status') || 'pending';
					const submissionQuery = status === 'all' ? '' : `&status=eq.${encodeURIComponent(status)}`;
					const partFilter = search ? `&or=(name.ilike.*${encodeURIComponent(search)}*,normalized_name.ilike.*${encodeURIComponent(search)}*)` : '';
					const [submissionsResult, partsResult] = await Promise.all([
						fetch(`${baseUrl}/part_catalog_submissions?select=*&order=occurrences.desc,last_seen_at.desc&limit=100${submissionQuery}`, { headers }),
						fetch(`${baseUrl}/part_catalog?select=*&order=admin_locked.desc,name.asc&limit=100${partFilter}`, { headers }),
					]);
					if (!submissionsResult.ok) throw new Error(await submissionsResult.text());
					if (!partsResult.ok) throw new Error(await partsResult.text());
					response.setHeader('Content-Type', 'application/json; charset=utf-8');
					response.setHeader('Cache-Control', 'no-store');
					response.end(JSON.stringify({ submissions: await submissionsResult.json(), parts: await partsResult.json() }));
					return;
				}

				if (request.method !== 'POST') {
					response.statusCode = 405;
					response.end(JSON.stringify({ error: 'Método não permitido.' }));
					return;
				}

				let rawBody = '';
				for await (const chunk of request) rawBody += chunk;
				const body = JSON.parse(rawBody || '{}');
				const requestJson = async (path, options = {}) => {
					const result = await fetch(`${baseUrl}/${path}`, { headers: { ...headers, Prefer: 'return=representation' }, ...options });
					if (!result.ok) throw new Error(await result.text());
					const text = await result.text();
					return text ? JSON.parse(text) : null;
				};

				let result = null;
				if (body.action === 'add' || body.action === 'approve_new') {
					const row = {
						name: body.name,
						normalized_name: body.normalizedName,
						source_id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						category_name: body.primaryCategory || 'Outros',
						primary_category: body.primaryCategory || 'Outros',
						secondary_categories: body.secondaryCategories || [],
						vehicle_types: body.vehicleTypes || ['car'],
						aliases: body.aliases || [],
						is_high_value: Boolean(body.isHighValue),
						active: true,
						is_searchable: true,
						admin_locked: true,
						source: 'admin',
						admin_notes: body.adminNotes || null,
					};
					const inserted = await requestJson('part_catalog', { method: 'POST', body: JSON.stringify(row) });
					result = inserted?.[0] || null;
					if (body.submissionId && result?.id) {
						await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
							method: 'PATCH',
							body: JSON.stringify({ status: 'approved', linked_part_id: result.id, reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
						});
					}
				} else if (body.action === 'link') {
					result = await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
						method: 'PATCH',
						body: JSON.stringify({ status: 'linked', linked_part_id: body.partId, reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
					});
				} else if (body.action === 'update') {
					result = await requestJson(`part_catalog?id=eq.${encodeURIComponent(body.partId)}`, {
						method: 'PATCH',
						body: JSON.stringify({
							name: body.name,
							normalized_name: body.normalizedName,
							aliases: body.aliases || [],
							primary_category: body.primaryCategory,
							category_name: body.primaryCategory,
							secondary_categories: body.secondaryCategories || [],
							is_high_value: Boolean(body.isHighValue),
							active: Boolean(body.active),
							is_searchable: Boolean(body.active),
							disabled_at: body.active ? null : new Date().toISOString(),
							admin_locked: true,
							admin_notes: body.adminNotes || null,
						}),
					});
				} else if (body.action === 'ignore') {
					result = await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
						method: 'PATCH',
						body: JSON.stringify({ status: 'ignored', reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
					});
				} else {
					throw new Error('Ação de catálogo inválida.');
				}
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ result }));
			} catch (error) {
				response.statusCode = 500;
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ error: error.message }));
			}
		});

		server.middlewares.use('/api/admin-entitlements', async (request, response) => {
			try {
				if (request.method !== 'POST') {
					response.statusCode = 405;
					response.end(JSON.stringify({ error: 'Método não permitido.' }));
					return;
				}
				const { baseUrl, headers } = getAdminConnection();
				let rawBody = '';
				for await (const chunk of request) rawBody += chunk;
				const body = JSON.parse(rawBody || '{}');
				if (!body.companyId || !body.reason?.trim()) throw new Error('Empresa e justificativa são obrigatórias.');
				const now = new Date();
				const durationDays = Math.max(1, Number(body.durationDays || 30));
				const endsAt = body.indefinite ? null : new Date(now.getTime() + durationDays * 86400000).toISOString();
				const companyResult = await fetch(`${baseUrl}/companies?id=eq.${encodeURIComponent(body.companyId)}&select=plan_code,subscription_current_period_end,manual_plan_ends_at,trial_extended_until,trial_hard_ends_at`, { headers });
				if (!companyResult.ok) throw new Error(await companyResult.text());
				const companyCurrent = (await companyResult.json())?.[0] || {};
				const extendDate = value => new Date(Math.max(now.getTime(), value ? new Date(value).getTime() : 0) + durationDays * 86400000).toISOString();
				let companyPatch;
				let adjustment;
				if (body.action === 'extend_trial') {
					companyPatch = { trial_extended_until: endsAt };
					adjustment = { adjustment_type: 'trial_extension', company_id: body.companyId, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: false, no_charge: true };
				} else if (body.action === 'grant_plan') {
					if (!body.planCode) throw new Error('Selecione um plano.');
					companyPatch = { plan_code: body.planCode, subscription_state: 'subscriber_active', manual_plan_ends_at: endsAt, manual_plan_indefinite: Boolean(body.indefinite), manual_plan_reason: body.reason.trim(), subscription_payment_status: 'manual_no_charge' };
					adjustment = { adjustment_type: 'manual_plan', company_id: body.companyId, plan_code: body.planCode, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: Boolean(body.indefinite), no_charge: true };
				} else if (body.action === 'billing_pause') {
					companyPatch = {
						billing_pause_until: endsAt,
						billing_pause_reason: body.reason.trim(),
						...(companyCurrent.subscription_current_period_end ? { subscription_current_period_end: extendDate(companyCurrent.subscription_current_period_end) } : {}),
						...(companyCurrent.manual_plan_ends_at ? { manual_plan_ends_at: extendDate(companyCurrent.manual_plan_ends_at) } : {}),
						...(!companyCurrent.plan_code ? { trial_extended_until: extendDate(companyCurrent.trial_extended_until || companyCurrent.trial_hard_ends_at) } : {}),
					};
					adjustment = { adjustment_type: 'billing_pause', company_id: body.companyId, plan_code: companyCurrent.plan_code || null, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: false, no_charge: true };
				} else {
					throw new Error('Ação administrativa inválida.');
				}
				const patchResult = await fetch(`${baseUrl}/companies?id=eq.${encodeURIComponent(body.companyId)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(companyPatch) });
				if (!patchResult.ok) throw new Error(await patchResult.text());
				const auditResult = await fetch(`${baseUrl}/company_entitlement_adjustments`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(adjustment) });
				if (!auditResult.ok) throw new Error(await auditResult.text());
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ company: (await patchResult.json())?.[0], adjustment: (await auditResult.json())?.[0] }));
			} catch (error) {
				response.statusCode = 500;
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.end(JSON.stringify({ error: error.message }));
			}
		});

		server.middlewares.use('/api/admin-preview-data', async (request, response) => {
			if (request.method !== 'GET') {
				response.statusCode = 405;
				response.end('Method not allowed');
				return;
			}
			const supabaseUrl = process.env.VITE_SUPABASE_URL;
			const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			if (!supabaseUrl || !serviceKey) {
				response.statusCode = 503;
				response.end(JSON.stringify({ error: 'Supabase não configurado no servidor local.' }));
				return;
			}

			const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
			const readTable = async (path) => {
				const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, { headers });
				if (!result.ok) throw new Error(`${result.status}: ${await result.text()}`);
				return result.json();
			};

			try {
				const [users, companies, procuras, feedbacks, registrationProgress] = await Promise.all([
					readTable('users?select=id,name,email,phone,location,vehicles,created_at,terms_accepted_date&is_demo=eq.false'),
					readTable('companies?select=id,name,email,phone,cnpj,address,serves_locations,validation_status,validation_reason,vehicle_types,created_at,terms_accepted_date,payment_exempt_until,access_history&is_demo=eq.false&deleted_at=is.null'),
					readTable('procuras?select=*,responses(*)&is_demo=eq.false'),
					readTable('feedbacks?select=*&is_demo=eq.false'),
					readTable('registration_progress?select=email,stage,updated_at'),
				]);
				response.setHeader('Content-Type', 'application/json; charset=utf-8');
				response.setHeader('Cache-Control', 'no-store');
				response.end(JSON.stringify({ users, companies, procuras, feedbacks, registrationProgress }));
			} catch (error) {
				response.statusCode = 500;
				response.end(JSON.stringify({ error: error.message }));
			}
		});
	},
});

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), adminPreviewDataPlugin()] : []),
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'apple-touch-icon-v2.png'],
			manifest: {
				name: 'Procuro pra ti',
				short_name: 'Procuro pra ti',
				id: '/',
				description: 'Conecta quem procura peças automotivas às empresas que podem atender.',
				theme_color: '#F5F7FB',
				background_color: '#F5F7FB',
				display: 'standalone',
				orientation: 'portrait-primary',
				start_url: '/',
				scope: '/',
				lang: 'pt-BR',
				categories: ['shopping', 'business', 'automotive'],
				icons: [
					{ src: '/pwa-192x192-v2.png', sizes: '192x192', type: 'image/png' },
					{ src: '/pwa-512x512-v2.png', sizes: '512x512', type: 'image/png' },
					{ src: '/pwa-512x512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
				],
			},
			workbox: {
				importScripts: ['push-sw.js'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				navigateFallback: 'index.html',
				globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
						handler: 'StaleWhileRevalidate',
						options: { cacheName: 'brand-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } },
					},
					{
						urlPattern: /\/maps\/(?:[A-Z]{2}(?:-state)?|BR-states)\.geojson$/,
						handler: 'CacheFirst',
						options: { cacheName: 'municipality-meshes', expiration: { maxEntries: 55, maxAgeSeconds: 2592000 } },
					},
				],
			},
		}),
		addTransformIndexHtml
	],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			]
		}
	}
});
