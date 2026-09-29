# SDLC + AMS AI Maturity Assessment Platform

## Implementation Plan & Change List

**Project:** Quiz / AI Maturity Assessment Website\
**Current deployment target:** Vercel + Supabase\
**Primary frameworks:** SDLC + AMS\
**AI report generation:** OpenAI GPT or Google Gemini\
**UI requirement:** Preserve the existing client-approved CSS/design

------------------------------------------------------------------------

# 1. Executive Objective

The existing application should be evolved from an SDLC-only quiz
application into a production-ready assessment platform supporting:

-   SDLC assessments
-   AMS assessments
-   deterministic maturity scoring
-   LLM-powered report analysis
-   reliable fallback analysis when the LLM is unavailable
-   Supabase PostgreSQL persistence
-   Vercel deployment
-   secure server-side AI API keys
-   scalable APIs
-   reusable question/report infrastructure
-   historical assessment/report storage

The existing visual design should remain substantially unchanged because
the client has already approved the current CSS and UI.

The implementation should therefore focus primarily on **architecture,
functionality, data model, AI integration, security, reliability and
scalability**, rather than a visual redesign.

------------------------------------------------------------------------

# 2. Current System Understanding

The current application already contains:

-   SDLC questionnaire functionality
-   SDLC maturity scoring
-   report/dashboard UI
-   backend API
-   PostgreSQL-style database schema
-   AI provider abstraction
-   OpenAI integration
-   Gemini integration
-   Ollama integration
-   Claude integration
-   rule-based fallback analysis
-   authentication/session logic
-   Vercel-compatible frontend/backend structure

The current report has two conceptually different parts:

## 2.1 Deterministic scoring

The numerical maturity score is calculated by application logic.

This should remain deterministic.

Example:

``` text
Question answers
       ↓
Question maturity levels
       ↓
Area averages
       ↓
Overall maturity score
       ↓
L0-L5 classification
```

The LLM should NOT be responsible for calculating the official numerical
score.

## 2.2 AI narrative analysis

The application can send assessment information to an AI provider to
generate:

-   process analysis
-   observations
-   recommendations
-   tools
-   techniques
-   improvement guidance

This is the part that should be upgraded to a production LLM such as
OpenAI GPT or Google Gemini.

------------------------------------------------------------------------

# 3. User-Requested Changes

## 3.1 Add AMS

The website must support both:

``` text
SDLC
AMS
```

They should exist inside the same website/application.

Do NOT create two completely separate applications.

Preferred structure:

``` text
                    Assessment Platform
                           |
                 +---------+---------+
                 |                   |
                SDLC                AMS
                 |                   |
           SDLC Questions       AMS Questions
                 |                   |
                 +---------+---------+
                           |
                    Common Engine
                           |
                 +---------+---------+
                 |                   |
              Scoring              AI
                 |                   |
                 +---------+---------+
                           |
                       Report
```

## 3.2 Preserve existing CSS

The client likes the current design.

Therefore:

-   do not redesign the dashboard
-   do not replace the existing color scheme
-   do not replace the existing cards unnecessarily
-   do not replace the current report layout unnecessarily
-   do not introduce a completely different component library
-   reuse existing buttons, cards, typography and spacing
-   add only the UI required to select/use SDLC and AMS

A small framework selector is preferred.

Example:

``` text
Assessment Type

[ SDLC ]   [ AMS ]
```

The exact placement should match the existing UI.

------------------------------------------------------------------------

# 4. AI Report Generation Changes

## 4.1 Production AI provider

Use one production provider as the default:

Option A: - OpenAI GPT API

Option B: - Google Gemini API

The code can retain provider abstraction so either provider can be
configured without changing the report engine.

## 4.2 API key security

Never expose AI API keys to the browser.

Correct architecture:

``` text
Browser
   |
   | POST report-analysis
   v
Vercel Server/API
   |
   | secret API key
   v
OpenAI / Gemini
```

API keys must exist only in Vercel server-side environment variables.

Examples:

``` text
OPENAI_API_KEY
GEMINI_API_KEY
```

Do NOT use public frontend environment variables for secret keys.

------------------------------------------------------------------------

# 5. Recommended AI Architecture

The report generation pipeline should be:

