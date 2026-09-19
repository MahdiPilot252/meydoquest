# meydoQuest Architecture Foundation

## 1. Research Summary

### What modern platforms solve well

- **Anki / FSRS / Mochi / RemNote**: efficient review scheduling, low-friction capture, item-level memory modeling.
- **Quizlet / Knowt / Brainscape / Memrise**: multimode practice, approachable onboarding, broad content import.
- **Duolingo / Babbel / Busuu / Lingvist / Clozemaster**: streak loops, session design, adaptive drill selection, language-specific data richness.
- **Khan Academy / Brilliant / IXL**: skill trees, mastery progression, prerequisite mapping, subject-wide learning paths.
- **Google Classroom / Moodle / Canvas**: teacher workflows, assignment distribution, grading, roster and role management.
- **Kahoot / Quizizz / Gimkit / Blooket / Socrative**: live classroom energy, code-based join flows, instant feedback, classroom analytics.
- **Codecademy / LeetCode / Exercism / Codewars**: exercise engines specialized by domain, server-side result validation, progression loops.

### Cross-product lessons adopted in meydoQuest

1. **Learning should be skill-centric, not card-centric.**
2. **Content creation, practice, review, analytics, and classroom workflows must share one domain model.**
3. **Teacher and organization workflows require first-class permissions and auditability.**
4. **Live learning should use join-code ergonomics with server authority.**
5. **Spaced repetition should be an engine attached to learning evidence, not a separate app mode.**
6. **Gamification must reward learning evidence, not client-side clicks.**
7. **Accessibility, privacy, and tenant isolation must be architecture-level concerns.**

## 2. Product Definition

meydoQuest is a **Universal Learning OS**.

It supports:
- self-paced personal learning
- classroom and group learning
- teacher-managed assignments
- skill-based practice
- adaptive review
- gamified progression
- a future path to live multiplayer, AI tutoring, OCR, and institutional administration

meydoQuest is explicitly **not** limited to vocabulary. Vocabulary is only one specialization of the more general model:

`Content -> Skill -> Exercise -> Attempt -> Learning Event -> Review State -> Mastery -> Recommendation`

## 3. Architecture Decision Record

### Chosen architecture
- **Frontend + backend**: Next.js App Router with server components, route handlers, and server-side rendering.
- **Database**: PostgreSQL via Drizzle ORM.
- **Auth**: email/password accounts with server-issued session tokens stored in PostgreSQL and sent as httpOnly cookies.
- **Authorization**: RBAC over memberships with organization and group scope; all critical mutations validated on the server.
- **Learning engine**: event-driven core with universal exercises and validator plugins.
- **SRS**: Meydo Scheduler v1, a DSR-inspired scheduling model with stability, difficulty, retrievability target, and confidence-aware updates.
- **Gamification**: ledger-based XP and coin accounting, never client-authoritative.
- **Analytics**: derived from persisted learning events and attempts.

### Why this architecture
- Keeps the initial system cohesive in one deployable codebase.
- Avoids premature microservices while remaining modular.
- Uses relational integrity for permissions, assignments, attempts, and analytics.
- Supports long-term evolution into Redis/WebSocket/background jobs without redoing the domain model.

## 4. Domain Model

### Core objects
- **User**: identity, profile, streaks, preferences
- **Session**: authenticated browser session
- **Organization**: school/company/community root container
- **Group**: class/course/team/community cohort
- **Membership**: role binding between user and org/group
- **Subject**: broad academic domain
- **Skill**: graphable capability with prerequisites
- **Content Collection**: reusable set/course/unit/deck/module
- **Learning Item**: atomic knowledge or concept entity
- **Exercise**: renderable/gradable interaction referencing a learning item and optionally a skill
- **Assignment**: teacher-distributed learning package for a group
- **Learning Session**: one learner’s execution session across a collection/assignment
- **Attempt**: answer submission for an exercise
- **Review State**: per-user per-item spaced repetition state
- **Mastery**: per-user per-skill derived progress state
- **Learning Event**: immutable event log for analytics and adaptation
- **Ledger Entry**: authoritative XP/coin transaction
- **Achievement**: milestone definition and unlock record
- **Invite Code**: controlled join flow for groups

## 5. Data Model Principles

### Modeling choices
- Normalize tenant, membership, content, session, and assignment boundaries.
- Use enums where workflow states are stable.
- Use JSONB only where extensibility is required:
  - exercise content blocks
  - validator config
  - analytics metadata
  - AI/provider outputs in later phases
