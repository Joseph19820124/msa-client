<metadata>
purpose: Authentication Service API documentation for microservices blog system
type: API
language: JavaScript/Node.js
dependencies: Express.js, JWT, bcrypt, Passport.js, OAuth2, Redis
last-updated: 2025-08-15
</metadata>

<overview>
The Authentication Service manages user identity, authentication, and authorization for the microservices blog system. This service operates independently on port 4002 and provides secure user registration, login, token management, and OAuth integration. Implements JWT-based stateless authentication with refresh token rotation and comprehensive security measures.
</overview>

<base-configuration>
<service-details>
  <name>auth-service</name>
  <version>1.0.0</version>
  <port>4002</port>
  <base-url>http://localhost:4002</base-url>
  <protocol>HTTP/HTTPS</protocol>
  <content-type>application/json</content-type>
</service-details>

<security-framework>
  <token-strategy>JWT with RS256 asymmetric signing</token-strategy>
  <session-storage>Redis for refresh tokens and blacklists</session-storage>
  <password-hashing>bcrypt with 12 rounds minimum</password-hashing>
  <rate-limiting>Aggressive limits on auth endpoints</rate-limiting>
  <external-auth>OAuth 2.0/OIDC (Google, GitHub, Discord)</external-auth>
</security-framework>
</base-configuration>

