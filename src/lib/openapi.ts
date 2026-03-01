import { createDocument } from 'zod-openapi'
import 'zod-openapi/extend'
import { z } from 'zod'
import { LoginDto } from '@/dtos/auth.dto'
import {
  ClassifierRuleCreateDto,
  ClassifierRuleUpdateDto,
  ClassifierRuleResponseDto,
} from '@/dtos/classifier.dto'
import {
  TransactionListQueryDto,
  TransactionSummaryQueryDto,
  TransactionTotalQueryDto,
  TransactionResponseDto,
} from '@/dtos/transaction.dto'
import { ImportResultDto } from '@/dtos/import.dto'

// ── Common ────────────────────────────────────────────────────────────────────

const ErrorSchema = z.object({
  error: z.object({ message: z.string(), code: z.string().optional() }),
})

const OkSchema = z.object({ ok: z.literal(true) })

// ── Auth ──────────────────────────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
})

const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional().describe('Only present for mobile clients (?client=mobile)'),
  user: UserSchema,
  workspaceId: z.string().nullable(),
  workspaceName: z.string().nullable(),
})

const RefreshResponseSchema = z.object({ accessToken: z.string() })

// ── Taxonomy ──────────────────────────────────────────────────────────────────

const TransactionTypeSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  hidden: z.boolean(),
})

const TransactionGroupSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
})

const TransactionClassSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  groupId: z.string(),
  typeId: z.string(),
  group: TransactionGroupSchema,
  type: TransactionTypeSchema,
})

// ── Sources & files ───────────────────────────────────────────────────────────

const TransactionSourceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  type: z.string(),
  _count: z.object({ transactions: z.number() }),
})

const SourceCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('file'),
})

const SourceFileSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  dataHash: z.string(),
  createdAt: z.string(),
})

// ── Transaction analytics ─────────────────────────────────────────────────────

const SummaryRowSchema = z.object({
  period: z.string().describe('YYYY-MM'),
  group_name: z.string(),
  class_name: z.string(),
  total: z.string(),
  tx_count: z.number(),
})

const TotalResponseSchema = z.object({
  sum: z.string().describe('Total amount as fixed-2 decimal string'),
  count: z.number(),
})

// ── Internal ──────────────────────────────────────────────────────────────────

const ReclassifyBodySchema = z.object({
  workspaceId: z.string(),
  fromDate: z.string().optional().describe('ISO date string; defaults to 2000-01-01'),
})

const ReclassifyResultSchema = z.object({
  classified: z.number(),
  total: z.number(),
})

// ── Path params ───────────────────────────────────────────────────────────────

const IdPathParam = z.object({ id: z.string() })
const SourceFileIdPathParam = z.object({ sourceFileId: z.string() })

// ── Reusable header ───────────────────────────────────────────────────────────

const WorkspaceHeader = z.object({ 'x-workspace-id': z.string() })

const bearerSecurity = [{ bearerAuth: [] }]

// ─────────────────────────────────────────────────────────────────────────────

