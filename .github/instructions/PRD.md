---
applyTo: '**/*.ts'
---

# Fingestor Platform - Technical Architecture Document

## Executive Summary

Fingestor is a comprehensive financial management Software-as-a-Service platform designed for small to medium businesses and individuals. The system provides multi-tenant financial tracking, business operations management, subscription billing, and automated customer engagement through email and WhatsApp channels. The platform follows a modular monolithic architecture pattern with clear separation of concerns across authentication, business logic, data access, and external integrations.

---

## 1. Overall System Architecture

### System Type and Philosophy

The platform implements a **modular monolithic architecture** with clear domain boundaries and layered responsibility separation. While housed in a single deployable unit, the system maintains logical separation between domains such as financial management, sales operations, inventory control, customer relationship management, and billing.

### Core Architectural Characteristics

**Multi-Tenancy Model**: The system implements company-based multi-tenancy where each user can manage multiple companies (business entities). All data is strictly isolated at the database level using Row Level Security policies that enforce read and write permissions based on company ownership and user authentication context.

**Backend-as-a-Service Integration**: The architecture leverages Supabase as the primary backend service provider, encompassing PostgreSQL database, authentication services, real-time subscriptions, and storage capabilities. This design decision externalizes infrastructure concerns while maintaining full control over business logic.

**Stateless Request Processing**: The application follows a stateless request-response model where each HTTP request carries complete authentication context through JSON Web Tokens. No server-side session state is maintained, enabling horizontal scalability and simplified deployment.

**Subscription-Based Access Control**: The platform implements a trial-first business model where new users receive a fifteen-day unrestricted trial period upon registration. After trial expiration, access to creation and modification operations requires an active subscription, while read operations remain available to encourage retention.

### Component Communication

**Client-to-Server**: External clients communicate with the backend exclusively through RESTful HTTP endpoints secured with bearer token authentication. All requests pass through CORS validation to ensure origin legitimacy.

**Server-to-Database**: The application establishes authenticated database connections using per-request user tokens, enabling Row Level Security enforcement at the database layer. Complex aggregations and reports leverage stored procedures to minimize network roundtrips and leverage database-level optimizations.

**Server-to-External Services**: External integrations follow adapter patterns where service-specific implementations are abstracted behind internal interfaces. Communication with payment processors, email delivery networks, and messaging platforms occurs through dedicated service classes that handle retry logic, error handling, and response normalization.

### Runtime Environment

The system executes on a Node.js runtime using TypeScript for type safety and development experience enhancement. The application compiles to CommonJS modules targeting modern JavaScript specifications. Deployment assumes a containerized or platform-service environment with environment variable injection for configuration.

---

## 2. Backend Architecture

### Technology Foundation

**Runtime and Language**: Node.js serves as the JavaScript runtime, with TypeScript providing compile-time type checking and enhanced IDE support. The strict TypeScript configuration enforces no implicit any types, unused variable detection, and complete return path verification.

**Web Framework**: Express.js provides the HTTP server framework, handling request routing, middleware execution, and response generation. The framework configuration includes CORS management, request size limiting, and trust proxy settings for deployment behind reverse proxies.

**Schema Validation**: Zod library validates request payloads and environment variables, providing runtime type safety guarantees that complement TypeScript's compile-time checks. Express-validator handles parameter sanitization and validation at the route level.

### Application Layering

The system implements a four-layer architecture ensuring clear separation of concerns:

**Layer One - Routes**: Route definitions map HTTP methods and paths to controller actions while applying authentication and authorization middleware. Routes are organized by business domain, with each domain maintaining its own route definition module. Middleware application follows a chain-of-responsibility pattern where authentication precedes subscription verification.

**Layer Two - Middleware**: Middleware functions intercept requests to perform cross-cutting concerns before reaching business logic. Authentication middleware validates JWT tokens and enriches requests with user identity context. Subscription middleware verifies trial status or active subscription before allowing mutating operations. Error handling middleware catches exceptions and formats consistent error responses.