<endpoints>
<endpoint path="/auth/register" method="POST">
  <summary>Register a new user account</summary>
  <authentication>None</authentication>
  <description>Creates a new user account with email verification. Validates email uniqueness, password strength, and implements anti-automation measures. Returns user profile without sensitive data.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="email" type="string" required="true" format="email" description="User email address"/>
      <field name="username" type="string" required="true" minLength="3" maxLength="30" pattern="^[a-zA-Z0-9_-]+$" description="Unique username"/>
      <field name="password" type="string" required="true" minLength="8" description="Password meeting security requirements"/>
      <field name="confirmPassword" type="string" required="true" description="Password confirmation"/>
      <field name="firstName" type="string" required="false" maxLength="50" description="User first name"/>
      <field name="lastName" type="string" required="false" maxLength="50" description="User last name"/>
      <field name="acceptTerms" type="boolean" required="true" description="Terms of service acceptance"/>
      <field name="captchaToken" type="string" required="true" description="Anti-bot verification token"/>
    </schema>
  </request-body>
  
  <headers>
    <header name="Content-Type" required="true" value="application/json"/>
    <header name="X-Forwarded-For" description="Client IP for rate limiting"/>
    <header name="User-Agent" description="Client identification"/>
  </headers>
  
  <response-success status="201">
    <content-type>application/json</content-type>
    <schema>
      <field name="user" type="object" description="Created user profile">
        <field name="id" type="string" format="uuid" description="Unique user identifier"/>
        <field name="email" type="string" description="User email address"/>
        <field name="username" type="string" description="User username"/>
        <field name="firstName" type="string" optional="true" description="User first name"/>
        <field name="lastName" type="string" optional="true" description="User last name"/>
        <field name="role" type="string" default="user" description="User role"/>
        <field name="emailVerified" type="boolean" default="false" description="Email verification status"/>
        <field name="createdAt" type="string" format="iso8601" description="Account creation timestamp"/>
        <field name="lastLoginAt" type="string" format="iso8601" optional="true" description="Last login timestamp"/>
      </field>
      <field name="verificationRequired" type="boolean" description="Whether email verification is required"/>
      <field name="message" type="string" description="Success message"/>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Validation errors or duplicate credentials</cause>
    <schema>
      <field name="error" type="string" value="Registration failed"/>
      <field name="details" type="array" description="Field-specific validation errors">
        <item type="object">
          <field name="field" type="string" description="Field name that failed validation"/>
          <field name="message" type="string" description="Validation error message"/>
          <field name="code" type="string" description="Machine-readable error code"/>
        </item>
      </field>
    </schema>
  </response-error>
  
  <response-error status="429">
    <cause>Registration rate limit exceeded</cause>
    <schema>
      <field name="error" type="string" value="Too many registration attempts"/>
      <field name="retryAfter" type="integer" description="Seconds to wait before retry"/>
      <field name="limit" type="object" description="Rate limit details"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-registration">
      <request>
        <method>POST</method>
        <url>/auth/register</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "email": "jane.smith@example.com",
  "username": "jane_smith",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "acceptTerms": true,
  "captchaToken": "03AGdBq25..."
}</body>
      </request>
      <response>
        <status>201</status>
        <body>{
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "username": "jane_smith",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "user",
    "emailVerified": false,
    "createdAt": "2025-08-15T17:30:00Z",
    "lastLoginAt": null
  },
  "verificationRequired": true,
  "message": "Account created successfully. Please check your email for verification instructions."
}</body>
      </response>
    </example>
    
    <example name="validation-errors">
      <request>
        <method>POST</method>
        <url>/auth/register</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "email": "invalid-email",
  "username": "js",
  "password": "weak",
  "confirmPassword": "different",
  "acceptTerms": false
}</body>
      </request>
      <response>
        <status>400</status>
        <body>{
  "error": "Registration failed",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "username",
      "message": "Username must be at least 3 characters long",
      "code": "USERNAME_TOO_SHORT"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      "code": "WEAK_PASSWORD"
    },
    {
      "field": "confirmPassword",
      "message": "Passwords do not match",
      "code": "PASSWORD_MISMATCH"
    },
    {
      "field": "acceptTerms",
      "message": "You must accept the terms of service",
      "code": "TERMS_NOT_ACCEPTED"
    }
  ]
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/login" method="POST">
  <summary>Authenticate user and issue tokens</summary>
  <authentication>None</authentication>
  <description>Authenticates user credentials and returns JWT access token with refresh token. Implements account lockout, suspicious activity detection, and device tracking for security.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="login" type="string" required="true" description="Email address or username"/>
      <field name="password" type="string" required="true" description="User password"/>
      <field name="rememberMe" type="boolean" required="false" default="false" description="Extended session duration"/>
      <field name="deviceName" type="string" required="false" description="Human-readable device identifier"/>
      <field name="captchaToken" type="string" required="false" description="Required after failed attempts"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="accessToken" type="string" description="JWT access token (15 minutes expiry)"/>
      <field name="refreshToken" type="string" description="Refresh token for token renewal"/>
      <field name="tokenType" type="string" value="Bearer" description="Token type"/>
      <field name="expiresIn" type="integer" description="Access token expiry in seconds"/>
      <field name="user" type="object" description="Authenticated user profile">
        <field name="id" type="string" format="uuid" description="User identifier"/>
        <field name="email" type="string" description="User email"/>
        <field name="username" type="string" description="User username"/>
        <field name="role" type="string" description="User role"/>
        <field name="emailVerified" type="boolean" description="Email verification status"/>
        <field name="lastLoginAt" type="string" format="iso8601" description="Previous login timestamp"/>
      </field>
      <field name="session" type="object" description="Session information">
        <field name="deviceId" type="string" description="Device identifier"/>
        <field name="deviceName" type="string" description="Device name"/>
        <field name="ipAddress" type="string" description="Client IP address"/>
        <field name="location" type="string" optional="true" description="Approximate location"/>
      </field>
    </schema>
  </response-success>
  
  <response-error status="401">
    <cause>Invalid credentials</cause>
    <schema>
      <field name="error" type="string" value="Authentication failed"/>
      <field name="message" type="string" description="Generic error message"/>
      <field name="attemptsRemaining" type="integer" optional="true" description="Remaining attempts before lockout"/>
      <field name="lockoutDuration" type="integer" optional="true" description="Lockout duration in seconds"/>
    </schema>
  </response-error>
  
  <response-error status="403">
    <cause>Account locked or requires verification</cause>
    <schema>
      <field name="error" type="string" enum="account-locked,email-verification-required,account-suspended"/>
      <field name="message" type="string" description="Specific error message"/>
      <field name="unlockAt" type="string" format="iso8601" optional="true" description="When account unlocks"/>
      <field name="verificationRequired" type="boolean" optional="true" description="Email verification needed"/>
    </schema>
  </response-error>
  
  <response-error status="429">
    <cause>Login rate limit exceeded</cause>
    <schema>
      <field name="error" type="string" value="Too many login attempts"/>
      <field name="retryAfter" type="integer" description="Seconds to wait before retry"/>
      <field name="captchaRequired" type="boolean" description="Whether captcha is now required"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-login">
      <request>
        <method>POST</method>
        <url>/auth/login</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "login": "jane.smith@example.com",
  "password": "SecurePass123!",
  "rememberMe": true,
  "deviceName": "Jane's MacBook Pro"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzNDUtNjc4OS1kZWYwLTEyMzQtNTY3ODkwYWJjZGVmIiwiZW1haWwiOiJqYW5lLnNtaXRoQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJqYW5lX3NtaXRoIiwicm9sZSI6InVzZXIiLCJpYXQiOjE2OTI5NzA4MDAsImV4cCI6MTY5Mjk3MTcwMH0...",
  "refreshToken": "rt_def67890-1234-5678-9abc-def0123456789",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "username": "jane_smith",
    "role": "user",
    "emailVerified": true,
    "lastLoginAt": "2025-08-14T09:15:00Z"
  },
  "session": {
    "deviceId": "dev_ghi34567-8901-2345-6789-012345678901",
    "deviceName": "Jane's MacBook Pro",
    "ipAddress": "192.168.1.100",
    "location": "San Francisco, CA, US"
  }
}</body>
      </response>
    </example>
    
    <example name="invalid-credentials">
      <request>
        <method>POST</method>
        <url>/auth/login</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "login": "jane.smith@example.com",
  "password": "wrongpassword"
}</body>
      </request>
      <response>
        <status>401</status>
        <body>{
  "error": "Authentication failed",
  "message": "Invalid email or password",
  "attemptsRemaining": 4
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/refresh" method="POST">
  <summary>Refresh access token using refresh token</summary>
  <authentication>Refresh Token</authentication>
  <description>Issues a new access token using a valid refresh token. Implements token rotation where old refresh tokens are invalidated and new ones issued to prevent token replay attacks.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="refreshToken" type="string" required="true" description="Valid refresh token"/>
      <field name="deviceId" type="string" required="false" description="Device identifier for validation"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="accessToken" type="string" description="New JWT access token"/>
      <field name="refreshToken" type="string" description="New refresh token (old one invalidated)"/>
      <field name="tokenType" type="string" value="Bearer" description="Token type"/>
      <field name="expiresIn" type="integer" description="Access token expiry in seconds"/>
      <field name="user" type="object" description="Current user profile"/>
    </schema>
  </response-success>
  
  <response-error status="401">
    <cause>Invalid or expired refresh token</cause>
    <schema>
      <field name="error" type="string" value="Invalid refresh token"/>
      <field name="code" type="string" enum="expired,invalid,revoked,device-mismatch"/>
      <field name="message" type="string" description="Specific error message"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-refresh">
      <request>
        <method>POST</method>
        <url>/auth/refresh</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "refreshToken": "rt_def67890-1234-5678-9abc-def0123456789",
  "deviceId": "dev_ghi34567-8901-2345-6789-012345678901"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzNDUtNjc4OS1kZWYwLTEyMzQtNTY3ODkwYWJjZGVmIiwiaWF0IjoxNjkyOTcxNzAwLCJleHAiOjE2OTI5NzI2MDB9...",
  "refreshToken": "rt_jkl01234-5678-9abc-def0-123456789012",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "username": "jane_smith",
    "role": "user",
    "emailVerified": true
  }
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/logout" method="POST">
  <summary>Logout user and invalidate tokens</summary>
  <authentication>Bearer Token</authentication>
  <description>Invalidates the current access token and associated refresh token. Supports global logout from all devices or single device logout based on request parameters.</description>
  
  <request-body required="false">
    <content-type>application/json</content-type>
    <schema>
      <field name="allDevices" type="boolean" required="false" default="false" description="Logout from all devices"/>
      <field name="deviceId" type="string" required="false" description="Specific device to logout"/>
    </schema>
  </request-body>
  
  <headers>
    <header name="Authorization" required="true" description="Bearer {access_token}"/>
    <header name="Content-Type" value="application/json"/>
  </headers>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="message" type="string" description="Logout confirmation message"/>
      <field name="devicesLoggedOut" type="integer" description="Number of devices logged out"/>
      <field name="tokensInvalidated" type="integer" description="Number of tokens invalidated"/>
    </schema>
  </response-success>
  
  <response-error status="401">
    <cause>Invalid or expired access token</cause>
    <schema>
      <field name="error" type="string" value="Invalid access token"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="single-device-logout">
      <request>
        <method>POST</method>
        <url>/auth/logout</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "message": "Successfully logged out",
  "devicesLoggedOut": 1,
  "tokensInvalidated": 2
}</body>
      </response>
    </example>
    
    <example name="all-devices-logout">
      <request>
        <method>POST</method>
        <url>/auth/logout</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "allDevices": true
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "message": "Successfully logged out from all devices",
  "devicesLoggedOut": 3,
  "tokensInvalidated": 6
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/verify-email" method="POST">
  <summary>Verify user email address</summary>
  <authentication>None</authentication>
  <description>Verifies user email address using verification token sent via email. Required for account activation and access to protected features.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="token" type="string" required="true" description="Email verification token"/>
      <field name="email" type="string" required="true" format="email" description="Email address being verified"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="message" type="string" description="Verification success message"/>
      <field name="user" type="object" description="Updated user profile">
        <field name="id" type="string" description="User identifier"/>
        <field name="email" type="string" description="Verified email address"/>
        <field name="emailVerified" type="boolean" value="true" description="Email verification status"/>
        <field name="verifiedAt" type="string" format="iso8601" description="Verification timestamp"/>
      </field>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Invalid or expired verification token</cause>
    <schema>
      <field name="error" type="string" value="Verification failed"/>
      <field name="code" type="string" enum="invalid-token,expired-token,already-verified"/>
      <field name="message" type="string" description="Specific error message"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-verification">
      <request>
        <method>POST</method>
        <url>/auth/verify-email</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "token": "evt_mno45678-9012-3456-7890-123456789mno",
  "email": "jane.smith@example.com"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "message": "Email verified successfully",
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "emailVerified": true,
    "verifiedAt": "2025-08-15T18:00:00Z"
  }
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/password/reset" method="POST">
  <summary>Request password reset</summary>
  <authentication>None</authentication>
  <description>Initiates password reset process by sending reset token to user's email. Implements rate limiting and security measures to prevent abuse.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="email" type="string" required="true" format="email" description="Email address for password reset"/>
      <field name="captchaToken" type="string" required="true" description="Anti-bot verification token"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="message" type="string" description="Reset instructions sent message"/>
      <field name="emailSent" type="boolean" description="Whether email was sent"/>
      <field name="expiresIn" type="integer" description="Reset token expiry in seconds"/>
    </schema>
  </response-success>
  
  <examples>
    <example name="password-reset-request">
      <request>
        <method>POST</method>
        <url>/auth/password/reset</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "email": "jane.smith@example.com",
  "captchaToken": "03AGdBq25..."
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "message": "If an account with that email exists, password reset instructions have been sent",
  "emailSent": true,
  "expiresIn": 3600
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/password/reset/confirm" method="POST">
  <summary>Confirm password reset with new password</summary>
  <authentication>None</authentication>
  <description>Completes password reset process using reset token and new password. Invalidates all existing sessions and tokens for security.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="token" type="string" required="true" description="Password reset token"/>
      <field name="password" type="string" required="true" minLength="8" description="New password"/>
      <field name="confirmPassword" type="string" required="true" description="Password confirmation"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="message" type="string" description="Password reset success message"/>
      <field name="user" type="object" description="User profile">
        <field name="id" type="string" description="User identifier"/>
        <field name="email" type="string" description="User email"/>
        <field name="passwordUpdatedAt" type="string" format="iso8601" description="Password change timestamp"/>
      </field>
      <field name="sessionsInvalidated" type="integer" description="Number of sessions terminated"/>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Invalid token or weak password</cause>
    <schema>
      <field name="error" type="string" value="Password reset failed"/>
      <field name="details" type="array" description="Validation errors"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-password-reset">
      <request>
        <method>POST</method>
        <url>/auth/password/reset/confirm</url>
        <headers>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "token": "prt_pqr67890-1234-5678-9abc-def012345pqr",
  "password": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "message": "Password reset successfully",
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "passwordUpdatedAt": "2025-08-15T18:30:00Z"
  },
  "sessionsInvalidated": 2
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/oauth/{provider}" method="GET">
  <summary>Initiate OAuth authentication</summary>
  <authentication>None</authentication>
  <description>Redirects user to OAuth provider for authentication. Supports Google, GitHub, and Discord OAuth flows with state parameter for CSRF protection.</description>
  
  <parameters>
    <path-param name="provider" type="string" enum="google,github,discord" required="true" description="OAuth provider"/>
    <query-param name="redirect" type="string" required="false" description="Post-auth redirect URL"/>
    <query-param name="state" type="string" required="false" description="CSRF protection state"/>
  </parameters>
  
  <response-success status="302">
    <description>Redirect to OAuth provider authorization URL</description>
    <headers>
      <header name="Location" description="OAuth provider authorization URL"/>
      <header name="Set-Cookie" description="State cookie for CSRF protection"/>
    </headers>
  </response-success>
  
  <examples>
    <example name="google-oauth-initiation">
      <request>
        <method>GET</method>
        <url>/auth/oauth/google?redirect=http://localhost:3000/dashboard</url>
      </request>
      <response>
        <status>302</status>
        <headers>
          <header name="Location">https://accounts.google.com/oauth/authorize?client_id=...&redirect_uri=...&scope=openid+email+profile&state=...</header>
          <header name="Set-Cookie">oauth_state=...; HttpOnly; Secure; SameSite=Lax</header>
        </headers>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/oauth/{provider}/callback" method="GET">
  <summary>Handle OAuth callback</summary>
  <authentication>None</authentication>
  <description>Processes OAuth provider callback, exchanges code for tokens, creates or links user account, and returns authentication tokens.</description>
  
  <parameters>
    <path-param name="provider" type="string" enum="google,github,discord" required="true" description="OAuth provider"/>
    <query-param name="code" type="string" required="true" description="Authorization code from provider"/>
    <query-param name="state" type="string" required="true" description="State parameter for CSRF validation"/>
    <query-param name="error" type="string" required="false" description="Error from OAuth provider"/>
  </parameters>
  
  <response-success status="302">
    <description>Redirect to client with tokens</description>
    <headers>
      <header name="Location" description="Client URL with authentication tokens"/>
      <header name="Set-Cookie" description="Refresh token cookie"/>
    </headers>
  </response-success>
  
  <response-error status="400">
    <cause>OAuth error or state mismatch</cause>
    <schema>
      <field name="error" type="string" value="OAuth authentication failed"/>
      <field name="provider" type="string" description="OAuth provider"/>
      <field name="reason" type="string" description="Failure reason"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="successful-oauth-callback">
      <request>
        <method>GET</method>
        <url>/auth/oauth/google/callback?code=4/0AX4XfWh...&state=xyz123</url>
      </request>
      <response>
        <status>302</status>
        <headers>
          <header name="Location">http://localhost:3000/dashboard?token=eyJhbGciOiJSUzI1NiI...</header>
          <header name="Set-Cookie">refresh_token=rt_...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800</header>
        </headers>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/auth/profile" method="GET">
  <summary>Get current user profile</summary>
  <authentication>Bearer Token</authentication>
  <description>Returns the authenticated user's profile information including account settings, security information, and activity summary.</description>
  
  <headers>
    <header name="Authorization" required="true" description="Bearer {access_token}"/>
  </headers>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="user" type="object" description="User profile">
        <field name="id" type="string" format="uuid" description="User identifier"/>
        <field name="email" type="string" description="User email"/>
        <field name="username" type="string" description="User username"/>
        <field name="firstName" type="string" optional="true" description="First name"/>
        <field name="lastName" type="string" optional="true" description="Last name"/>
        <field name="role" type="string" description="User role"/>
        <field name="emailVerified" type="boolean" description="Email verification status"/>
        <field name="createdAt" type="string" format="iso8601" description="Account creation"/>
        <field name="lastLoginAt" type="string" format="iso8601" description="Last login"/>
        <field name="profilePicture" type="string" optional="true" description="Profile picture URL"/>
      </field>
      <field name="security" type="object" description="Security information">
        <field name="passwordUpdatedAt" type="string" format="iso8601" description="Last password change"/>
        <field name="twoFactorEnabled" type="boolean" description="2FA status"/>
        <field name="activeSessions" type="integer" description="Number of active sessions"/>
        <field name="linkedProviders" type="array" itemType="string" description="OAuth providers linked"/>
      </field>
      <field name="preferences" type="object" description="User preferences">
        <field name="theme" type="string" enum="light,dark,auto" description="UI theme preference"/>
        <field name="language" type="string" description="Preferred language"/>
        <field name="emailNotifications" type="boolean" description="Email notification preference"/>
      </field>
    </schema>
  </response-success>
  
  <examples>
    <example name="get-user-profile">
      <request>
        <method>GET</method>
        <url>/auth/profile</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "user": {
    "id": "usr_abc12345-6789-def0-1234-567890abcdef",
    "email": "jane.smith@example.com",
    "username": "jane_smith",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "user",
    "emailVerified": true,
    "createdAt": "2025-08-15T17:30:00Z",
    "lastLoginAt": "2025-08-15T18:45:00Z",
    "profilePicture": "https://api.example.com/avatars/jane_smith.jpg"
  },
  "security": {
    "passwordUpdatedAt": "2025-08-15T17:30:00Z",
    "twoFactorEnabled": false,
    "activeSessions": 2,
    "linkedProviders": ["google"]
  },
  "preferences": {
    "theme": "dark",
    "language": "en",
    "emailNotifications": true
  }
}</body>
      </response>
    </example>
  </examples>