- Persist both **transactional truth** and **derived state**:
  - truth: attempts, events, ledger entries
  - derived: profile totals, review state, mastery snapshots

## 6. Security / Permission Architecture

### Server authority rules
The client never decides:
- membership privileges
- assignment visibility
- grading results
- XP/coin awards
- mastery transitions
- review scheduling

### Isolation model
- Users can only access private data they own or data exposed by shared group/org membership.
- Teacher actions are scoped to groups they administer.
- Student access to assignments is validated through membership joins, not URL knowledge.
- Session tokens are random, opaque, stored hashed, and expire server-side.

### Minimum controls implemented in this foundation
- password hashing using Node crypto scrypt
- httpOnly secure cookie sessions
- input validation in route handlers
- membership-based authorization helpers
- anti-IDOR query patterns
- audit-ready event logging

## 7. Event Model

### Persisted learning events
- `session_started`
- `session_finished`
- `exercise_started`
- `answer_submitted`
- `answer_correct`
- `answer_wrong`
- `review_scheduled`
- `mastery_updated`
- `assignment_created`
- `assignment_completed`
- `group_created`
- `group_joined`
- `achievement_unlocked`
- `xp_awarded`
- `coin_awarded`

These events power analytics, recommendations, and future external xAPI/LRS export.

## 8. Learning Engine Architecture

### Universal learning pipeline
1. Teacher or learner creates subject/skill/content.
2. Content contains items; items map to skills.
3. Exercises reference items and use a validator plugin.
4. Learner starts a learning session.
5. Server validates attempts.
6. Attempt emits learning events.
7. Review state and mastery update.
8. XP/coins are written to ledger.
9. Dashboard analytics query derived and raw evidence.

### Validator abstraction
Current validator families:
- exact
- normalized text
- multiple valid answers
- single choice
- multiple select
- true/false
- numeric with tolerance

This keeps new validators additive instead of schema-breaking.

## 9. Classroom / Group Architecture

- Organizations are optional tenant roots.
- Groups are the primary operational unit for classrooms/courses/study groups.
- Invite codes carry role + target group.
- Assignments are published to groups.
- Teacher analytics aggregate by group and by assignment.

## 10. Gamification Architecture

- Ledger-based accounting for XP and coins.
- Profile caches current totals for fast UI.
- Streaks update from real daily learning evidence.
- Achievements are unlocked from server-checked conditions.
- Cosmetics/shop/battle pass are future modules that can reuse the same ledger and unlock patterns.

## 11. Realtime / Multiplayer Architecture

Not fully implemented in this foundation.

Planned path:
- add WebSocket or managed realtime transport
- use server-authoritative match/session state tables
- emit scoreboard and presence updates from server
- keep grading/points server-side

## 12. AI Architecture

Not fully implemented in this foundation.

Planned path:
- provider abstraction interface (`generateText`, `generateStructured`, `embed`, `transcribe`)
- server-only API routes
- usage quotas and audit logs
- teacher review workflow for AI-generated learning content

## 13. Analytics Architecture

- Transactional records remain the source of truth.
- Dashboards query attempts, events, mastery, review states, and assignments.
- Future path: append-only event stream or xAPI/LRS export without replacing the current schema.

## 14. Repository Structure

- `src/app/*`: routes, pages, route handlers
- `src/db/*`: database connection and schema
- `src/lib/auth/*`: auth, sessions, permission helpers
- `src/lib/learning/*`: validators, mastery, review scheduling, analytics
- `src/lib/data/*`: dashboard and domain queries
- `src/components/*`: reusable UI
- `docs/*`: architecture, manifest, future ADRs

## 15. Implementation Roadmap

### Phase implemented in this build
- foundation architecture docs
- real PostgreSQL schema
- real account registration/login/logout
- profile and streak state
- subject/skill/content/exercise model
- learning session engine with persisted attempts
- review scheduling + mastery snapshots
- teacher group creation and invite codes
- assignment creation and completion
- student dashboard analytics
- XP/coins ledger with achievement unlocks

### Next phases after this build
- richer exercise types (audio, image hotspot, coding runner)
- exams and manual grading workflows
- organization admin panel
- chat/realtime/live classroom
- AI tutor + teacher assistant provider layer
- OCR, speech, storage, moderation, support, feature flags, deep analytics

## 16. Scope reality

This codebase implements a **real, working foundation** for meydoQuest.
It does **not** claim completion of all future modules such as live duels, OCR, speech recognition, premium battle pass, or institutional SIS/LTI integration.
Those are intentionally left for later phases without compromising the current architecture.