**Layer Three - Controllers**: Controllers contain HTTP-specific logic including request parsing, response formatting, and status code determination. Controllers delegate business operations to service classes while handling request validation and error translation. Each controller corresponds to a business domain and exposes methods matching route definitions.

**Layer Four - Services**: Service classes encapsulate complex business operations that span multiple database tables or require external service coordination. Services are stateless and receive dependencies through constructor injection or method parameters. The recurring transaction service exemplifies this pattern by orchestrating transaction generation based on frequency rules.

### Request Processing Flow

An incoming request follows this processing pipeline:

First, Express routes the request based on HTTP method and path matching. CORS middleware validates the request origin against configured allowed origins.

Second, the request body parser converts JSON payloads into JavaScript objects. Raw body parsing applies selectively for webhook endpoints requiring signature verification.

Third, authentication middleware extracts the bearer token, validates it with the authentication service, and enriches the request object with user identity information including user identifier and email address.

Fourth, subscription middleware queries the database for active subscriptions or calculates trial eligibility based on account creation date. Requests to protected endpoints fail with payment-required status if neither condition is satisfied.

Fifth, route-specific middleware executes, potentially including input validation, rate limiting, or feature flags.

Sixth, the controller method executes, parsing request parameters, invoking services or database queries, and constructing response objects.

Finally, error handling middleware catches any exceptions, logs error details, and returns formatted error responses with appropriate status codes.

### Authentication and Authorization

**Authentication Strategy**: The system relies exclusively on JWT-based authentication provided by the Supabase Auth service. Users authenticate by providing email and password credentials to the authentication endpoint, which returns an access token and refresh token upon successful verification. Subsequent requests include the access token in the Authorization header using the Bearer scheme.

**Token Validation**: Authentication middleware validates tokens by calling the Supabase user verification endpoint with each request. This design prioritizes security over performance, ensuring immediate token revocation takes effect. A connection pooling strategy minimizes the performance impact by reusing authenticated database clients keyed by token value.

**Authorization Model**: Authorization follows a hierarchical model where users own companies, and companies own all business data. Database Row Level Security policies automatically filter queries to return only data belonging to companies the authenticated user owns. This approach eliminates manual authorization checks in application code while preventing cross-tenant data leakage.

**Administrative Access**: Certain operations like newsletter broadcasting require administrative privileges verified through role-based checks against user metadata stored in the authentication service.

### Error Handling Strategy

The platform implements centralized error handling through Express middleware that catches all exceptions propagating from route handlers. Error responses follow a consistent structure including an error type identifier and a message string.

In development environments, error messages include full exception details and stack traces. Production environments return generic error messages to avoid information disclosure while logging complete exception data for debugging.

Expected business errors like validation failures or resource not found conditions return appropriate HTTP status codes in the four-hundred range. Unexpected exceptions default to internal server error status.

### Validation and Security

**Input Validation**: All controller methods validate required parameters and data types before processing requests. Query parameters are validated for presence and type conformance. Request bodies undergo schema validation using Zod schemas that define expected shape, required fields, and value constraints.

**Data Sanitization**: HTML content submitted through newsletter features undergoes sanitization to remove potentially malicious scripts while preserving safe formatting tags. User-generated text is stored as-is but escaped during rendering in email templates.

**SQL Injection Prevention**: The system exclusively uses parameterized queries through the Supabase client library, which automatically escapes and quotes user input. No string concatenation occurs in query construction.

**Rate Limiting**: While not implemented in the current architecture, the design assumes deployment behind an API gateway or reverse proxy providing rate limiting capabilities.

**Content Security**: Email templates load no external resources and inline all styles to prevent tracking pixel injection and reduce dependency on external services during email rendering.

---

## 3. API and Endpoints

### API Design Philosophy

The platform exposes a RESTful HTTP API organized around business domain resources. Each domain maintains its own URL namespace under the api prefix. Endpoint design prioritizes predictability and consistency over strict REST purity.

### Resource Organization

endpoints group by major business domains:

- **Authentication Domain**: Handles user registration, login, password recovery, email confirmation, and session management
- **Company Domain**: Manages business entity creation, retrieval, updating, and deletion
- **Transaction Domain**: Processes financial income and expense records with support for filtering, pagination, and bulk operations
- **Category Domain**: Organizes transaction classification with support for custom color coding and iconography
- **Credit Card Domain**: Tracks credit card accounts, billing cycles, and statement generation
- **Sales Domain**: Manages point-of-sale transactions including item selection, payment processing, and installment plans
- **Customer Domain**: Maintains customer contact information, purchase history, and communication preferences
- **Product Domain**: Catalogs products and services with inventory tracking and pricing management
- **Budget Domain**: Creates quotations with conversion to sales and pipeline stage tracking
- **Inventory Domain**: Records stock movements, adjustments, and current quantity tracking
- **Payment Method Domain**: Configures accepted payment types with fee calculation and settlement timing
- **Cash Session Domain**: Controls point-of-sale session opening, closing, and reconciliation
- **Dashboard Domain**: Aggregates financial metrics, charts, and reports across time periods
- **Subscription Domain**: Processes subscription purchases, cancellations, and webhook notifications from payment processor
- **Notification Domain**: Retrieves user notification history with read status tracking
- **Newsletter Domain**: Broadcasts email campaigns to subscribed users with template rendering
- **Support Domain**: Submits support tickets for administrative review

### Request-Response Patterns

**Filtering and Searching**: List endpoints accept query parameters for filtering results by status, type, date ranges, and text search. Multiple filters combine with AND logic. Search parameters typically apply to name and description fields using case-insensitive partial matching.

**Pagination**: List endpoints support range-based pagination through from and to query parameters specifying zero-indexed result offsets. Responses include total count metadata when available to support client-side pagination controls.

**Sorting**: Resources return in default sort orders optimized for common use cases, typically descending by creation or transaction date. Custom sort orders are not exposed through query parameters but can be implemented in database views or stored procedures.

**Bulk Operations**: Select domains support bulk creation endpoints for importing multiple records in a single request, particularly for transaction import workflows. Bulk operations return aggregated success and error information.

**Nested Resources**: Some endpoints expose nested resource relationships through query expansion, where related entities are included in the response through join operations. The sales domain exemplifies this with product details and customer information embedded in sale responses.

### Standard Response Format

Successful responses return JSON objects with camelCase property names. Array responses wrap collections in a top-level array without additional envelope objects.

Error responses use a consistent structure with error type and message properties. The error type provides a machine-readable identifier while the message offers human-readable description.

### Status Code Conventions

The API uses standard HTTP status codes with specific semantics:

- Two hundred indicates successful request processing with response body containing requested data or confirmation
- Two hundred one signals successful resource creation with response body containing the new resource representation
- Four hundred indicates malformed requests, missing required parameters, or invalid data formats
- Four hundred one denotes authentication failure including missing, invalid, or expired tokens
- Four hundred two represents payment required, specifically when trial has expired and no active subscription exists
- Four hundred three signals authorization failure when the authenticated user lacks permission for the requested operation
- Four hundred four indicates the requested resource does not exist or the user lacks visibility
- Five hundred represents unexpected server errors with logged details for investigation

### Webhook Endpoints

The platform exposes webhook receivers for external service callbacks:

**Payment Processor Webhooks**: A dedicated endpoint receives subscription lifecycle events including successful payments, cancellations, and refunds. This endpoint uses raw body parsing to enable signature verification before processing events. Webhook processing is idempotent to handle duplicate event delivery.

**Messaging Service Webhooks**: A webhook endpoint receives delivery status updates, user responses, and system notifications from the WhatsApp messaging provider. Message processing follows conditional logic based on user engagement level and message timing.

---

## 4. Database and Data Modeling

### Database Technology

The system leverages PostgreSQL as its relational database management system through the Supabase platform. PostgreSQL provides ACID transaction guarantees, complex query optimization, stored procedure support, and rich data types including JSON, arrays, and timestamps with timezone awareness.

### Data Modeling Approach

