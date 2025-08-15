<metadata>
purpose: Comments Service API documentation for microservices blog system
type: API
language: JavaScript/Node.js
dependencies: Express.js, Joi, UUID, Database-ORM
last-updated: 2025-08-15
</metadata>

<overview>
The Comments Service manages comment lifecycle operations for blog posts including creation, retrieval, moderation, and threading. This service operates independently on port 4001 and provides RESTful endpoints for discussion management. Supports nested commenting, moderation workflows, and real-time updates.
</overview>

<base-configuration>
<service-details>
  <name>comments-service</name>
  <version>1.0.0</version>
  <port>4001</port>
  <base-url>http://localhost:4001</base-url>
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
<endpoint path="/posts/{postId}/comments" method="GET">
  <summary>Retrieve comments for a specific post</summary>
  <authentication>Optional</authentication>
  <description>Returns all comments associated with a blog post. Supports nested threading, pagination, and moderation status filtering. Anonymous users see only approved comments; authenticated users may see pending comments they authored.</description>
  
  <parameters>
    <path-param name="postId" type="string" format="uuid" required="true" description="Target post identifier"/>
    <query-param name="page" type="integer" default="1" description="Page number for pagination"/>
    <query-param name="limit" type="integer" default="50" max="200" description="Number of comments per page"/>
    <query-param name="sort" type="string" enum="created,updated,votes" default="created" description="Sort field"/>
    <query-param name="order" type="string" enum="asc,desc" default="asc" description="Sort order"/>
    <query-param name="status" type="string" enum="active,moderated,deleted" description="Filter by moderation status (moderator+ only)"/>
    <query-param name="threaded" type="boolean" default="true" description="Return nested comment structure"/>
    <query-param name="maxDepth" type="integer" default="5" max="10" description="Maximum nesting depth for threaded comments"/>
  </parameters>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="comments" type="array" description="Array of comment objects">
        <item type="object">
          <field name="id" type="string" format="uuid" description="Unique comment identifier"/>
          <field name="content" type="string" maxLength="1000" description="Comment content"/>
          <field name="postId" type="string" format="uuid" description="Associated post identifier"/>
          <field name="authorId" type="string" format="uuid" description="Comment author identifier"/>
          <field name="authorName" type="string" description="Author display name"/>
          <field name="parentId" type="string" format="uuid" optional="true" description="Parent comment ID for nested replies"/>
          <field name="status" type="string" enum="active,moderated,deleted" description="Moderation status"/>
          <field name="depth" type="integer" description="Nesting level (0 for top-level comments)"/>
          <field name="votes" type="object" description="Vote counts">
            <field name="up" type="integer" description="Upvote count"/>
            <field name="down" type="integer" description="Downvote count"/>
            <field name="total" type="integer" description="Net vote score"/>
          </field>
          <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
          <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
          <field name="replies" type="array" optional="true" description="Nested reply comments (if threaded=true)"/>
        </item>
      </field>
      <field name="pagination" type="object">
        <field name="page" type="integer" description="Current page number"/>
        <field name="limit" type="integer" description="Comments per page"/>
        <field name="totalPages" type="integer" description="Total number of pages"/>
        <field name="totalComments" type="integer" description="Total number of comments"/>
        <field name="hasNext" type="boolean" description="Whether next page exists"/>
        <field name="hasPrev" type="boolean" description="Whether previous page exists"/>
      </field>
      <field name="postExists" type="boolean" description="Whether the target post exists"/>
    </schema>
  </response-success>
  
  <response-error status="404">
    <cause>Post not found</cause>
    <schema>
      <field name="error" type="string" value="Post not found"/>
      <field name="postId" type="string" description="The post ID that was not found"/>
    </schema>
  </response-error>
  
  <response-error status="400">
    <cause>Invalid query parameters</cause>
    <schema>
      <field name="error" type="string" value="Invalid query parameters"/>
      <field name="details" type="array" itemType="object" description="Parameter validation errors"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="get-threaded-comments">
      <request>
        <method>GET</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000/comments?threaded=true&maxDepth=3</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "comments": [
    {
      "id": "com_789e0123-e45f-67g8-h901-234567890123",
      "content": "Great article! This really helped me understand microservices better.",
      "postId": "123e4567-e89b-12d3-a456-426614174000",
      "authorId": "abc12345-6789-def0-1234-567890abcdef",
      "authorName": "jane_smith",
      "parentId": null,
      "status": "active",
      "depth": 0,
      "votes": {
        "up": 5,
        "down": 0,
        "total": 5
      },
      "createdAt": "2025-08-15T11:30:00Z",
      "updatedAt": "2025-08-15T11:30:00Z",
      "replies": [
        {
          "id": "com_456e7890-e12b-34d5-a678-901234567890",
          "content": "Thanks! I'm glad it was helpful. Are you planning to implement microservices in your project?",
          "postId": "123e4567-e89b-12d3-a456-426614174000",
          "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
          "authorName": "john_doe",
          "parentId": "com_789e0123-e45f-67g8-h901-234567890123",
          "status": "active",
          "depth": 1,
          "votes": {
            "up": 2,
            "down": 0,
            "total": 2
          },
          "createdAt": "2025-08-15T12:15:00Z",
          "updatedAt": "2025-08-15T12:15:00Z",
          "replies": []
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "totalComments": 2,
    "hasNext": false,
    "hasPrev": false
  },
  "postExists": true
}</body>
      </response>
    </example>
    
    <example name="get-flat-comments">
      <request>
        <method>GET</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000/comments?threaded=false&sort=votes&order=desc</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "comments": [
    {
      "id": "com_789e0123-e45f-67g8-h901-234567890123",
      "content": "Great article! This really helped me understand microservices better.",
      "postId": "123e4567-e89b-12d3-a456-426614174000",
      "authorId": "abc12345-6789-def0-1234-567890abcdef",
      "authorName": "jane_smith",
      "parentId": null,
      "status": "active",
      "depth": 0,
      "votes": {
        "up": 5,
        "down": 0,
        "total": 5
      },
      "createdAt": "2025-08-15T11:30:00Z",
      "updatedAt": "2025-08-15T11:30:00Z"
    },
    {
      "id": "com_456e7890-e12b-34d5-a678-901234567890",
      "content": "Thanks! I'm glad it was helpful. Are you planning to implement microservices in your project?",
      "postId": "123e4567-e89b-12d3-a456-426614174000",
      "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
      "authorName": "john_doe",
      "parentId": "com_789e0123-e45f-67g8-h901-234567890123",
      "status": "active",
      "depth": 1,
      "votes": {
        "up": 2,
        "down": 0,
        "total": 2
      },
      "createdAt": "2025-08-15T12:15:00Z",
      "updatedAt": "2025-08-15T12:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalPages": 1,
    "totalComments": 2,
    "hasNext": false,
    "hasPrev": false
  },
  "postExists": true
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/posts/{postId}/comments" method="POST">
  <summary>Create a new comment on a post</summary>
  <authentication>Required</authentication>
  <description>Creates a new comment on the specified blog post. Can be a top-level comment or a reply to an existing comment. Comments are subject to content validation and may require moderation based on user reputation and content filters.</description>
  
  <parameters>
    <path-param name="postId" type="string" format="uuid" required="true" description="Target post identifier"/>
  </parameters>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="content" type="string" required="true" minLength="1" maxLength="1000" description="Comment content"/>
      <field name="parentId" type="string" format="uuid" required="false" description="Parent comment ID for replies"/>
    </schema>
  </request-body>
  
  <headers>
    <header name="Authorization" required="true" description="Bearer {jwt_token}"/>
    <header name="Content-Type" required="true" value="application/json"/>
  </headers>
  
  <response-success status="201">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique comment identifier"/>
      <field name="content" type="string" description="Comment content"/>
      <field name="postId" type="string" format="uuid" description="Associated post identifier"/>
      <field name="authorId" type="string" format="uuid" description="Comment author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="parentId" type="string" format="uuid" optional="true" description="Parent comment ID for nested replies"/>
      <field name="status" type="string" description="Moderation status"/>
      <field name="depth" type="integer" description="Nesting level"/>
      <field name="votes" type="object" description="Initial vote counts (all zeros)"/>
      <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
    </schema>
  </response-success>
  
  <response-error status="400">
    <cause>Validation errors or invalid parent comment</cause>
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
  
  <response-error status="404">
    <cause>Post or parent comment not found</cause>
    <schema>
      <field name="error" type="string" value="Resource not found"/>
      <field name="resource" type="string" enum="post,parent-comment" description="Which resource was not found"/>
    </schema>
  </response-error>
  
  <response-error status="409">
    <cause>Comment threading depth limit exceeded</cause>
    <schema>
      <field name="error" type="string" value="Maximum comment depth exceeded"/>
      <field name="maxDepth" type="integer" description="Maximum allowed depth"/>
      <field name="attemptedDepth" type="integer" description="Attempted nesting depth"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="create-top-level-comment">
      <request>
        <method>POST</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000/comments</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "content": "This is exactly what I needed to learn about microservices. The examples are particularly helpful!"
}</body>
      </request>
      <response>
        <status>201</status>
        <body>{
  "id": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "content": "This is exactly what I needed to learn about microservices. The examples are particularly helpful!",
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "authorId": "abc12345-6789-def0-1234-567890abcdef",
  "authorName": "jane_smith",
  "parentId": null,
  "status": "active",
  "depth": 0,
  "votes": {
    "up": 0,
    "down": 0,
    "total": 0
  },
  "createdAt": "2025-08-15T16:20:00Z",
  "updatedAt": "2025-08-15T16:20:00Z"
}</body>
      </response>
    </example>
    
    <example name="create-reply-comment">
      <request>
        <method>POST</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000/comments</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "content": "I agree! Have you tried implementing any of these patterns yet?",
  "parentId": "com_def45678-9abc-01e2-f345-6789abcdef01"
}</body>
      </request>
      <response>
        <status>201</status>
        <body>{
  "id": "com_ghi90123-4def-567g-h890-123456789ghi",
  "content": "I agree! Have you tried implementing any of these patterns yet?",
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "authorId": "987fcdeb-51a2-43d1-b123-456789abcdef",
  "authorName": "john_doe",
  "parentId": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "status": "active",
  "depth": 1,
  "votes": {
    "up": 0,
    "down": 0,
    "total": 0
  },
  "createdAt": "2025-08-15T16:25:00Z",
  "updatedAt": "2025-08-15T16:25:00Z"
}</body>
      </response>
    </example>
    
    <example name="validation-error">
      <request>
        <method>POST</method>
        <url>/posts/123e4567-e89b-12d3-a456-426614174000/comments</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "content": ""
}</body>
      </request>
      <response>
        <status>400</status>
        <body>{
  "error": "Validation failed",
  "details": [
    {
      "field": "content",
      "message": "Content cannot be empty",
      "value": ""
    }
  ]
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/comments/{id}" method="GET">
  <summary>Retrieve a specific comment by ID</summary>
  <authentication>Optional</authentication>
  <description>Returns detailed information about a specific comment including its thread context. Useful for direct comment linking and moderation workflows.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique comment identifier"/>
    <query-param name="includeThread" type="boolean" default="false" description="Include parent and child comments"/>
    <query-param name="threadDepth" type="integer" default="2" max="5" description="Depth of thread context to include"/>
  </parameters>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique comment identifier"/>
      <field name="content" type="string" description="Comment content"/>
      <field name="postId" type="string" format="uuid" description="Associated post identifier"/>
      <field name="authorId" type="string" format="uuid" description="Comment author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="parentId" type="string" format="uuid" optional="true" description="Parent comment ID"/>
      <field name="status" type="string" description="Moderation status"/>
      <field name="depth" type="integer" description="Nesting level"/>
      <field name="votes" type="object" description="Vote counts"/>
      <field name="createdAt" type="string" format="iso8601" description="Creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Last update timestamp"/>
      <field name="thread" type="object" optional="true" description="Thread context (if includeThread=true)">
        <field name="parent" type="object" optional="true" description="Parent comment"/>
        <field name="children" type="array" description="Direct child comments"/>
      </field>
    </schema>
  </response-success>
  
  <response-error status="404">
    <cause>Comment not found or not accessible</cause>
    <schema>
      <field name="error" type="string" value="Comment not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="get-comment-with-thread">
      <request>
        <method>GET</method>
        <url>/comments/com_def45678-9abc-01e2-f345-6789abcdef01?includeThread=true</url>
        <headers>
          <header name="Accept">application/json</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "id": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "content": "This is exactly what I needed to learn about microservices. The examples are particularly helpful!",
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "authorId": "abc12345-6789-def0-1234-567890abcdef",
  "authorName": "jane_smith",
  "parentId": null,
  "status": "active",
  "depth": 0,
  "votes": {
    "up": 3,
    "down": 0,
    "total": 3
  },
  "createdAt": "2025-08-15T16:20:00Z",
  "updatedAt": "2025-08-15T16:20:00Z",
  "thread": {
    "parent": null,
    "children": [
      {
        "id": "com_ghi90123-4def-567g-h890-123456789ghi",
        "content": "I agree! Have you tried implementing any of these patterns yet?",
        "authorName": "john_doe",
        "createdAt": "2025-08-15T16:25:00Z"
      }
    ]
  }
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/comments/{id}" method="PUT">
  <summary>Update an existing comment</summary>
  <authentication>Required</authentication>
  <description>Updates the content of an existing comment. Users can only edit their own comments within a limited time window (typically 15 minutes). Moderators can edit any comment and change moderation status.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique comment identifier"/>
  </parameters>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="content" type="string" required="false" minLength="1" maxLength="1000" description="Updated comment content"/>
      <field name="status" type="string" required="false" enum="active,moderated,deleted" description="Updated moderation status (moderator+ only)"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Unique comment identifier"/>
      <field name="content" type="string" description="Updated comment content"/>
      <field name="postId" type="string" format="uuid" description="Associated post identifier"/>
      <field name="authorId" type="string" format="uuid" description="Comment author identifier"/>
      <field name="authorName" type="string" description="Author display name"/>
      <field name="parentId" type="string" format="uuid" optional="true" description="Parent comment ID"/>
      <field name="status" type="string" description="Updated moderation status"/>
      <field name="depth" type="integer" description="Nesting level"/>
      <field name="votes" type="object" description="Vote counts"/>
      <field name="createdAt" type="string" format="iso8601" description="Original creation timestamp"/>
      <field name="updatedAt" type="string" format="iso8601" description="Latest update timestamp"/>
      <field name="edited" type="boolean" description="Whether comment has been edited"/>
      <field name="editWindow" type="boolean" description="Whether comment is still in edit window"/>
    </schema>
  </response-success>
  
  <response-error status="403">
    <cause>User doesn't own comment, lacks permissions, or edit window expired</cause>
    <schema>
      <field name="error" type="string" value="Insufficient permissions"/>
      <field name="reason" type="string" enum="ownership,edit-window-expired,insufficient-role" description="Specific permission failure reason"/>
    </schema>
  </response-error>
  
  <response-error status="404">
    <cause>Comment not found</cause>
    <schema>
      <field name="error" type="string" value="Comment not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="update-comment-content">
      <request>
        <method>PUT</method>
        <url>/comments/com_def45678-9abc-01e2-f345-6789abcdef01</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "content": "This is exactly what I needed to learn about microservices. The examples are particularly helpful! Thanks for sharing."
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "id": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "content": "This is exactly what I needed to learn about microservices. The examples are particularly helpful! Thanks for sharing.",
  "postId": "123e4567-e89b-12d3-a456-426614174000",
  "authorId": "abc12345-6789-def0-1234-567890abcdef",
  "authorName": "jane_smith",
  "parentId": null,
  "status": "active",
  "depth": 0,
  "votes": {
    "up": 3,
    "down": 0,
    "total": 3
  },
  "createdAt": "2025-08-15T16:20:00Z",
  "updatedAt": "2025-08-15T16:32:00Z",
  "edited": true,
  "editWindow": true
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/comments/{id}" method="DELETE">
  <summary>Delete a comment</summary>
  <authentication>Required</authentication>
  <description>Marks a comment as deleted. Comments with replies are soft-deleted (content replaced with placeholder) while leaf comments can be hard-deleted. Users can only delete their own comments; moderators can delete any comment.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique comment identifier"/>
    <query-param name="hard" type="boolean" default="false" description="Force hard delete (moderator+ only)"/>
  </parameters>
  
  <response-success status="204">
    <description>Comment successfully deleted (no content returned)</description>
  </response-success>
  
  <response-success status="200">
    <description>Comment soft-deleted (has replies)</description>
    <content-type>application/json</content-type>
    <schema>
      <field name="id" type="string" format="uuid" description="Comment identifier"/>
      <field name="status" type="string" value="deleted" description="Updated status"/>
      <field name="deletionType" type="string" enum="soft,hard" description="Type of deletion performed"/>
      <field name="reason" type="string" description="Reason for soft deletion"/>
    </schema>
  </response-success>
  
  <response-error status="403">
    <cause>User doesn't own comment or lacks permissions</cause>
    <schema>
      <field name="error" type="string" value="Insufficient permissions"/>
    </schema>
  </response-error>
  
  <response-error status="404">
    <cause>Comment not found</cause>
    <schema>
      <field name="error" type="string" value="Comment not found"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="hard-delete-leaf-comment">
      <request>
        <method>DELETE</method>
        <url>/comments/com_ghi90123-4def-567g-h890-123456789ghi</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
        </headers>
      </request>
      <response>
        <status>204</status>
        <body></body>
      </response>
    </example>
    
    <example name="soft-delete-parent-comment">
      <request>
        <method>DELETE</method>
        <url>/comments/com_def45678-9abc-01e2-f345-6789abcdef01</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
        </headers>
      </request>
      <response>
        <status>200</status>
        <body>{
  "id": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "status": "deleted",
  "deletionType": "soft",
  "reason": "Comment has replies and cannot be hard-deleted"
}</body>
      </response>
    </example>
  </examples>
</endpoint>

<endpoint path="/comments/{id}/vote" method="POST">
  <summary>Vote on a comment</summary>
  <authentication>Required</authentication>
  <description>Casts an upvote or downvote on a comment. Users can change their vote or remove it entirely. Vote manipulation detection algorithms prevent abuse.</description>
  
  <parameters>
    <path-param name="id" type="string" format="uuid" required="true" description="Unique comment identifier"/>
  </parameters>
  
  <request-body required="true">
    <content-type>application/json</content-type>
    <schema>
      <field name="vote" type="string" required="true" enum="up,down,none" description="Vote type ('none' removes existing vote)"/>
    </schema>
  </request-body>
  
  <response-success status="200">
    <content-type>application/json</content-type>
    <schema>
      <field name="commentId" type="string" format="uuid" description="Comment identifier"/>
      <field name="userVote" type="string" enum="up,down,none" description="User's current vote"/>
      <field name="votes" type="object" description="Updated vote counts">
        <field name="up" type="integer" description="Total upvotes"/>
        <field name="down" type="integer" description="Total downvotes"/>
        <field name="total" type="integer" description="Net vote score"/>
      </field>
      <field name="changed" type="boolean" description="Whether vote was actually changed"/>
    </schema>
  </response-success>
  
  <response-error status="404">
    <cause>Comment not found</cause>
    <schema>
      <field name="error" type="string" value="Comment not found"/>
    </schema>
  </response-error>
  
  <response-error status="409">
    <cause>Cannot vote on own comment</cause>
    <schema>
      <field name="error" type="string" value="Cannot vote on own content"/>
    </schema>
  </response-error>
  
  <examples>
    <example name="upvote-comment">
      <request>
        <method>POST</method>
        <url>/comments/com_def45678-9abc-01e2-f345-6789abcdef01/vote</url>
        <headers>
          <header name="Authorization">Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</header>
          <header name="Content-Type">application/json</header>
        </headers>
        <body>{
  "vote": "up"
}</body>
      </request>
      <response>
        <status>200</status>
        <body>{
  "commentId": "com_def45678-9abc-01e2-f345-6789abcdef01",
  "userVote": "up",
  "votes": {
    "up": 4,
    "down": 0,
    "total": 4
  },
  "changed": true
}</body>
      </response>
    </example>
  </examples>
</endpoint>
</endpoints>

<validation-rules>
<field-validation>
  <field name="content">
    <rule type="required" message="Content is required"/>
    <rule type="minLength" value="1" message="Content cannot be empty"/>
    <rule type="maxLength" value="1000" message="Content cannot exceed 1000 characters"/>
    <rule type="profanity-filter" message="Content contains inappropriate language"/>
    <rule type="spam-detection" message="Content appears to be spam"/>
  </field>
  
  <field name="parentId">
    <rule type="uuid" message="Parent ID must be a valid UUID"/>
    <rule type="exists" resource="comments" message="Parent comment does not exist"/>
    <rule type="max-depth" value="10" message="Maximum comment nesting depth exceeded"/>
    <rule type="same-post" message="Parent comment must be on the same post"/>
  </field>
  
  <field name="vote">
    <rule type="enum" values="up,down,none" message="Vote must be 'up', 'down', or 'none'"/>
  </field>
</field-validation>

<content-moderation>
  <auto-moderation>
    <rule type="profanity-filter" action="flag" severity="medium"/>
    <rule type="spam-detection" action="auto-moderate" severity="high"/>
    <rule type="link-detection" action="flag" severity="low"/>
    <rule type="excessive-caps" action="flag" severity="low"/>
  </auto-moderation>
  
  <manual-moderation>
    <trigger condition="user-reputation < 10" action="queue-for-review"/>
    <trigger condition="comment-reports >= 3" action="auto-moderate"/>
    <trigger condition="flagged-keywords" action="queue-for-review"/>
  </manual-moderation>
</content-moderation>
</validation-rules>

<business-logic>
<threading-rules>
  <rule>Maximum nesting depth: 10 levels</rule>
  <rule>Comments can only reply to comments on the same post</rule>
  <rule>Deleted parent comments remain visible if they have replies</rule>
  <rule>Thread ordering: chronological by default, can be sorted by votes</rule>
</threading-rules>

<edit-policies>
  <policy name="user-edit-window" duration="15 minutes" scope="own-comments"/>
  <policy name="moderator-edit" duration="unlimited" scope="any-comment"/>
  <policy name="admin-edit" duration="unlimited" scope="any-comment"/>
  <policy name="edit-tracking" requirement="mark-as-edited" visibility="public"/>
</edit-policies>

<voting-system>
  <rule>Users cannot vote on their own comments</rule>
  <rule>One vote per user per comment</rule>
  <rule>Users can change their vote at any time</rule>
  <rule>Vote weight: standard user = 1, trusted user = 1.5, moderator = 2</rule>
  <rule>Anti-manipulation: rate limiting, IP tracking, behavior analysis</rule>
</voting-system>

<deletion-behavior>
  <condition type="leaf-comment" action="hard-delete" result="complete removal"/>
  <condition type="parent-comment" action="soft-delete" result="content replaced with [deleted]"/>
  <condition type="moderator-action" action="hard-delete" result="complete removal"/>
  <condition type="admin-action" action="hard-delete" result="complete removal"/>
</deletion-behavior>
</business-logic>

<performance-considerations>
<database-optimization>
  <index fields="postId, status, createdAt" type="composite"/>
  <index fields="authorId, createdAt" type="composite"/>
  <index fields="parentId" type="single"/>
  <index fields="votes.total" type="single"/>
  <denormalization target="vote counts" reason="performance"/>
</database-optimization>

<caching-strategy>
  <cache target="comment threads" ttl="600 seconds" invalidation="on-comment-crud"/>
  <cache target="vote counts" ttl="60 seconds" invalidation="on-vote"/>
  <cache target="user votes" ttl="3600 seconds" invalidation="on-user-vote-change"/>
</caching-strategy>

<pagination-strategy>
  <method>cursor-based for chronological ordering</method>
  <method>offset-based for vote-based ordering</method>
  <threading>load top-level comments first, then replies on demand</threading>
</pagination-strategy>
</performance-considerations>

<real-time-features>
<websocket-events>
  <event name="comment-created" scope="post-subscribers"/>
  <event name="comment-updated" scope="comment-thread-subscribers"/>
  <event name="comment-deleted" scope="comment-thread-subscribers"/>
  <event name="vote-changed" scope="comment-subscribers"/>
</websocket-events>

<notifications>
  <trigger event="reply-to-comment" target="parent-comment-author"/>
  <trigger event="comment-on-post" target="post-author"/>
  <trigger event="comment-mentioned" target="mentioned-users"/>
  <trigger event="comment-moderated" target="comment-author"/>
</notifications>
</real-time-features>