</endpoint>
</endpoints>

<validation-rules>
<password-requirements>
  <rule type="minLength" value="8" message="Password must be at least 8 characters"/>
  <rule type="maxLength" value="128" message="Password cannot exceed 128 characters"/>
  <rule type="hasUppercase" message="Password must contain at least one uppercase letter"/>
  <rule type="hasLowercase" message="Password must contain at least one lowercase letter"/>
  <rule type="hasNumber" message="Password must contain at least one number"/>
  <rule type="hasSpecialChar" message="Password must contain at least one special character"/>
  <rule type="notCommon" message="Password is too common or has been compromised"/>
  <rule type="notPersonalInfo" message="Password cannot contain personal information"/>
</password-requirements>

<email-validation>
  <rule type="format" pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$" message="Must be a valid email address"/>
  <rule type="maxLength" value="254" message="Email address too long"/>
  <rule type="domainCheck" message="Email domain does not exist"/>
  <rule type="disposableCheck" message="Disposable email addresses not allowed"/>
</email-validation>

<username-validation>
  <rule type="minLength" value="3" message="Username must be at least 3 characters"/>
  <rule type="maxLength" value="30" message="Username cannot exceed 30 characters"/>
  <rule type="pattern" value="^[a-zA-Z0-9_-]+$" message="Username can only contain letters, numbers, underscores, and hyphens"/>
  <rule type="notReserved" message="Username is reserved"/>
  <rule type="unique" message="Username is already taken"/>