**Entity Relationship Model**: The data model follows a normalized relational design with foreign key constraints enforcing referential integrity. Most entities include soft deletion support through deleted-at timestamp columns enabling data recovery and audit trails.

**Tenant Isolation**: Every business data table includes a company identifier foreign key establishing ownership. Some tables like user profiles and subscriptions belong directly to users rather than companies, supporting the user-owns-companies hierarchy.

**Temporal Tracking**: Standard audit columns capture creation and modification timestamps on all entities. Deleted entities retain their data with a deletion timestamp rather than being physically removed.

**Enumeration Handling**: Enumerated types like transaction types, payment statuses, and subscription states are stored as text columns with check constraints limiting values to defined sets. This approach balances flexibility with data integrity.

### Core Domain Models

**User and Profile**: The authentication service manages user accounts with email and password credentials. A profiles table extends user records with full name, phone number, WhatsApp opt-in status, newsletter subscription preferences, and account creation timestamp. The profile creation occurs automatically through database triggers when new users register.

**Company**: Business entities represent separate organizations managed by a user. Each company maintains a name, optional logo, and ownership tie to the creating user. Most business data links to companies rather than directly to users, enabling potential future multi-user company access.

**Transaction**: Financial records capture income and expense events with description, amount, transaction date, payment status, and optional payment date. Transactions link to categories for classification and optionally to credit cards for deferred payment tracking. Support for recurring patterns and installment plans adds complexity through related tables.

**Category**: Organization tags classify transactions as various income or expense types. Categories define display colors and icons for visual identification. The type field restricts categories to either income or expense classification, preventing misuse.

**Credit Card**: Payment instrument records track card names, identifying digits, billing cycle dates, credit limits, and company ownership. Credit card transactions generate separate invoice records for statement management.

**Recurring Transaction**: Template records define patterns for automatic transaction generation at specified intervals. Fields include start date, optional end date, frequency in days, and next generation date. A background job processes these templates daily to create concrete transaction records.

**Sale**: Point-of-sale records capture customer purchases with sale date, total amount, payment terms, and status tracking. Sales relate to customers and decompose into line items representing individual products or services sold with quantities and prices.

**Customer**: Contact records store customer names, email addresses, phone numbers, tax identifiers, and addresses. Customers link to sales and budgets for purchase history and pipeline tracking.

**Product and Service**: Catalog entries describe sellable items with names, descriptions, prices, cost basis, and current inventory quantities. Separate categorization allows filtering and reporting by product type.

**Budget**: Quotation records represent proposed sales with issue dates, expiration dates, pipeline stage tracking, and approval status. Budgets can be converted to actual sales upon customer acceptance.

**Payment Method**: Configuration records define accepted payment types with display names, fee percentages, settlement timing, and activation status. Sales and cash sessions reference payment methods for reconciliation.

**Cash Session**: Point-of-sale shift records track opening and closing balances, expected versus actual cash amounts, and discrepancies. Sessions link to sales created during the session period for reconciliation.

**Subscription**: Billing records track user subscriptions with Stripe customer and subscription identifiers, plan types, statuses, and renewal dates. Webhook events update subscription records to reflect payment processor state.

**Notification**: Alert records store user-specific messages with titles, content, read status, and creation timestamps. Notifications are created by background jobs for overdue transactions and upcoming due dates.

### Relationships and Ownership

The data model implements a clear ownership hierarchy:

- Users own profiles, subscriptions, and companies
- Companies own categories, credit cards, transactions, customers, products, sales, budgets, payment methods, cash sessions, and notifications
- Transactions optionally reference categories and credit cards
- Sales reference customers and decompose into items referencing products
- Budgets reference customers and decompose into items referencing products
- Recurring transactions generate regular transactions automatically

Foreign key constraints with cascade deletion ensure referential integrity. Deleting a company removes all associated business data, while deleting a category or credit card nullifies references in transactions rather than cascading deletion.

### Migrations and Schema Evolution

