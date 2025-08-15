<metadata>
purpose: Posts Service API documentation for microservices blog system
type: API
language: JavaScript/Node.js
dependencies: Express.js, Joi, UUID, Database-ORM
last-updated: 2025-08-15
</metadata>

<overview>
The Posts Service manages blog post lifecycle operations including creation, retrieval, editing, and deletion. This service operates independently on port 4000 and provides RESTful endpoints for content management. All endpoints support JSON data format and include comprehensive validation, authentication, and error handling.
</overview>

<base-configuration>
<service-details>
  <name>posts-service</name>
  <version>1.0.0</version>
  <port>4000</port>
  <base-url>http://localhost:4000</base-url>
  <protocol>HTTP/HTTPS</protocol>
  <content-type>application/json</content-type>
</service-details>

<authentication>
  <method>JWT Bearer Token</method>
  <header>Authorization: Bearer {token}</header>
  <token-location>HTTP Header</token-location>
  <required-endpoints>POST, PUT, DELETE</required-endpoints>
</authentication>
</base-configuration>

<endpoints>
<endpoint path="/posts" method="GET">
  <summary>Retrieve all published posts</summary>
  <authentication>Optional</authentication>
  <description>Returns a paginated list of all published blog posts with basic metadata. Supports filtering by tags, author, and date ranges. Anonymous users see only published posts; authenticated users see drafts they own.</description>
  
  <parameters>
    <query-param name="page" type="integer" default="1" description="Page number for pagination"/>
    <query-param name="limit" type="integer" default="20" max="100" description="Number of posts per page"/>
    <query-param name="tags" type="string" description="Comma-separated list of tags for filtering"/>
    <query-param name="author" type="string" description="Filter posts by author username"/>
    <query-param name="status" type="string" enum="draft,published,archived" description="Filter by post status (authenticated users only)"/>
    <query-param name="sort" type="string" enum="created,updated,title" default="created" description="Sort field"/>
    <query-param name="order" type="string" enum="asc,desc" default="desc" description="Sort order"/>
  </parameters>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="posts" type="array" description="Array of post objects">
        <item type="object">
          <field name="id" type="string" format="uuid" description="Unique post identifier"/>
          <field name="title" type="string" maxLength="200" description="Post title"/>
          <field name="content" type="string" description="Full post content"/>
          <field name="excerpt" type="string" maxLength="300" description="Auto-generated excerpt"/>
          <field name="authorId" type="string" format="uuid" description="Post author identifier"/>
          <field name="authorName" type="string" description="Author display name"/>
          <field name="tags" type="array" itemType="string" description="Associated tags"/>
          <field name="status" type="string" enum="draft,published,archived" description="Publication status"/>
          <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
          <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
          <field name="commentCount" type="integer" description="Number of comments"/>
        </item>
      </field>
      <field name="pagination" type="object">
        <field name="page" type="integer" description="Current page number"/>
        <field name="limit" type="integer" description="Posts per page"/>
        <field name="totalPages" type="integer" description="Total number of pages"/>
        <field name="totalPosts" type="integer" description="Total number of posts"/>
        <field name="hasNext" type="boolean" description="Whether next page exists"/>
        <field name="hasPrev" type="boolean" description="Whether previous page exists"/>
      </field>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Invalid query parameters</cause>
    <schema>
      <field name="error" type="string" value="Invalid query parameters"/>
      <field name="details" type="array" itemType="object" description="Parameter validation errors"/>
    </schema>
  </response-error>
  
  <response-error status="429">
    <cause>Rate limit exceeded</cause>
    <schema>
      <field name="error" type="string" value="Too many requests"/>
      <field name="retryAfter" type="integer" description="Seconds to wait before retry"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="basic-request">
      <request>
        <method>GET</method>
        <url>/posts</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "posts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Getting Started with Microservices",
      "content": "Microservices architecture has become...",
      "excerpt": "Microservices architecture has become a popular approach...",
      "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
      "authorName": "john_doe",
      "tags": ["microservices", "architecture", "nodejs"],
      "status": "published",
      "createdAt": "2025-08-15T10:30:00Z",
      "updatedAt": "2025-08-15T10:30:00Z",
      "commentCount": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "totalPosts": 45,
    "hasNext": true,
    "hasPrev": false
  }
}</body>
      </response>
    </example>
    
    <example name="filtered-request">
      <request>
        <method>GET</method>
        <url>/posts?tags=nodejs,javascript&limit=5&sort=updated&order=desc</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "posts": [
    {
      "id": "456e7890-e12b-34d5-a678-901234567890",
      "title": "Advanced Node.js Patterns",
      "content": "In this post we'll explore...",
      "excerpt": "In this post we'll explore advanced patterns...",
      "authorId": "abc12345-6789-def0-1234-567890abcdef",
      "authorName": "jane_smith",
      "tags": ["nodejs", "javascript", "patterns"],
      "status": "published",
      "createdAt": "2025-08-14T15:20:00Z",
      "updatedAt": "2025-08-15T09:15:00Z",
      "commentCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "totalPages": 2,
    "totalPosts": 8,
    "hasNext": true,
    "hasPrev": false
  }
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/posts" method="POST">
  <summary>Create a new blog post</summary>
  <authentication>Required</authentication>
  <description>Creates a new blog post with the authenticated user as the author. Validates title, content, and optional tags. Posts are created in 'draft' status by default and can be published by setting status to 'published'.</description>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="title" type="string" required="true" minLength="3" maxLength="200" description="Post title"/>
      <field name="content" type="string" required="true" minLength="10" maxLength="10000" description="Post content in markdown or plain text"/>
      <field name="tags" type="array" required="false" maxItems="5" description="Array of tag strings">
        <item type="string" maxLength="20" pattern="^[a-zA-Z0-9-_]+$"/>
      </field>
      <field name="status" type="string" required="false" enum="draft,published" default="draft" description="Publication status"/>
    </schema>
  </request-body>
  
  <headers>
    <header name="Authorization" required="true" description="Bearer {jwt_token}"/>
    <header name="Content-Type" required="true" value="application/json"/>
  </headers>
  
  <response-success status="201">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique post identifier"/>
      <field name="title" type="string" description="Post title"/>
      <field name="content" type="string" description="Post content"/>
      <field name="excerpt" type="string" description="Auto-generated excerpt"/>
      <field name="authorId" type="string" format="uuid" description="Post author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="tags" type="array" itemType="string" description="Associated tags"/>
      <field name="status" type="string" description="Publication status"/>
      <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Validation errors in request body</cause>
    <schema>
      <field name="error" type="string" value="Validation failed"/>
      <field name="details" type="array" description="Field-specific validation errors">
        <item type="object">
          <field name="field" type="string" description="Field name that failed validation"/>
          <field name="message" type="string" description="Validation error message"/>
          <field name="value" type="any" description="Invalid value that was provided"/>
        </item>
      </field>
    </schema>
  </response-error>
  
  <response-error status="401">
    <cause>Missing or invalid authentication token</cause>
    <schema>
      <field name="error" type="string" value="Authentication required"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="create-draft-post">
      <request>
        <method>POST</method>
        <url>/posts</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "title": "Understanding REST APIs",
  "content": "REST (Representational State Transfer) is an architectural style for designing networked applications. It relies on a stateless, client-server, cacheable communications protocol...",
  "tags": ["rest", "api", "webdev"],
  "status": "draft"
}</body>
      </request>
      <response>
        <status>201</status>
        <body>{
  "id": "789e0123-e45f-67g8-h901-234567890123",
  "title": "Understanding REST APIs",
  "content": "REST (Representational State Transfer) is an architectural style for designing networked applications...",
  "excerpt": "REST (Representational State Transfer) is an architectural style for designing networked applications. It relies on a stateless...",
  "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
  "authorName": "john_doe",
  "tags": ["rest", "api", "webdev"],
  "status": "draft",
  "createdAt": "2025-08-15T14:30:00Z",
  "updatedAt": "2025-08-15T14:30:00Z"
}</body>
      </response>
    </example>
    
    <example name="validation-error">
      <request>
        <method>POST</method>
        <url>/posts</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "title": "Hi",
  "content": "Short",
  "tags": ["this-tag-is-way-too-long-to-be-valid", "another", "bad", "tag", "list", "too", "many"]
}</body>
      </request>
      <response>
        <status>400</status>
        <body>{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must be between 3 and 200 characters",
      "value": "Hi"
    },
    {
      "field": "content",
      "message": "Content must be at least 10 characters long",
      "value": "Short"
    },
    {
      "field": "tags",
      "message": "Maximum 5 tags allowed",
      "value": ["this-tag-is-way-too-long-to-be-valid", "another", "bad", "tag", "list", "too", "many"]
    }
  ]
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/posts/{id}" method="GET">
  <summary>Retrieve a specific post by ID</summary>
  <authentication>Optional</authentication>
  <description>Returns detailed information about a specific blog post. Public users can only access published posts, while authenticated users can access their own drafts and archived posts.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique post identifier"/>
    <query-param name="includeComments" type="boolean" default="false" description="Include comments in response"/>
  </parameters>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique post identifier"/>
      <field name="title" type="string" description="Post title"/>
      <field name="content" type="string" description="Full post content"/>
      <field name="authorId" type="string" format="uuid" description="Post author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="tags" type="array" itemType="string" description="Associated tags"/>
      <field name="status" type="string" description="Publication status"/>
      <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
      <field name="comments" type="array" optional="true" description="Post comments (if includeComments=true)"/>
    </schema>
  </response-success>
  
  <response-error status="404">
    <cause>Post not found or not accessible to current user</cause>
    <schema>
      <field name="error" type="string" value="Post not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="get-post-by-id">
      <request>
        <method>GET</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Getting Started with Microservices",
  "content": "Microservices architecture has become a popular approach for building scalable, maintainable applications. In this comprehensive guide, we'll explore the fundamentals of microservices, their benefits, challenges, and best practices for implementation...",
  "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
  "authorName": "john_doe",
  "tags": ["microservices", "architecture", "nodejs"],
  "status": "published",
  "createdAt": "2025-08-15T10:30:00Z",
  "updatedAt": "2025-08-15T10:30:00Z"
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/posts/{id}" method="PUT">
  <summary>Update an existing post</summary>
  <authentication>Required</authentication>
  <description>Updates an existing blog post. Users can only update their own posts unless they have admin privileges. All fields are optional; only provided fields will be updated.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique post identifier"/>
  </parameters>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="title" type="string" required="false" minLength="3" maxLength="200" description="Updated post title"/>
      <field name="content" type="string" required="false" minLength="10" maxLength="10000" description="Updated post content"/>
      <field name="tags" type="array" required="false" maxItems="5" description="Updated tag list">
        <item type="string" maxLength="20" pattern="^[a-zA-Z0-9-_]+$"/>
      </field>
      <field name="status" type="string" required="false" enum="draft,published,archived" description="Updated publication status"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique post identifier"/>
      <field name="title" type="string" description="Updated post title"/>
      <field name="content" type="string" description="Updated post content"/>
      <field name="authorId" type="string" format="uuid" description="Post author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="tags" type="array" itemType="string" description="Updated tags"/>
      <field name="status" type="string" description="Updated publication status"/>
      <field name="createdAt" type="string" format="iso8601" description="Original creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Latest update timestamp"/>
    </schema>
  </response-success>
  
  <response-error status="403">
    <cause>User doesn't own the post and lacks admin privileges</cause>
    <schema>
      <field name="error" type="string" value="Insufficient permissions"/>
    </schema>
  </response-error>
  
  <response-error status="404">
    <cause>Post not found</cause>
    <schema>
      <field name="error" type="string" value="Post not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="update-post-title">
      <request>
        <method>PUT</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "title": "Advanced Microservices Architecture Patterns",
  "status": "published"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Advanced Microservices Architecture Patterns",
  "content": "Microservices architecture has become a popular approach for building scalable, maintainable applications...",
  "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
  "authorName": "john_doe",
  "tags": ["microservices", "architecture", "nodejs"],
  "status": "published",
  "createdAt": "2025-08-15T10:30:00Z",
  "updatedAt": "2025-08-15T16:45:00Z"
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/posts/{id}" method="DELETE">
  <summary>Delete a post</summary>
  <authentication>Required</authentication>
  <description>Permanently deletes a blog post. Users can only delete their own posts unless they have admin privileges. This action is irreversible.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique post identifier"/>
  </parameters>
  
  <response-success status="204">
    <description>Post successfully deleted (no content returned)</description>
  </response-success>
  
  <response-error status="403">
    <cause>User doesn't own the post and lacks admin privileges</cause>
    <schema>
      <field name="error" type="string" value="Insufficient permissions"/>
    </schema>
  </response-error>
  
  <response-error status="404">
    <cause>Post not found</cause>
    <schema>
      <field name="error" type="string" value="Post not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="delete-post">
      <request>
        <method>DELETE</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
        </headers>
      </request>
      <response>
        <status>204</status>
        <body></body>
      </response>
    </example>
  </examples>
