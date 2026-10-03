---
name: fullstack-api-architect
description: >-
  Use this skill when designing backend architectures, REST/GraphQL APIs, database models (PostgreSQL, Supabase, Prisma, Drizzle), server actions, authentication flows, and data validation.
---

# Fullstack & API Architect Skill

Step-by-step procedures for building secure, scalable backends and APIs.

## 1. Schema-First Validation with Zod
Always define schemas that serve as both runtime validators and TypeScript types:
```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

## 2. API Response Formatting Standard
Standardize all API route responses to avoid client parsing surprises:
```typescript
// Success response
return Response.json({
  success: true,
  data: result,
  meta: { timestamp: Date.now() },
});

// Error response
return Response.json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input parameters',
    details: error.flatten(),
  },
}, { status: 400 });
```

## 3. Database Modeling Best Practices
- **Primary Keys**: Use UUIDv7 or ULID for sortable, distributed identifiers.
- **Indexes**: Add indexes to foreign keys, search columns, and query filters.
- **Timestamps**: Ensure every table has `created_at` (default `now()`) and `updated_at`.
- **Soft Deletes**: Use `deleted_at IS NULL` for auditable user data.

## 4. Authentication & Authorization Checklist
- [ ] Store passwords using Argon2 or bcrypt with appropriate work factor.
- [ ] Enforce Role-Based Access Control (RBAC) at the middleware/handler layer before querying.
- [ ] Sanitize database queries using parameterized queries or type-safe ORMs (Prisma, Drizzle, Kysely).