Database schema changes are managed through SQL migration files executed sequentially. The Supabase platform tracks applied migrations to prevent duplicate execution. Migration files include both structural changes and data transformations.

Row Level Security policies are defined alongside table creation and updated through migrations. These policies enforce multi-tenant isolation by filtering queries based on the authenticated user's company ownership.

Stored procedures and database functions are version controlled as migration artifacts, enabling complex business logic execution at the database layer for performance optimization.

### Data Consistency and Integrity

**Transaction Isolation**: Database transactions ensure atomic operations when multiple related records must be created or updated together. Sale creation exemplifies this pattern by wrapping item creation and inventory updates in a single transaction.

**Constraint Enforcement**: Check constraints validate enumerated values, positive amounts, and logical date ordering. Foreign key constraints prevent orphaned records. Unique constraints prevent duplicate entries where business rules demand singularity.

**Soft Deletion**: Most entities use timestamp-based soft deletion rather than physical removal. Queries filter out soft-deleted records by default, but recovery remains possible through administrative operations.

**Audit Trailing**: Timestamp columns capture creation and modification timing automatically through database triggers, providing complete temporal history without application-level logic.

---

## 5. Integrations and External Services

### Third-Party Service Integration

The platform integrates with external services for capabilities beyond core financial management:

**Payment Processing**: Stripe handles subscription billing, payment collection, and customer management. The integration uses Stripe Checkout for hosted payment page flows and webhooks for asynchronous subscription state updates.

**Email Delivery**: Resend provides transactional and marketing email delivery with batch sending support. The integration includes retry logic, delivery status tracking, and template rendering with dynamic content injection.

**Authentication Service**: Supabase Auth manages user registration, login, password recovery, email verification, and token lifecycle. The integration validates tokens on each request and uses service role keys for administrative operations.

**Database Platform**: Supabase provides managed PostgreSQL hosting, automatic backups, connection pooling, and real-time subscription capabilities. The integration uses connection strings with token-based authentication for row-level security enforcement.

**Message Platform**: WhatsApp Business API enables automated customer engagement messaging through a third-party provider. The integration sends messages based on user activity triggers and receives delivery status updates.

### Integration Abstraction

Each external service integration is encapsulated in a dedicated service class or module:

**Email Service**: Abstracts email composition, template rendering, batch sending, and retry logic. The service loads HTML templates from the file system, performs variable substitution, and calls the email provider API with proper error handling.

**Recurring Transaction Service**: Orchestrates automatic transaction generation based on frequency templates. The service calculates date progressions, determines transaction status based on due dates, and batches insertions for efficiency.

**Crypto Utilities**: Provides encryption and decryption for sensitive identifiers used in public URLs like unsubscribe tokens. The implementation uses industry-standard encryption algorithms with initialization vector randomization.

### Webhook Processing

External services notify the platform of state changes through HTTP callbacks:

**Payment Processor Webhooks**: Subscription lifecycle events trigger webhook calls containing event type and subscription details. The webhook handler verifies request signatures using shared secrets, extracts relevant data, and updates local subscription records. Handlers return success status immediately after validation to prevent timeout retries while queuing actual processing.

**Message Delivery Webhooks**: Status updates for sent messages arrive through webhook callbacks. The handler logs delivery confirmations and failure notifications but does not currently update local state.

### Background Jobs and Schedulers

The system implements several time-based automation processes:

**Recurring Transaction Generation**: A daily job at midnight processes all active recurring transaction templates, generating concrete transaction records for upcoming intervals. The job updates each template's next generation date to prevent duplicate creation.

**Trial Expiration Notification**: A daily job identifies users approaching trial expiration and sends reminder emails encouraging subscription purchase. The job filters users without existing subscriptions and calculates days remaining in the trial period.

**Daily Summary Email**: A daily job compiles upcoming transaction summaries for each active user and sends digest emails highlighting approaching due dates. The job aggregates transactions by company and formats them into readable email layouts.

**Notification Generation**: A periodic job scans for overdue and upcoming transactions, creating in-app notification records for affected users. The job prevents duplicate notifications by checking notification history before insertion.