</username-validation>
</validation-rules>

<security-measures>
<rate-limiting>
  <endpoint path="/auth/login" window="15min" limit="5" scope="per-IP"/>
  <endpoint path="/auth/register" window="1hour" limit="3" scope="per-IP"/>
  <endpoint path="/auth/password/reset" window="1hour" limit="5" scope="per-IP"/>
  <endpoint path="/auth/refresh" window="1min" limit="10" scope="per-token"/>
  <progressive-delays enabled="true" base="1s" multiplier="2" max="300s"/>
</rate-limiting>

<account-lockout>
  <failed-attempts threshold="5" window="15min"/>
  <lockout-duration initial="15min" progressive="true" max="24hours"/>
  <unlock-methods>time-based, email-verification, admin-override</unlock-methods>
</account-lockout>

<token-security>
  <access-token>
    <algorithm>RS256</algorithm>
    <expiry>15 minutes</expiry>
    <claims>sub, email, username, role, iat, exp</claims>
    <key-rotation>monthly</key-rotation>
  </access-token>
  
  <refresh-token>
    <format>cryptographically-secure-random</format>
    <expiry>7 days (standard), 30 days (remember-me)</expiry>
    <storage>Redis with encryption</storage>
    <rotation>on-use</rotation>
  </refresh-token>
  
  <blacklisting>
    <method>Redis-based token blacklist</method>
    <cleanup>automated on token expiry</cleanup>
    <scope>per-token and per-user</scope>
  </blacklisting>
