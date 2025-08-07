1. Recognition Visibility Model

Decision: Implement four visibility levels: PUBLIC, PRIVATE, ANONYMOUS, DELETED

Assumptions:
Visibility is a core dimension of access filtering and must be enforceable at the database and application level
Anonymous messages should not expose sender metadata even in logs or subscriptions
Future analytics and trend analysis will need to include visibility dimensions



Technical Reasoning:
Stored as a visibility ENUM column to allow fast filtering and avoid string comparisons
sender_id is NULL for anonymous entries, and application logic prevents joining sender metadata
DELETED visibility replaces hard deletes, enabling audit-compliant soft deletion
Visibility checks are enforced consistently across GraphQL resolvers, subscriptions, and analytics services




2. Role-Based Access Control (RBAC)

Decision: Use hierarchical roles (EMPLOYEE < MANAGER < HR < ADMIN) with centralized access enforcement

Assumptions:
Different user roles require access to different data scopes and operations
Access must be enforced at the service/resolver level, not left to frontend filtering
In future, roles might be assigned dynamically (e.g., per-team), so logic must be reusable




Technical Reasoning:
Roles are defined as ENUMs in DB and translated into numeric hierarchy for easy >= comparison
RBAC logic is centralized in utility methods like canAccessTeamAnalytics() to avoid duplication
Prevents privilege escalation and ensures that GraphQL introspection or ID fuzzing cannot leak restricted data




3. Real-Time Delivery & Fallback Design

Decision: Implement WebSocket-based GraphQL subscriptions, backed by Redis Pub/Sub, with fallback to polling or batched fetches

Assumptions:
Clients may go offline or lose WebSocket connectivity mid-session
Delivery guarantees should be best-effort in MVP, not durable messaging
All subscription payloads must respect user-specific access control


Technical Reasoning:
Redis-based pub/sub allows stateless scaling and cross-instance messaging
Subscriptions are filtered per user before delivery to prevent overexposure
Fallback logic allows degraded UX (e.g., batch polling every 5–10 minutes) without losing functionality



4. Keyword Extraction for Analytics

Decision: Extract keywords from recognition messages at write-time and store as JSONB array

Assumptions:
Keyword analysis is required for dashboards and HR reports
Performance should favor fast querying, even if keyword accuracy is minimal for MVP
Messages are short-form and in English, so basic tokenization is acceptable



Technical Reasoning:
Using PostgreSQL jsonb_array_elements_text() enables indexed aggregation (e.g., top-N keywords)
Write-time extraction avoids repeated parsing during analytics queries
Provides foundation for future NLP improvements (e.g., topic modeling, sentiment analysis)




5. Database & Storage Model

Decision: Use PostgreSQL with UUID primary keys and ENUM for roles/visibility

Assumptions:
UUIDs are preferred for client-side caching and GraphQL compatibility
Joins between users, teams, and recognitions will be frequent and must be performant
Multi-tenant orgs may be added later, so referential integrity is important



Technical Reasoning:
UUIDs allow client-generated IDs and reduce collision risk in distributed systems
Proper indexing (created_at, sender_id, team_id) ensures scalable analytics
ENUMs ensure data integrity while preserving query performance (vs. text-based columns)



6. API Schema & GraphQL Modeling

Decision: Use a typed schema-first GraphQL design with strong field-level descriptions

Assumptions:
API clients (web, mobile) require different views of the same data — GraphQL enables that without over-fetching
Subscriptions must be decoupled from internal message structure


Technical Reasoning:
Clear GraphQL types help enforce access boundaries at field level
Input types like CreateRecognitionInput allow validation hooks and reduce ambiguity
GraphQL enums and scalars improve introspection, error messaging, and schema validation





### Conflicts
1. Real-Time Delivery vs. Offline Reliability
Conflict:
The system must deliver real-time notifications, yet users may be offline or intermittently connected.


Resolution:
Implement WebSocket-based GraphQL subscriptions for real-time delivery.
Introduce a fallback mechanism (e.g. polling every 10 minutes) to ensure eventual visibility when users reconnect.


Technical Design:
Uses Redis Pub/Sub for horizontally scalable, stateless message delivery.
Resolvers apply per-user filtering to enforce access control.
Ensures consistent UX without requiring persistent client connectivity.



2. Anonymous Recognition vs. Auditability
Conflict:
Anonymous recognition must protect sender identity, while still supporting audit and integrity requirements.



Resolution:
Store sender_id = NULL for anonymous entries.
Exclude sender metadata in all API responses and pub/sub events.
Internally log events (without identity) for auditing purposes.



Technical Design:
Resolvers and Redis payloads conditionally strip sender info based on visibility.
Audit logs retain timestamp, recipient, and visibility context to support trace analysis.




3. Role-Based Access vs. Schema Simplicity
Conflict:
Different roles (EMPLOYEE, MANAGER, HR, ADMIN) require varying data access, but duplicating schema per role is unsustainable.


Resolution:
Centralize role logic in utility functions (e.g. canAccessTeamAnalytics()).
Maintain a unified schema; data returned is dynamically scoped based on user role.


Technical Design:
Enforce role permissions at the resolver layer, not in the client or schema definition.
Avoids redundant queries while preserving strict access control boundaries.



4. Analytics Depth vs. Query Performance
Conflict:
Analytics features (keyword trends, team insights) must scale without compromising performance on large datasets.

Resolution:
Perform keyword extraction at write-time, storing preprocessed values in JSONB.
Use indexed fields and aggregate-friendly schemas for fast reads.



Technical Design:
Leverages PostgreSQL’s jsonb_array_elements_text() and filtered indexes.
Analytics services operate on structured, pre-aggregated fields, minimizing query load.



5. User Deletion vs. Data Retention
Conflict:
Users expect to delete recognitions, but the system must retain data for compliance and analytics.

Resolution:
Use soft deletion by setting visibility = 'DELETED'.
Filter deleted entries from all user-facing queries and dashboards.


Technical Design:
Standard queries exclude deleted records via WHERE visibility != 'DELETED'.
Admin/audit tools can optionally bypass this filter for compliance review.