**WhatsApp Engagement**: Multiple scheduled jobs send onboarding and retention messages to users based on registration date and activity level. Message selection follows conditional logic considering account creation timing, company setup status, and transaction history.

### Configuration and Secrets Management

External service credentials and API keys are injected through environment variables rather than hardcoded values. The application validates required variables on startup and fails loudly if essential configuration is missing.

Service URLs, API keys, webhook secrets, and feature flags all load from environment configuration, enabling different values across development, staging, and production environments without code changes.

Sensitive values like encryption keys and database passwords never appear in source code or version control. Deployment platforms provide secure methods for variable injection at runtime.

---

## 6. Configuration and Environment Management

### Environment Separation

The platform supports distinct configuration profiles for development, staging, and production environments. Environment detection relies on the NODE_ENV variable, which controls logging verbosity, error message detail, and background job activation.

**Development Environment**: Runs on local developer machines with hot-reload support for code changes. Database connections point to local or cloud development instances. External service integrations may use sandbox APIs or be mocked entirely. Background jobs are disabled to prevent unwanted side effects during development. Error messages include full stack traces and detailed debugging information.

**Production Environment**: Executes in cloud hosting environments with optimized runtime settings. Database connections use production credentials with connection pooling. All background jobs activate automatically on server startup. Error messages are sanitized to prevent information disclosure. Logging captures structured events for monitoring and alerting.

### Configuration Management

Application configuration loads from environment variables validated on startup. A missing critical variable causes immediate application failure with clear error messaging rather than defaulting to unsafe values.

**Database Configuration**: Connection strings for primary database access and administrative operations come from environment variables. Row-level security policies use per-request user tokens rather than connection-level credentials.

**API Keys**: Credentials for external services including payment processing, email delivery, and messaging platforms are injected as environment variables. The application checks for key presence during initialization and logs warnings if optional services are unconfigured.

**CORS Origins**: Allowed origin patterns for cross-origin requests come from configuration rather than hardcoded values, enabling different frontend domains across environments.

**Feature Controls**: Background job activation, email delivery, and optional feature flags read from environment variables, allowing behavior customization without code deployment.

### Secrets Management

Sensitive values like API keys, database passwords, and encryption keys never appear in application code or version control. Deployment platforms like Heroku, AWS, or Vercel provide secure mechanisms for secret storage and injection.

During development, a dotenv file loads variables from a local configuration file excluded from version control. An example configuration file with placeholder values serves as documentation for required variables.

Production deployments inject secrets through platform-specific mechanisms like environment variable configuration panels or secret manager integrations.

### Deployment Configuration

The application supports containerized deployment through Docker or direct deployment to Node.js platforms. The build process compiles TypeScript to JavaScript and packages dependencies.

Health check endpoints enable load balancers and orchestrators to verify application availability. The endpoint responds with success status and minimal payload, requiring no authentication.

Port configuration defaults to 3001 but accepts override through environment variables. The application binds to all network interfaces to support containerized deployments where localhost may differ from exposed interfaces.

---

## 7. Patterns, Conventions, and Best Practices

### Naming Conventions

**File Organization**: Source files use lowercase kebab-case naming with suffixes indicating purpose - routes files end in dot-routes, controllers end in dot-controller, services end in dot-service, and types end in dot-types.

**Class and Interface Names**: TypeScript classes and interfaces use PascalCase naming. Controllers, services, and type definitions follow noun-based naming indicating the entity or concept they represent.

**Function and Method Names**: Functions and methods use camelCase naming with verb-based names indicating the action performed - create, update, delete, get, fetch, send, process, validate.

**Variable Names**: Local variables use camelCase naming with descriptive names avoiding abbreviations. Constants use UPPERCASE_SNAKE_CASE when they represent configuration values or fixed sets.

**Database Naming**: Database tables use lowercase snake_case naming with pluralized nouns. Columns use snake_case matching. Foreign keys are named with the referenced table in singular form plus underscore-id.

### Module and Folder Conventions