</token-security>

<session-management>
  <device-tracking enabled="true" fingerprinting="basic"/>
  <concurrent-sessions limit="5" policy="oldest-logout"/>
  <suspicious-activity detection="IP-change, user-agent-change, impossible-travel"/>
  <session-timeout idle="30min" absolute="12hours"/>
</session-management>

<data-protection>
  <password-hashing algorithm="bcrypt" rounds="12" salt="per-password"/>
  <sensitive-data encryption="AES-256-GCM" key-management="external"/>
  <pii-handling anonymization="on-delete" retention="5-years"/>
  <audit-logging level="detailed" storage="encrypted" retention="7-years"/>
</data-protection>
</security-measures>

<business-logic>
<user-lifecycle>
  <registration>
    <email-verification required="true" expiry="24hours"/>
    <account-activation automatic="on-verification"/>
    <welcome-email enabled="true" template="customizable"/>
  </registration>
  
  <authentication>
    <multi-factor optional="true" methods="TOTP,SMS,email"/>
    <device-trust duration="30days" re-verification="sensitive-actions"/>
    <password-policy enforcement="strict" history="5-passwords"/>
  </authentication>
  
  <account-recovery>
    <password-reset expiry="1hour" single-use="true"/>
    <account-unlock methods="time,email,admin" escalation="automatic"/>
    <backup-codes count="10" single-use="true" regeneration="on-demand"/>
  </account-recovery>