export function generateOpenApiDocument() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Beem API',
      version: '1.0.0',
      description: 'Personal Finance Tracker REST API',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        description: 'App server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths: {

      // ── Auth ─────────────────────────────────────────────────────────────

      '/api/v1/auth/token': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description:
            'Authenticates a user and returns an access token. Web clients receive the refresh token as an httpOnly cookie; pass `?client=mobile` to get it in the response body instead.',
          requestParams: {
            query: z.object({ client: z.enum(['mobile']).optional() }),
          },
          requestBody: {
            required: true,
            content: { 'application/json': { schema: LoginDto } },
          },
          responses: {
            '200': {
              description: 'Successful login',
              content: { 'application/json': { schema: TokenResponseSchema } },
            },
            '401': {
              description: 'Invalid credentials',
              content: { 'application/json': { schema: ErrorSchema } },
            },
          },
        },
      },

      '/api/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description:
            'Issues a new access token. Reads the refresh token from the `refreshToken` httpOnly cookie or from the request body.',
          requestBody: {
            content: {
              'application/json': {
                schema: z.object({ refreshToken: z.string().optional() }),
              },
            },
          },
          responses: {
            '200': {
              description: 'New access token',
              content: { 'application/json': { schema: RefreshResponseSchema } },
            },
            '401': {
              description: 'Missing or invalid refresh token',
              content: { 'application/json': { schema: ErrorSchema } },
            },
          },
        },
      },

      '/api/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          description: 'Invalidates the refresh token and clears the cookie.',
          requestBody: {
            content: {
              'application/json': {
                schema: z.object({ refreshToken: z.string().optional() }),
              },
            },
          },
          responses: {
            '200': {
              description: 'Logged out',
              content: { 'application/json': { schema: OkSchema } },
            },
          },
        },
      },

      // ── User ─────────────────────────────────────────────────────────────

      '/api/v1/me': {
        get: {
          tags: ['User'],
          summary: 'Get current user',
          security: bearerSecurity,
          responses: {
            '200': {
              description: 'Authenticated user profile',
              content: { 'application/json': { schema: UserSchema } },
            },
            '401': {
              description: 'Unauthorized',
              content: { 'application/json': { schema: ErrorSchema } },
            },
          },
        },
      },

      // ── Taxonomy ──────────────────────────────────────────────────────────

      '/api/v1/classes': {
        get: {
          tags: ['Taxonomy'],
          summary: 'List transaction classes',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: z.object({
              t_type: z.string().optional().describe('Filter by type name'),
              t_group: z.string().optional().describe('Filter by group name'),
            }),
          },
          responses: {
            '200': {
              description: 'List of transaction classes',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(TransactionClassSchema) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      '/api/v1/groups': {
        get: {
          tags: ['Taxonomy'],
          summary: 'List transaction groups',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: z.object({
              t_type: z.string().optional().describe('Filter by type name'),
            }),
          },
          responses: {
            '200': {
              description: 'List of transaction groups',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(TransactionGroupSchema) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      // ── Classifiers ───────────────────────────────────────────────────────

      '/api/v1/classifiers': {
        get: {
          tags: ['Classifiers'],
          summary: 'List classifier rules',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: z.object({
              classId: z.string().optional().describe('Filter by class ID'),
            }),
          },
          responses: {
            '200': {
              description: 'List of classifier rules',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(ClassifierRuleResponseDto) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
        post: {
          tags: ['Classifiers'],
          summary: 'Create classifier rule',
          security: bearerSecurity,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ClassifierRuleCreateDto } },
          },
          responses: {
            '201': {
              description: 'Created classifier rule',
              content: { 'application/json': { schema: ClassifierRuleResponseDto } },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      '/api/v1/classifiers/{id}': {
        patch: {
          tags: ['Classifiers'],
          summary: 'Update classifier rule',
          security: bearerSecurity,
          requestParams: { path: IdPathParam },
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ClassifierRuleUpdateDto } },
          },
          responses: {
            '200': {
              description: 'Updated classifier rule',
              content: { 'application/json': { schema: ClassifierRuleResponseDto } },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
        delete: {
          tags: ['Classifiers'],
          summary: 'Delete classifier rule',
          security: bearerSecurity,
          requestParams: { path: IdPathParam },
          responses: {
            '200': {
              description: 'Deleted',
              content: { 'application/json': { schema: OkSchema } },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      // ── Imports ───────────────────────────────────────────────────────────

      '/api/v1/imports': {
        post: {
          tags: ['Imports'],
          summary: 'Upload CSV file',
          description:
            'Uploads a bank-export CSV, inserts transactions, and runs classification. Requires maintainer role.',
          security: bearerSecurity,
          requestParams: { header: WorkspaceHeader },
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: z.object({
                  file: z.string().describe('CSV file (binary)'),
                }),
              },
            },
          },
          responses: {
            '201': {
              description: 'Import result',
              content: { 'application/json': { schema: ImportResultDto } },
            },
            '400': { description: 'No file / missing header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden (viewer role)', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
        get: {
          tags: ['Imports'],
          summary: 'List imported files',
          security: bearerSecurity,
          requestParams: { header: WorkspaceHeader },
          responses: {
            '200': {
              description: 'List of source files',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(SourceFileSchema) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      '/api/v1/imports/{sourceFileId}': {
        get: {
          tags: ['Imports'],
          summary: 'Get import file by ID',
          security: bearerSecurity,
          requestParams: { path: SourceFileIdPathParam },
          responses: {
            '200': {
              description: 'Source file record',
              content: { 'application/json': { schema: SourceFileSchema } },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      // ── Sources ───────────────────────────────────────────────────────────

      '/api/v1/sources': {
        get: {
          tags: ['Sources'],
          summary: 'List transaction sources',
          security: bearerSecurity,
          requestParams: { header: WorkspaceHeader },
          responses: {
            '200': {
              description: 'List of sources',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(TransactionSourceSchema) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
        post: {
          tags: ['Sources'],
          summary: 'Create transaction source',
          description: 'Requires maintainer role.',
          security: bearerSecurity,
          requestParams: { header: WorkspaceHeader },
          requestBody: {
            required: true,
            content: { 'application/json': { schema: SourceCreateSchema } },
          },
          responses: {
            '201': {
              description: 'Created source',
              content: { 'application/json': { schema: TransactionSourceSchema } },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden (viewer role)', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      // ── Transactions ──────────────────────────────────────────────────────

      '/api/v1/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'List transactions',
          description: 'Cursor-paginated list with optional date, taxonomy, value, and description filters.',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: TransactionListQueryDto,
          },
          responses: {
            '200': {
              description: 'Paginated transaction list',
              content: {
                'application/json': {
                  schema: z.object({
                    data: z.array(TransactionResponseDto),
                    nextCursor: z.string().optional(),
                  }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      '/api/v1/transactions/summary': {
        get: {
          tags: ['Transactions'],
          summary: 'Transaction summary by period',
          description:
            'Returns amounts grouped by period (month/week/year) and by group or class.',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: TransactionSummaryQueryDto,
          },
          responses: {
            '200': {
              description: 'Summary rows',
              content: {
                'application/json': {
                  schema: z.object({ data: z.array(SummaryRowSchema) }),
                },
              },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      '/api/v1/transactions/total': {
        get: {
          tags: ['Transactions'],
          summary: 'Transaction total',
          description:
            'Returns the sum and count of transactions for a given period, optionally filtered by type.',
          security: bearerSecurity,
          requestParams: {
            header: WorkspaceHeader,
            query: TransactionTotalQueryDto,
          },
          responses: {
            '200': {
              description: 'Total amount and count',
              content: { 'application/json': { schema: TotalResponseSchema } },
            },
            '400': { description: 'Missing X-Workspace-Id header', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

      // ── Internal ──────────────────────────────────────────────────────────

      '/api/v1/internal/reclassify': {
        post: {
          tags: ['Internal'],
          summary: 'Trigger reclassification',
          description:
            'Re-runs the classifier over all transactions from `fromDate` for the given workspace. Requires `X-Internal-Secret` header matching the `INTERNAL_JOB_SECRET` env variable.',
          requestParams: {
            header: z.object({ 'x-internal-secret': z.string() }),
          },
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ReclassifyBodySchema } },
          },
          responses: {
            '200': {
              description: 'Reclassification result',
              content: { 'application/json': { schema: ReclassifyResultSchema } },
            },
            '400': { description: 'Missing workspaceId', content: { 'application/json': { schema: ErrorSchema } } },
            '401': { description: 'Invalid internal secret', content: { 'application/json': { schema: ErrorSchema } } },
          },
        },
      },

    },
  })
}