``` text
User Answers
     |
     v
Deterministic Scoring Engine
     |
     +---- Overall Score
     +---- Area Scores
     +---- Maturity Levels
     +---- Strengths
     +---- Gaps
     |
     v
Report Analysis Engine
     |
     v
OpenAI / Gemini
     |
     v
Structured JSON
     |
     v
Report Renderer
```

The AI should interpret the results, not invent the official score.

------------------------------------------------------------------------

# 6. Structured AI Output

The LLM should return structured JSON rather than arbitrary markdown
whenever possible.

Example:

``` json
{
  "executiveSummary": "Overall assessment summary...",
  "overallInterpretation": "The organization demonstrates...",
  "areas": {
    "Requirements": {
      "analysis": "...",
      "strengths": ["..."],
      "gaps": ["..."],
      "recommendations": ["..."],
      "tools": ["..."],
      "techniques": ["..."]
    },
    "Architecture": {
      "analysis": "...",
      "strengths": ["..."],
      "gaps": ["..."],
      "recommendations": ["..."],
      "tools": ["..."],
      "techniques": ["..."]
    }
  },
  "priorityActions": [
    "...",
    "...",
    "..."
  ]
}
```

The frontend can then render this consistently.

------------------------------------------------------------------------

# 7. LLM Failure Handling

The existing rule-based fallback should be retained.

Architecture:

``` text
                    AI Request
                       |
                +------+------+
                |             |
             Success        Failure
                |             |
                v             v
             LLM Report   Rule Engine
                |             |
                +------+------+
                       |
                    Final Report
```

The website should never become unusable just because the AI provider is
temporarily unavailable.

------------------------------------------------------------------------

# 8. Reduce Unnecessary AI Calls

The current implementation can make multiple LLM requests for different
areas.

For production, consider using one structured report-generation request
where practical.

Preferred:

``` text
One assessment
     ↓
One validated report-analysis request
     ↓
Structured JSON for all areas
```

This can reduce:

-   latency
-   API cost
-   rate-limit pressure
-   inconsistent wording between sections

If the final report becomes too large for one request, use a controlled
batch strategy rather than uncontrolled parallel calls.

------------------------------------------------------------------------

# 9. Prompt Versioning

Every generated report should record:

``` text
provider
model
prompt_version
generated_at
```

Example:

``` text
provider = openai
model = <production model>
prompt_version = v1.0
generated_at = timestamp
```

This makes reports auditable and reproducible.

------------------------------------------------------------------------

# 10. Database Changes

The data model should become framework-aware.

## 10.1 Questions

Add a framework field:

``` text
questions
---------
id
framework
area
sub_area
practice
type
question_text
...
```

Allowed values:

``` text
SDLC
AMS
```

This prevents the need for separate SDLC and AMS question tables.

------------------------------------------------------------------------

# 11. Assessment Table

Add framework:

``` text
assessments
-----------
id
user_id
framework
project_name
status
overall_score
created_at
updated_at
...
```

Example:

``` text
framework = SDLC
```

or:

``` text
framework = AMS
```

------------------------------------------------------------------------

# 12. Answers

For better scalability and analytics, consider a normalized answer
table:

``` text
assessment_answers
------------------
id
assessment_id
question_id
answer_value
maturity_level
created_at
```

JSONB can still be used for flexible metadata.

This makes it easier to answer future questions such as:

-   Which questions are most frequently weak?
-   Which AMS area has the lowest score?
-   How did this customer's score change over time?
-   Which maturity capabilities improved?

------------------------------------------------------------------------

# 13. Report Storage

Create/use a dedicated report table:

``` text
assessment_reports
------------------
id
assessment_id
provider
model
prompt_version
report_json
generation_status
created_at
updated_at
```

The complete generated report should be stored.

This means the user does not need to regenerate the AI report every time
they open an old assessment.

------------------------------------------------------------------------

# 14. IDs

The current random-string style IDs should be replaced or supplemented
with reliable UUIDs.

Prefer:

``` text
PostgreSQL UUID
```

or Supabase-generated UUIDs.

Avoid using simple `Math.random()` identifiers for production records.

------------------------------------------------------------------------

# 15. Supabase Architecture

Recommended production architecture:

``` text
                       Vercel
                         |
              +----------+----------+
              |                     |
           Next.js             Server/API
              |                     |
              +----------+----------+
                         |
                      Supabase
                         |
              +----------+----------+
              |                     |
          PostgreSQL              Auth
```

Optional:

``` text
Supabase Storage
```

for generated files/assets if required.

------------------------------------------------------------------------

# 16. Vercel Environment Variables

Production secrets should be configured in Vercel.

Typical variables:

``` text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
OPENAI_API_KEY
GEMINI_API_KEY
AI_PROVIDER
```

Only variables intended for browser use should receive a public/frontend
prefix.

Service-role and AI secrets must remain server-side.

------------------------------------------------------------------------

# 17. Authentication and Security

The current authentication implementation should be reviewed before
production.

Important changes:

-   remove any hardcoded fallback JWT secret
-   require a strong production secret
-   validate JWT expiration
-   validate request ownership
-   prevent one user from accessing another user's assessment
-   validate all API request bodies
-   validate framework values
-   validate question IDs
-   prevent unauthorized report retrieval
-   protect admin endpoints
-   add rate limiting to AI/report endpoints

If Supabase Auth is adopted, authentication can be consolidated around
Supabase's supported authentication system.

------------------------------------------------------------------------

# 18. API Security

Every backend endpoint should validate:

``` text
Authentication
Authorization
Input schema
Framework
Assessment ownership
Request size
```

For example:

``` text
POST /api/assessments
POST /api/assessments/:id/submit
POST /api/reports/:id/generate
GET  /api/reports/:id
```

The backend should never trust values supplied by the frontend.

------------------------------------------------------------------------

# 19. AI Cost and Rate Protection

AI APIs can become expensive if users repeatedly regenerate reports.

Implement:

-   one active report-generation job per assessment
-   report caching
-   regeneration controls
-   rate limiting
-   maximum request size
-   timeout handling
-   retry policy
-   provider error logging

Example:

``` text
Assessment submitted
        |
        v
Report exists?
   |            |
  Yes           No
   |             |
Return cached   Generate
report          report
```

------------------------------------------------------------------------

# 20. Report Generation Status

Instead of making the user wait without feedback, track:

``` text
pending
generating
completed
failed
fallback
```

The UI can display:

``` text
Generating your AI report...
```

and then:

``` text
Report ready
```

For longer reports, a background job/async pattern should be considered.

------------------------------------------------------------------------

# 21. SDLC and AMS Shared Engine

The scoring/report system should be generic.

Example conceptual API:

``` text
generateAssessmentReport(
    framework,
    answers,
    scoringResult
)
```

The framework determines:

``` text
questions
areas
maturity definitions
scoring rules
prompt context
report sections
```

This allows:

``` text
SDLC → shared engine
AMS  → shared engine
```

without duplicating code.

------------------------------------------------------------------------

# 22. Framework Configuration

Instead of hardcoding framework behavior throughout the application, use
configuration.

Example:

``` javascript
frameworkConfig = {
  SDLC: {
    areas: [...],
    maturityLevels: [...],
    reportSections: [...]
  },

  AMS: {
    areas: [...],
    maturityLevels: [...],
    reportSections: [...]
  }
}
```

This will make future frameworks easier to add.

------------------------------------------------------------------------

# 23. AMS Question Bank

The AMS question bank still needs to be supplied.

Required AMS information:

1.  AMS areas
2.  AMS questions
3.  Answer options
4.  Maturity levels
5.  Scoring rules
6.  Area definitions
7.  Recommended tools
8.  Recommended techniques
9.  Any client-specific terminology
10. Expected report format

Once supplied, it can be inserted into the common framework structure.

------------------------------------------------------------------------

# 24. Existing UI Preservation

Do NOT make unnecessary visual changes.

Keep:

-   current page structure
-   current colors
-   current typography
-   current cards
-   current navigation
-   current report visualizations
-   current buttons
-   current spacing
-   current dashboard appearance

Only add:

``` text
Framework selector
SDLC / AMS indicator
AMS-specific questionnaire content
AMS-specific report content
```

where necessary.

------------------------------------------------------------------------

# 25. Scalability Improvements

The production system should support growth in:

-   number of users
-   number of assessments
-   number of questions
-   number of reports
-   AI requests

Important practices:

### Database