**Domain Grouping**: Related functionality groups into folders by architectural layer - routes together, controllers together, services together, types together. This layered organization prioritizes architectural clarity over domain cohesion within folders.

**Single Responsibility**: Each module exports a single class or related set of functions. Controllers export one class per business domain. Services export focused functionality for specific capabilities.

**Barrel Exports**: Index files in folders re-export public interfaces from constituent modules, enabling cleaner imports and hiding internal implementation details.

**Dependency Direction**: Dependencies flow from routes toward controllers toward services toward database. No circular dependencies exist between layers. Shared utilities are dependency-free.

### Architectural Patterns

**Layered Architecture**: The system implements strict layering where routes depend on controllers, controllers depend on services, and services depend on database clients. No layer skipping occurs - routes never access services directly.

**Dependency Injection**: Services receive dependencies through constructor parameters or function arguments rather than importing and instantiating dependencies internally. This pattern enables testing with mock implementations.

**Request Context Passing**: Authentication information flows through request objects enriched by middleware rather than accessed from global state. Controllers and services receive user identity as parameters.

**Service Abstraction**: Complex operations spanning multiple database tables or requiring external service coordination are encapsulated in service classes. Controllers remain thin, delegating to services for non-trivial logic.

**Error Propagation**: Methods throw exceptions for error conditions rather than returning error indicators. Express error handlers catch exceptions from any layer and format appropriate responses.

### Reusability Strategies

**Shared Types**: TypeScript interfaces define request and response shapes, shared across routes, controllers, and tests. Type definitions are exported from dedicated type modules for reuse.

**Middleware Reuse**: Authentication, subscription verification, and error handling middleware are defined once and applied across multiple route groups. Middleware composition follows predictable patterns.

**Database Client Pooling**: Rather than creating new database clients for each request, a pooling mechanism reuses clients based on authentication token, reducing connection overhead while maintaining security isolation.

**Template Reuse**: Email templates are defined as HTML files with placeholder variable syntax. The email service loads templates once at startup and reuses them for all email sending operations.

### Code Quality Practices

**Type Safety**: Strict TypeScript configuration prevents implicit any types, requires complete return statements, and flags unused variables. All function parameters and return types are explicitly declared.

**Error Handling**: All database operations and external service calls are wrapped in try-catch blocks. Error logging includes contextual information for debugging while error responses omit sensitive details.

**Input Validation**: All controller methods validate required parameters before processing. Schema validation libraries verify complex object structures against defined shapes.

**Resource Cleanup**: Database transactions are committed or rolled back explicitly. Background jobs include error handling to prevent crashes from interrupting scheduled execution.

**Logging Standards**: Logging uses structured formats with consistent prefixes indicating the component and operation. Development logging is verbose while production logging focuses on errors and significant events.

---

## 8. System Philosophy and Design Principles

### Guiding Principles

**Trial-First Growth**: The platform embraces a generous trial period enabling users to experience full functionality before requiring payment. This philosophy manifests in fifteen-day unrestricted access for new registrations, with gradual feature limitation after expiration rather than complete lockout.

**Multi-Tenant from Day One**: The architecture assumes multiple companies per user and multiple users per system from its inception. All data access paths respect tenant boundaries through database-level security policies rather than application-level filtering.

**API-First Design**: The backend exposes complete functionality through HTTP APIs designed for programmatic access. No business logic exists exclusively in frontend code, enabling future mobile applications, integrations, or alternative user interfaces without backend changes.

**Fail Loudly in Development, Gracefully in Production**: Development environments surface detailed error information and fail immediately on configuration problems. Production environments log detailed errors internally while returning sanitized messages to clients, maintaining security without impeding debugging.

**Optimize for Correctness, Then Performance**: Initial implementations prioritize data integrity and correct business logic over performance optimization. Caching, indexing, and query optimization occur after validation of correct behavior through usage.

### Core Assumptions

**Scale Expectations**: The system is designed for thousands of users, tens of thousands of companies, and millions of transactions. This scale informs indexing strategies and pagination implementation but does not drive premature optimization for billion-record scenarios.

