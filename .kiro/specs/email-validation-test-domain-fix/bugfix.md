# Bugfix Requirements Document

## Introduction

The GET /api/users endpoint throws a ResponseValidationError when returning users with `.test` TLD email addresses. Pydantic's EmailStr validator rejects these domains as "special-use or reserved," causing 68 validation errors when serializing the response. This blocks the endpoint from functioning with the existing seed data in the healthcare backend application.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user has an email address with a `.test` TLD domain (e.g., `kevin.rivera@patient.healthcare.test`) THEN the system throws a ResponseValidationError with message "The part after the @-sign is a special-use or reserved name that cannot be used with email."

1.2 WHEN the GET /api/users endpoint is called and any user in the database has a `.test` TLD email THEN the system fails to serialize the response and returns a 500 error instead of the user list.

### Expected Behavior (Correct)

2.1 WHEN a user has an email address with a `.test` TLD domain THEN the system SHALL accept and serialize the email without validation errors.

2.2 WHEN the GET /api/users endpoint is called with users having `.test` TLD emails THEN the system SHALL return the user list with all email addresses included in the response.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has a standard email address with a valid public TLD (e.g., `.com`, `.org`) THEN the system SHALL CONTINUE TO validate and accept the email as before.

3.2 WHEN a user has an invalidly formatted email (missing @, no domain, etc.) THEN the system SHALL CONTINUE TO reject the email with a validation error.

3.3 WHEN creating or updating users with email input THEN the system SHALL CONTINUE TO validate email format for basic structural correctness.
