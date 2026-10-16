# ARuguer Reality – Codex Development Instructions

## 1. Project Overview

ARuguer Reality is a professional, mobile-first WebAR platform.

The application allows users to experience augmented reality directly in supported mobile web browsers without installing a native application.

The project must be secure, performant, maintainable, modular, and suitable for commercial production use.

Development is incremental. Do not assume that planned functionality has already been implemented.

## 2. Development Environment

The development environment is:

- Operating system: Windows with WSL2 Ubuntu
- IDE: Visual Studio Code
- Shell: Bash
- Project root: `/home/noha/projects/aruguer-webar`
- Repository: `https://github.com/kristovanoha/aruguer-webar`
- Production hosting: Vercel
- Database and storage: Supabase

All development commands must target Ubuntu WSL, not Windows PowerShell.

Keep source files inside the WSL filesystem.

Do not create additional application repositories or projects without explicit approval.

## 3. Technology Stack

Preferred technologies:

- Next.js with App Router
- React
- TypeScript with strict typing
- Tailwind CSS
- Three.js
- MindAR for image and face tracking
- model-viewer for 3D viewing and surface AR
- WebXR where supported
- Android Scene Viewer
- Apple AR Quick Look
- LocAR or another validated solution for location-based AR
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- Git and GitHub

Use stable, actively maintained versions.

Before introducing any new dependency, evaluate maintenance status, browser compatibility, bundle size, licensing, and necessity.

Prefer existing project dependencies over adding new libraries.

Do not install every planned AR library during initial project setup. Add dependencies when implementing their respective modules.

## 4. Architecture

Use a single Next.js application.

Separate these responsibilities:

- Pages and routing
- UI components
- Business logic
- AR engines
- API endpoints
- Database access
- Authentication
- File storage
- Shared TypeScript types

Preferred structure:

    src/
      app/
      components/
      features/
        ar/
          core/
          image-tracking/
          surface-tracking/
          location-tracking/
          face-tracking/
        properties/
      lib/
        supabase/
        storage/
      services/
      types/

    supabase/
      migrations/

    docs/
    tests/

Create directories only when they are needed.

Avoid unnecessary abstraction, complex design patterns, and premature optimization.

## 5. AR Module Design

Each AR mode must be independently implemented.

Supported planned modes:

1. Image Tracking
2. Surface AR
3. Location AR
4. Face Tracking

AR modules must not directly depend on each other's implementations.

Business data should be independent of the rendering technology.

Define shared interfaces where they provide a real architectural benefit.

Do not initialize multiple camera-based AR engines simultaneously.

Each AR module must properly release:

- Camera streams
- MediaStream tracks
- WebGL resources
- Event listeners
- Animation frames
- Tracking sessions

Use dynamic imports for browser-only AR dependencies.

Avoid importing browser-dependent libraries into Next.js server components.

## 6. Browser Compatibility

Primary targets:

- Android Chrome
- iOS Safari

Secondary targets:

- Desktop Chrome
- Desktop Edge
- Other modern browsers where practical

Never assume WebXR immersive AR support is available on iOS.

Use feature detection and appropriate platform-specific fallbacks.

Provide alternative content when AR cannot run.

Fallbacks may include:

- Interactive 3D viewer
- Static image
- Video
- Textual information

Handle denied camera permissions and unsupported devices gracefully.

Camera access requires appropriate browser permissions and a secure context, such as HTTPS or localhost.

Test AR functionality on physical mobile devices.

Do not claim browser compatibility without testing or documented evidence.

## 7. Performance

Mobile performance is a primary requirement.

Optimize:

- Initial JavaScript bundle size
- 3D model size
- Texture resolution
- Image loading
- Camera initialization
- Rendering performance
- Network requests
- Memory usage

Prefer lazy loading and dynamic imports.

Use GLB/glTF for web 3D models when appropriate.

Support USDZ assets when needed for Apple AR Quick Look.

Consider asset compression only when it is compatible with the selected AR viewer.

Do not load AR engines before users need them.

Avoid unnecessary client components.

## 8. Supabase and Database

Use Supabase PostgreSQL for persistent application data.

Use Supabase Auth for authentication.

Use Supabase Storage for uploaded files.

Use versioned SQL migrations for schema changes.

Enable Row Level Security on application tables exposed through Supabase APIs.

Apply least-privilege access rules.

Public users must not be able to modify protected data.

Do not use service-role credentials in client-side code.

Never perform destructive database operations without explicit user approval.

Do not modify the production database directly during development.

Use separate development and production environments where practical.

## 9. File Storage

Store uploaded assets in Supabase Storage:

- Property images
- Videos
- 3D models
- AR tracking targets

Do not commit user-uploaded content into Git.