**User Technical Sophistication**: The system assumes users are business owners or individuals managing personal finances, not necessarily technical experts. Error messages use plain language, and defaults favor common use cases over exhaustive customization.

**Data Retention**: The platform assumes users want complete transaction history without automatic deletion. Soft deletion patterns preserve records indefinitely, and no automated archival or purging occurs.

**Internet Connectivity**: The system assumes reliable internet connectivity for all operations. No offline mode or client-side data persistence is implemented.

**Regional Considerations**: Currency formatting, date display, and language selection assume Portuguese Brazilian locale for the primary user base, though the codebase structure supports eventual internationalization.

### Trade-Offs Made

**Token Validation on Every Request vs. Local Caching**: The system validates authentication tokens with the authorization service on each request rather than caching validation results. This choice prioritizes security and immediate token revocation at the cost of additional network latency.

**Row-Level Security vs. Application Filtering**: Multi-tenant isolation relies on database Row Level Security policies rather than application-level query filtering. This approach reduces code complexity and prevents security bugs from developer oversight while requiring careful policy design and testing.

**Synchronous Webhook Processing vs. Queuing**: Webhook handlers validate signatures and update database records synchronously during the HTTP request rather than queuing for background processing. This simplicity trade-off accepts potential timeout scenarios in exchange for fewer moving parts.

**Scheduled Jobs in Application vs. External Scheduler**: Background automation runs within the application process using a scheduling library rather than external cron services. This reduces deployment complexity but requires the main application to remain running continuously.

**Email Templates as Files vs. Database Storage**: Email templates are stored as HTML files in the repository rather than editable through administrative interfaces. This approach enables version control and code review but requires deployments to update templates.

**Monolithic Deployment vs. Microservices**: The entire backend deploys as a single application rather than separate microservices per domain. This choice reduces operational complexity and deployment overhead while accepting that scaling requires scaling the entire application.

### Maintainability Strategies

**Consistent Patterns**: The same architectural patterns apply across all business domains - routes to controllers to services to database. New features follow established patterns rather than introducing novel structures.

**Documentation Through Types**: TypeScript interfaces serve as machine-verified documentation of request shapes, response structures, and business entity models. Type checking prevents outdated documentation.

**Migration-Based Schema Changes**: All database schema modifications occur through version-controlled migration files that can be reviewed, tested, and rolled back if necessary.

**Environment-Based Configuration**: No configuration values are hardcoded in application logic. All variable aspects load from environment variables, enabling behavior changes without code modifications.

**Automated Formatting and Linting**: Consistent code styling through automated tooling reduces cognitive load during code review and maintenance.

### Future Extensibility

The architecture anticipates several evolution paths:

**Mobile Applications**: The API-first design enables native mobile applications to leverage all backend functionality through the same endpoints serving web clients.

**Multi-User Companies**: While currently users own companies exclusively, the data model supports future addition of team member access through additional relationship tables without fundamental restructuring.

**Internationalization**: Language-specific content currently uses Portuguese but follows patterns enabling message extraction and translation without code rewrites.

**White-Label Deployments**: The multi-tenant architecture supports potential white-label scenarios where different frontend themes connect to the same backend infrastructure.

**Advanced Reporting**: The database layer's stored procedure approach enables sophisticated analytical queries to be added without modifying application code, as demonstrated by the income statement reporting functionality.

---

## Conclusion

This architecture document provides comprehensive technical context for understanding how the Fingestor financial management platform is constructed and operates. The modular monolithic design with clear layering, combined with Backend-as-a-Service integration for infrastructure concerns, creates a maintainable and extensible foundation for small business financial management.

The system's philosophy of trial-first access, multi-tenant isolation through database security policies, and API-first design positions it for growth while maintaining security and data integrity. Future development can extend existing patterns into new business domains or enhance current functionality without fundamental architectural changes.

Any engineer or AI system working with this codebase should now understand the separation between authentication, business logic, data access, and external integrations, as well as how requests flow through the layered architecture from HTTP endpoints to database operations and back.
