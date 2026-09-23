import { Router } from 'express';

const router = Router();
const openapi = {
  openapi: '3.0.3',
  info: { title: 'Fingestor Integration API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'API key' } },
    schemas: {
      Transaction: {
        type: 'object', required: ['categoryId', 'type', 'description', 'amount', 'date', 'status'],
        properties: {
          categoryId: { type: 'string', format: 'uuid' }, type: { type: 'string', enum: ['income', 'expense', 'investment'] },
          description: { type: 'string' }, amount: { type: 'number' }, date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['paid', 'pending', 'scheduled'] }, notes: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/categories': { get: { security: [{ apiKey: [] }], responses: { '200': { description: 'Categorias da empresa' }, '403': { description: 'Sem permissao read' } } } },
    '/transactions': {
      get: { security: [{ apiKey: [] }], responses: { '200': { description: 'Lancamentos' } } },
      post: { security: [{ apiKey: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Transaction' }, example: { categoryId: 'uuid', type: 'income', description: 'Venda', amount: 150, date: '2026-09-23', status: 'paid' } } } }, responses: { '201': { description: 'Criado' } } },
    },
    '/transactions/{id}': {
      put: { security: [{ apiKey: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Atualizado' } } },
      delete: { security: [{ apiKey: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Removido' } } },
    },
  },
};

router.get('/openapi.json', (_req, res) => res.json(openapi));
router.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fingestor API - Documentação</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>SwaggerUIBundle({url:'/api/v1/openapi.json',dom_id:'#swagger-ui',persistAuthorization:true});</script></body></html>`);
});
export default router;
