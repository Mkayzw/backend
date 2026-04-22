# Email Validation Test Domain Fix - Bugfix Design

## Overview

Pydantic's `EmailStr` validator rejects `.test` TLD email addresses as "special-use or reserved" domains, causing ResponseValidationError when the GET /api/users endpoint attempts to serialize user data containing these emails. The fix involves creating a custom email validator that accepts `.test` TLD domains while preserving standard email format validation for all other cases.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when an email address has a `.test` TLD domain and Pydantic's EmailStr validator is used for serialization
- **Property (P)**: The desired behavior - `.test` TLD emails should be accepted and serialized without validation errors
- **Preservation**: Existing email validation for standard TLDs and rejection of malformed emails must remain unchanged
- **EmailStr**: Pydantic's built-in email validator type that validates email format and rejects special-use/reserved domains
- **.test TLD**: A reserved top-level domain (RFC 2606) intended for testing purposes, not for production use in the global DNS
- **UserResponse**: The Pydantic model in `app/schemas/user_schemas.py` that serializes user data for API responses
- **UserCreate**: The Pydantic model that validates user input during registration

## Bug Details

### Bug Condition

The bug manifests when the application attempts to serialize a user object that has an email address with a `.test` TLD domain. Pydantic's `EmailStr` type uses the `email-validator` library internally, which rejects `.test` TLDs as "special-use or reserved" domains. This causes a `ResponseValidationError` when the GET /api/users endpoint tries to return user data.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type User (database model)
  OUTPUT: boolean
  
  RETURN input.email ENDS WITH ".test"
         AND schemaUsesEmailStr(input)
         AND serializationRaisesError(input, "special-use or reserved")