</user-lifecycle>

<oauth-integration>
  <providers>
    <google scopes="openid,email,profile" user-info="name,email,picture"/>
    <github scopes="user:email" user-info="login,email,name"/>
    <discord scopes="identify,email" user-info="username,email"/>
  </providers>
  
  <account-linking>
    <existing-account automatic="email-match" confirmation="required"/>
    <new-account creation="automatic" verification="oauth-verified"/>
    <unlinking allowed="if-password-set" protection="confirmation-required"/>
  </account-linking>
</oauth-integration>

<role-management>
  <roles>
    <user permissions="read-own,write-own" default="true"/>
    <moderator permissions="read-any,moderate-content,manage-users" assignment="admin-only"/>
    <admin permissions="all" assignment="super-admin-only" restrictions="audit-logged"/>
  </roles>
  
  <permission-inheritance enabled="true" hierarchy="user<moderator<admin"/>
  <dynamic-permissions context="resource-based" evaluation="runtime"/>
</role-management>
</business-logic>

<monitoring-and-analytics>
<security-events>
  <login-attempts success="info" failure="warning" suspicious="alert"/>
  <token-usage valid="debug" expired="info" invalid="warning"/>
  <account-changes password="audit" email="audit" role="critical"/>
  <oauth-activities link="info" unlink="warning" provider-error="error"/>
</security-events>

<metrics>
  <authentication-rate successful-logins="counter" failed-logins="counter"/>
  <token-health active-tokens="gauge" refresh-rate="histogram"/>
  <user-activity registrations="counter" verifications="counter"/>
  <security-incidents lockouts="counter" suspicious-activity="counter"/>
</metrics>

<alerting>
  <thresholds>
    <failed-login-spike rate="10/min" severity="medium"/>
    <registration-spike rate="50/hour" severity="low"/>
    <token-abuse pattern="repeated-refresh" severity="high"/>
    <oauth-failures rate="20/hour" severity="medium"/>
  </thresholds>
  
  <notifications>
    <email targets="security-team" template="detailed"/>
    <slack channels="security-alerts" format="summary"/>
    <webhook endpoints="siem-system" payload="structured"/>
  </notifications>
</alerting>
</monitoring-and-analytics>