</endpoint>
</endpoints>

<validation-rules>
<field-validation>
  <field name="title">
    <rule type="required" message="Title is required"/>
    <rule type="minLength" value="3" message="Title must be at least 3 characters"/>
    <rule type="maxLength" value="200" message="Title cannot exceed 200 characters"/>
    <rule type="pattern" value="^[a-zA-Z0-9\s\-_.,!?()]+$" message="Title contains invalid characters"/>
  </field>
  
  <field name="content">
    <rule type="required" message="Content is required"/>
    <rule type="minLength" value="10" message="Content must be at least 10 characters"/>
    <rule type="maxLength" value="10000" message="Content cannot exceed 10000 characters"/>
  </field>
  
  <field name="tags">
    <rule type="array" message="Tags must be an array"/>
    <rule type="maxItems" value="5" message="Maximum 5 tags allowed"/>
    <rule type="itemPattern" value="^[a-zA-Z0-9-_]+$" message="Tags can only contain alphanumeric characters, hyphens, and underscores"/>
    <rule type="itemMaxLength" value="20" message="Each tag cannot exceed 20 characters"/>
  </field>
  
  <field name="status">
    <rule type="enum" values="draft,published,archived" message="Status must be one of: draft, published, archived"/>
  </field>
</field-validation>
</validation-rules>

