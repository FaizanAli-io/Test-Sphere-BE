# Backend Optimization Guidelines (NestJS)

This document provides **safe, step-by-step optimization rules** for Copilot to use while improving this NestJS backend **WITHOUT changing any functionality or API behavior**.

---

<!-- Optimization: Added a small Table of Contents and normalized heading levels (Rule: Code Organization Improvements). Safe because it only improves documentation structure/readability without affecting any code or behavior. -->

## Table of Contents

- [🚨 Golden Rules (MUST Follow)](#golden-rules-must-follow)
- [✅ Allowed Optimization Areas](#allowed-optimization-areas)
- [⛔ Forbidden Changes (NEVER allowed)](#forbidden-changes-never-allowed)
- [▶️ Copilot Working Procedure (Step-by-Step)](#copilot-working-procedure-step-by-step)

## 🚨 Golden Rules (MUST Follow)

1. **Never change functionality, logic, or API responses**.
2. **Never modify DTO shapes, database models, service logic, or external integrations**.
3. **All optimizations must be internal-only**, affecting:
   - performance
   - maintainability
   - structure
   - readability
   - stability

4. If applying an optimization risks changing behavior, **skip it**.
5. Every change Copilot makes must include a brief comment explaining the optimization.

---

## ✅ Allowed Optimization Areas

These changes are safe and welcomed.

<!-- Optimization: Normalize subsection heading levels under "Allowed Optimization Areas" from H2 to H3 (Rule: Code Organization Improvements). Safe because it maintains the same content while improving structural hierarchy. -->

### 1. **Code Organization Improvements**

- Split large services/controllers into smaller, focused files.
- Move helper functions to `utils/` or private service methods.
- Use consistent folder structures for modules and providers.

### 2. **Remove Redundant Code**

- Unused imports
- Duplicate type definitions
- Repeated helper logic (factor out to shared utils)

### 3. **Performance Improvements**

- Convert unnecessary `async` functions into sync.
- Avoid unnecessary `await` on non-promises.
- Remove deep cloning when not required.
- Use more efficient loop/array patterns where safe.

### 4. **Database Query Optimizations (No logic changes)**

- Add Prisma `select` to reduce returned data.
- Use Prisma `include` instead of manual population loops.
- Avoid N+1 queries when refactoring does NOT change logic.
- Ensure indexes exist (but don't change schema shape).

### 5. **Error Handling & Stability**

- Replace generic errors with Nest exceptions where appropriate.
- Ensure every async function has proper error propagation.
- Add guards against undefined/null where necessary.

### 6. **Dependency Injection Improvements**

- Remove unnecessary constructor injections.
- Convert non-shared services to `scope: TRANSIENT` if beneficial.
- Ensure provider arrays and module imports are minimal and clean.

### 7. **Logging Improvements**

- Wrap debug logs with environment checks.
- Replace `console.log` with Nest Logger.
- Remove noisy production logs.

### 8. **DTO & Type Improvements (No functional changes)**

- Add input validation decorators where missing.
- Simplify DTO shapes using mapped types when safe.
- Extract repeated DTO fields into shared base classes.

### 9. **Middleware, Guards, and Pipes Optimizations**

- Move heavy logic out of guards into services.
- Remove unused or duplicate global pipes.
- Simplify custom pipes if possible.

### 10. **Testing Improvements (No behavior changes)**

- Convert integration tests to use shared factories.
- Reduce test duplication.
- Use consistent testing utilities.

---

## ⛔ Forbidden Changes (NEVER allowed)

### ❌ Do NOT:

- Change API response formats (DTO → client contracts).
- Rename or remove existing API routes.
- Change request validation behavior.
- Modify business logic / calculations.
- Remove security checks or guards.
- Reorder middleware that affects behavior.
- Change the database schema except index additions.

If unsure, **assume the change is forbidden**.

---

## ▶️ Copilot Working Procedure (Step-by-Step)

### **1. Read the file being edited.**

Identify places where safe optimizations apply.

### **2. Apply only changes guaranteed NOT to affect behavior.**

Follow each section in this file.

### **3. Add a small comment for each optimization explaining:**

- which rule it follows
- why it’s safe

### **4. Never bundle risky changes.**

Only small, incremental improvements.

### **5. If no safe optimizations exist → make no changes.**

<!-- Optimization: Minor grammar consistency: "welcomed" -> "welcome" in the Allowed section intro (Rule: Code Organization Improvements — readability). Safe because it does not alter meaning or any implementation guidance. -->