Keep storage paths and metadata in the database.

Use appropriate MIME type and size validation.

Use direct or resumable uploads where appropriate.

Avoid routing large file uploads through Vercel Functions.

Document storage bucket names and security policies.

## 10. Security

Never expose secrets.

Never commit:

- `.env.local`
- Private API keys
- Database passwords
- Supabase secret or service-role keys
- Authentication tokens
- Private credentials

Only expose variables prefixed with `NEXT_PUBLIC_` when they are explicitly safe for browser use.

Validate inputs at trust boundaries.

Enforce authorization server-side and through database policies.

Never trust client-provided ownership or role information.

Use secure authentication and session handling.

Avoid logging passwords, tokens, or sensitive user data.

## 11. Git and GitHub

The main branch is `main`.

Use feature branches for new functionality:

- `feature/*`
- `fix/*`
- `refactor/*`

Use conventional commit messages:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `test:`
- `chore:`
- `perf:`

Before changing code, inspect the current Git status.

Do not overwrite or revert unrelated user changes.

Do not create commits, push branches, merge pull requests, or delete branches unless explicitly requested.

Do not use destructive Git commands without approval.

Do not commit generated build artifacts, dependencies, or secret files.

## 12. Vercel Deployment

Use Vercel for hosting.

Deploy production from `main`.

Use Preview deployments for pull requests and feature testing.

Separate environment variables for Development, Preview, and Production.

Do not assume Preview deployments have access to production secrets.

Keep serverless function limitations in mind.

Avoid unnecessary custom servers and long-running backend processes.

Prefer standard Next.js deployment functionality.

Do not trigger production deployments or modify production environment settings without explicit approval.

## 13. Code Quality

Use TypeScript strict mode.

Avoid `any` unless justified.

Use clear English names for variables, functions, classes, components, and files.

Write code comments in English.

Keep components and functions focused.

Prefer readable code over clever abstractions.

Avoid duplicated business logic.

Use appropriate error handling and loading states.

Use accessible, responsive UI components.

Do not rewrite working code without a clear reason.

Do not remove existing features unless explicitly requested.

## 14. Testing and Validation

Before considering implementation complete, run relevant available checks.

Typical checks:

    npm run lint
    npx tsc --noEmit
    npm run build

Run tests when tests are configured.

Do not assume a script exists without inspecting `package.json`.

If validation fails, explain the failure and fix issues introduced by the changes.

Do not modify unrelated code just to make a check pass.

For AR features, document which browser and device tests remain necessary.

## 15. Documentation

Maintain:

- `README.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md` when architecture documentation is introduced
- Database migration documentation
- Environment variable documentation

Document significant technical decisions.

Update documentation when behavior or architecture changes.

Avoid creating documentation files that duplicate existing information.

## 16. Codex Working Rules

Before implementing a task:

1. Understand the user's request.
2. Inspect the current project structure.
3. Inspect relevant existing files.
4. Check for uncommitted changes.
5. Identify dependencies and affected modules.
6. Propose an approach when the change is significant.

During implementation:

1. Prefer the smallest maintainable change.
2. Preserve existing behavior.
3. Follow established project conventions.
4. Avoid unnecessary dependencies.
5. Keep security and browser compatibility in mind.
6. Never assume planned functionality already exists.

After implementation:

1. Review modified files.
2. Run relevant checks.
3. Describe implemented changes.
4. List any outstanding issues.
5. Explain any required manual testing.

Never claim a command, build, deployment, or test succeeded unless its result was observed.

## 17. Communication Rules

Always communicate with the user in Czech.

Use English for:

- Source code
- Variable names
- Function names
- Component names
- File names
- Code comments
- Git commit messages

Explain technical decisions clearly.

When giving terminal commands, use Ubuntu Bash syntax.

Always specify relevant file paths.

For significant modifications, describe which files are created or changed.

Work step by step.

During project initialization, stop after important milestones and wait for user confirmation.

Do not perform additional major setup steps without approval.

If there are several valid approaches, recommend the best one for ARuguer Reality and explain its trade-offs.

## 18. Cost Awareness

Prioritize low operating costs.

Use free plans during development when appropriate.

Check current service limits and commercial-use restrictions before recommending deployment choices.

Warn about storage, bandwidth, function, and database limits.

Do not assume Vercel Hobby is suitable for commercial production use.

Avoid introducing paid services without discussing costs and obtaining approval.

## 19. Long-Term Goal

Build a professional WebAR platform that:

- Runs in mobile browsers
- Supports multiple AR technologies
- Provides centralized administration
- Supports secure asset uploads
- Uses a maintainable modular architecture
- Can evolve without major rewrites
- Is reliable in commercial production

Favor simplicity, security, compatibility, performance, and long-term maintainability.