<business-logic>
<excerpt-generation>
  <algorithm>Auto-generate from first 300 characters of content</algorithm>
  <rules>
    <rule>Strip HTML/Markdown formatting</rule>
    <rule>End at complete word boundary</rule>
    <rule>Append "..." if truncated</rule>
  </rules>
</excerpt-generation>

<ownership-rules>
  <rule>Users can only edit/delete posts they authored</rule>
  <rule>Admin users can edit/delete any post</rule>
  <rule>Moderators can change post status (publish/archive)</rule>
  <rule>Draft posts are only visible to their authors and admins</rule>
</ownership-rules>

<status-transitions>
  <transition from="draft" to="published" requires="content validation"/>
  <transition from="published" to="archived" requires="moderator+ role"/>
  <transition from="archived" to="published" requires="admin role"/>
  <transition from="any" to="draft" requires="author or admin"/>
</status-transitions>
</business-logic>

<performance-considerations>
<database-optimization>
  <index fields="authorId, status, createdAt" type="composite"/>
  <index fields="tags" type="gin/array"/>
  <index fields="title" type="text-search"/>
  <pagination strategy="cursor-based for large datasets"/>
</database-optimization>

<caching-strategy>
  <cache target="published posts list" ttl="300 seconds"/>
  <cache target="individual posts" ttl="600 seconds"/>
  <invalidation trigger="post create/update/delete"/>
</caching-strategy>
</performance-considerations>