-   indexes on foreign keys
-   indexes on framework
-   indexes on created_at
-   indexes on assessment_id
-   indexes on user_id
-   proper constraints
-   pagination

### API

-   stateless APIs
-   request validation
-   rate limiting
-   timeouts
-   structured errors

### Frontend

-   lazy loading where useful
-   avoid unnecessary API requests
-   cache assessment/report data
-   pagination for historical reports

### AI

-   caching
-   retries
-   rate limits
-   provider fallback
-   structured output
-   prompt versioning

------------------------------------------------------------------------

# 26. Recommended API Structure

A clean target structure:

``` text
/api
  /auth
  /frameworks
  /questions
  /assessments
  /reports
  /admin
```

Example:

``` text
GET  /api/frameworks
GET  /api/frameworks/SDLC/questions
GET  /api/frameworks/AMS/questions

POST /api/assessments
POST /api/assessments/:id/submit

GET  /api/assessments/:id
GET  /api/assessments/:id/report

POST /api/assessments/:id/report/generate
```

------------------------------------------------------------------------

# 27. Error Handling

All APIs should return consistent errors.

Example:

``` json
{
  "success": false,
  "error": {
    "code": "REPORT_GENERATION_FAILED",
    "message": "Unable to generate the AI report."
  }
}
```

Do not expose:

-   API keys
-   database credentials
-   stack traces
-   internal provider errors

to the browser.

------------------------------------------------------------------------

# 28. Logging and Monitoring

Production logs should capture:

``` text
request_id
user_id
assessment_id
framework
endpoint
duration
AI provider
AI model
generation status
error code
```

Do not log sensitive user answers unnecessarily.

Useful monitoring:

-   API error rate
-   report generation failure rate
-   AI latency
-   AI token/cost usage
-   database errors
-   authentication failures

------------------------------------------------------------------------

# 29. Report Quality Controls

The LLM output should be validated before displaying it.

Validate:

-   required fields exist
-   arrays are actually arrays
-   strings are within reasonable length
-   no malformed JSON
-   no missing area
-   no unsupported framework
-   no unexpected report sections

If validation fails:

``` text
LLM output invalid
      ↓
retry once
      ↓
still invalid?
      ↓
rule-based fallback
```

------------------------------------------------------------------------

# 30. Recommended Final Architecture

``` text
                         CLIENT
                           |
                           v
                    Vercel / Next.js
                           |
              +------------+------------+
              |                         |
              v                         v
       Assessment APIs             Report APIs
              |                         |
              +------------+------------+
                           |
                           v
                     Supabase
                           |
             +-------------+-------------+
             |             |             |
          Questions     Assessments    Reports
             |             |             |
             +-------------+-------------+
                           |
                           v
                    Scoring Engine
                           |
                           v
                   AI Report Engine
                           |
              +------------+------------+
              |                         |
           OpenAI                    Gemini
              |                         |
              +------------+------------+
                           |
                           v
                  Structured Report
                           |
                           v
                    Report UI / PDF
```

------------------------------------------------------------------------

# 31. Implementation Phases

## Phase 1 --- Codebase cleanup

-   inspect existing frontend/backend
-   identify duplicated logic
-   centralize framework configuration
-   centralize scoring
-   centralize report generation
-   remove hardcoded production secrets
-   introduce proper environment configuration

## Phase 2 --- Database migration

-   add framework to questions
-   add framework to assessments
-   create/upgrade answer storage
-   create report table
-   add UUIDs
-   add indexes
-   add constraints

## Phase 3 --- SDLC refactor

-   move existing SDLC questions into framework-aware structure
-   verify existing scoring
-   verify existing report output
-   ensure no regression in current SDLC behavior

## Phase 4 --- AMS integration

-   receive AMS question bank
-   add AMS framework configuration
-   add AMS questions
-   implement AMS scoring
-   implement AMS report context
-   verify AMS report

## Phase 5 --- UI

-   add SDLC/AMS selector
-   reuse existing CSS
-   add AMS question rendering
-   add AMS report rendering
-   preserve existing SDLC appearance

## Phase 6 --- Production AI

-   select OpenAI or Gemini
-   configure server-side API key
-   implement structured output
-   add prompt versioning
-   add validation
-   add retries
-   retain fallback engine

## Phase 7 --- Security