END FUNCTION
```

### Examples

- **Example 1**: User with email `kevin.rivera@patient.healthcare.test` - Expected: serialized successfully; Actual: ResponseValidationError "The part after the @-sign is a special-use or reserved name"
- **Example 2**: User with email `admin.1@healthcare.test` - Expected: serialized successfully; Actual: ResponseValidationError
- **Example 3**: User with email `dr.john.smith@clinician.healthcare.test` - Expected: serialized successfully; Actual: ResponseValidationError
- **Edge Case**: User with email `user@example.com` - Expected: serialized successfully; Actual: serialized successfully (no bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Standard email addresses with valid public TLDs (`.com`, `.org`, `.io`, etc.) must continue to validate and serialize correctly
- Malformed email addresses (missing `@`, no domain, invalid characters) must continue to be rejected with validation errors
- Email format validation for basic structural correctness must be preserved
- User creation with email input must continue to validate email format

**Scope:**
All inputs that do NOT involve `.test` TLD email addresses should be completely unaffected by this fix. This includes:
- Standard email addresses with public TLDs
- Invalid email formats that should be rejected
- Email addresses with other reserved TLDs (`.local`, `.localhost`, `.example`) - these should continue to be rejected unless explicitly added to the allowlist

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Pydantic EmailStr Behavior**: The `EmailStr` type in Pydantic uses the `email-validator` library which enforces RFC standards that reject `.test` as a "special-use or reserved" domain
   - This is technically correct behavior per RFC 2606
   - However, for development/testing environments, `.test` domains are commonly used and should be accepted

2. **No Custom Validation**: The application uses the default `EmailStr` type without customization
   - `UserCreate`, `UserResponse`, and `LoginResponse` schemas all use `EmailStr` for the email field
   - No custom validator exists to override the default behavior for `.test` domains

3. **Seed Data Uses .test TLDs**: The seed data script generates emails with `.test` TLDs
   - Pattern: `{first}.{last}@patient.healthcare.test`
   - Pattern: `{first}.{last}@clinician.healthcare.test`
   - Pattern: `admin.{n}@healthcare.test`

## Correctness Properties

Property 1: Bug Condition - Test TLD Email Acceptance

_For any_ email address that ends with `.test` TLD and is otherwise properly formatted (contains `@`, has a domain part, has a local part), the fixed email validator SHALL accept and serialize the email without raising a validation error.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Standard Email Validation

_For any_ email address that does NOT end with `.test` TLD, the fixed email validator SHALL produce the same validation result as the original Pydantic EmailStr validator, preserving all existing validation behavior for standard emails and malformed inputs.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `app/schemas/user_schemas.py`

**Approach**: Create a custom email validator type that wraps Pydantic's EmailStr but allows `.test` TLD domains.

**Specific Changes**:

1. **Add Custom Validator**: Create a `TestTolerantEmailStr` type that:
   - Validates email format using standard email regex
   - Accepts `.test` TLD domains explicitly
   - Delegates to Pydantic's EmailStr for non-.test domains

2. **Update Schema Fields**: Replace `EmailStr` with the custom validator in:
   - `UserCreate.email` - for input validation
   - `UserResponse.email` - for output serialization
   - `LoginResponse.email` - for output serialization

3. **Implementation Pattern**:
   ```python
   from pydantic import BaseModel, ConfigDict, Field, field_validator
   from pydantic_core import PydanticCustomError
   import re

   # Email regex pattern for basic validation
   EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

   def validate_email(email: str) -> str:
       """Validate email format, allowing .test TLD."""
       if not EMAIL_REGEX.match(email):
           raise PydanticCustomError('value_error', 'Invalid email format')
       return email
   ```

4. **Alternative Approach (Simpler)**: Use `str` type with custom validator instead of `EmailStr`:
   - Replace `email: EmailStr` with `email: str`
   - Add `@field_validator('email')` decorator for custom validation
   - This gives full control over validation logic

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write tests that attempt to create and serialize user objects with `.test` TLD emails. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **UserResponse Serialization Test**: Create a mock user with `.test` TLD email and attempt to serialize with UserResponse model (will fail on unfixed code)
2. **UserCreate Validation Test**: Attempt to create a UserCreate instance with `.test` TLD email (will fail on unfixed code)
3. **Multiple .test Patterns Test**: Test various `.test` domain patterns from seed data (patient.healthcare.test, clinician.healthcare.test, healthcare.test)
4. **Edge Case - Subdomain Test**: Test email like `user@sub.domain.test` (will fail on unfixed code)

**Expected Counterexamples**:
- Pydantic ValidationError with message containing "special-use or reserved"
- ResponseValidationError when serializing user data
- Possible causes: EmailStr's internal email-validator library rejecting .test TLD

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validate_email_fixed(input.email)
  ASSERT result == input.email  // Email accepted and returned
  ASSERT NO validation_error raised
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validate_email_fixed(input) == validate_email_original(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for standard emails, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Standard Email Preservation**: Verify `user@example.com` validates correctly on both unfixed and fixed code
2. **Invalid Email Preservation**: Verify `invalid-email` is rejected on both unfixed and fixed code
3. **Missing @ Preservation**: Verify `userexample.com` is rejected on both unfixed and fixed code
4. **Other Reserved TLD Preservation**: Verify `user@example.local` is rejected (if not explicitly allowed)

### Unit Tests

- Test `.test` TLD email acceptance in UserCreate schema
- Test `.test` TLD email serialization in UserResponse schema
- Test `.test` TLD email serialization in LoginResponse schema
- Test invalid email format rejection (missing @, no domain, etc.)
- Test standard email validation continues to work

### Property-Based Tests

- Generate random valid email addresses with `.test` TLD and verify acceptance
- Generate random valid email addresses with standard TLDs and verify acceptance
- Generate random invalid email formats and verify rejection
- Test that email normalization (lowercase, trimming) works consistently

### Integration Tests

- Test GET /api/users endpoint returns users with `.test` TLD emails
- Test POST /api/auth/register accepts `.test` TLD emails
- Test POST /api/auth/login works with `.test` TLD emails
- Test full user creation flow with `.test` TLD email