-   authentication review
-   authorization checks
-   remove hardcoded secrets
-   API input validation
-   rate limiting
-   report ownership checks
-   admin protection

## Phase 8 --- Scalability

-   Supabase optimization
-   database indexes
-   caching
-   pagination
-   AI report caching
-   generation status
-   monitoring/logging

## Phase 9 --- Testing

Test:

``` text
SDLC questionnaire
SDLC scoring
SDLC report
AMS questionnaire
AMS scoring
AMS report
AI success
AI failure
fallback report
invalid AI response
duplicate submission
unauthorized report access
large questionnaire
concurrent users
mobile UI
Vercel deployment
Supabase connection
```

------------------------------------------------------------------------

# 32. Acceptance Criteria

The implementation is complete when:

### Frameworks

-   [ ] SDLC works
-   [ ] AMS works
-   [ ] Both are available from one website
-   [ ] Framework is stored with every assessment

### UI

-   [ ] Existing SDLC design remains substantially unchanged
-   [ ] Client-approved CSS is preserved
-   [ ] AMS uses the same visual language

### Scoring

-   [ ] Score is deterministic
-   [ ] Score is reproducible
-   [ ] LLM cannot change the official numerical score

### AI

-   [ ] GPT or Gemini generates narrative analysis
-   [ ] API key is server-side only
-   [ ] Structured output is validated
-   [ ] AI failure has fallback
-   [ ] Reports store provider/model/prompt version

### Database

-   [ ] Supabase PostgreSQL is used
-   [ ] UUIDs are used
-   [ ] Framework is stored
-   [ ] Reports are persisted
-   [ ] Indexes are added
-   [ ] Historical reports can be retrieved

### Security

-   [ ] No hardcoded production secrets
-   [ ] Authentication is validated
-   [ ] Authorization is enforced
-   [ ] API inputs are validated
-   [ ] AI endpoint is rate limited

### Scalability

-   [ ] APIs are stateless
-   [ ] Reports are cached
-   [ ] Database queries are indexed
-   [ ] Large lists are paginated
-   [ ] AI failures/timeouts are handled

### Deployment

-   [ ] Vercel deployment succeeds
-   [ ] Supabase production database works
-   [ ] Environment variables are configured
-   [ ] Production AI provider works
-   [ ] Monitoring/logging is available

------------------------------------------------------------------------

# 33. Priority Classification

## P0 --- Must do before client production

1.  SDLC + AMS framework support
2.  Preserve current CSS/UI
3.  Supabase database integration
4.  Production GPT/Gemini integration
5.  Server-side API keys
6.  Deterministic scoring
7.  Report persistence
8.  Authentication/authorization review
9.  Remove hardcoded secrets
10. API validation
11. AI failure fallback

## P1 --- Strongly recommended

1.  Structured LLM JSON
2.  Prompt versioning
3.  UUIDs
4.  Database indexes
5.  AI rate limiting
6.  Report caching
7.  Generation status
8.  Consistent API errors
9.  Logging/monitoring
10. Automated testing

## P2 --- Future improvements

1.  Advanced analytics
2.  Assessment history comparison
3.  Organization-level dashboards
4.  Export improvements
5.  More AI providers
6.  Additional assessment frameworks
7.  Background report-generation jobs
8.  Advanced admin controls

------------------------------------------------------------------------

# 34. Final Target

The final product should not simply be:

``` text
SDLC Quiz Website + AMS Quiz Website
```

It should become:

``` text
              AI MATURITY ASSESSMENT PLATFORM

                    +-------------+
                    | Framework   |
                    | Selection   |
                    +------+------+
                           |
                 +---------+---------+
                 |                   |
                SDLC                AMS
                 |                   |
                 +---------+---------+
                           |
                    Common Engine
                           |
              +------------+------------+
              |                         |
        Deterministic               AI Analysis
          Scoring                 GPT / Gemini
              |                         |
              +------------+------------+
                           |
                     Final Report
                           |
                     Supabase DB
                           |
                       Vercel
```

The key architectural principle is:

> **One platform, multiple frameworks, one reusable assessment engine,
> deterministic scoring, AI-powered interpretation, and a shared report
> system.**

The AMS-specific questions and maturity model should be plugged into
this architecture once the client provides them.
