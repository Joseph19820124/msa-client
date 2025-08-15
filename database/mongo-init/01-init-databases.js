// MongoDB Initialization Script
// This script creates databases and users for each microservice

// Get environment variables
const rootUsername = process.env.MONGO_INITDB_ROOT_USERNAME || 'root';
const rootPassword = process.env.MONGO_INITDB_ROOT_PASSWORD || 'rootpassword';

// Database configuration
const databases = [
  {
    name: 'posts_db',
    username: 'posts_user',
    password: 'posts_password',
    roles: ['readWrite']
  },
  {
    name: 'comments_db',
    username: 'comments_user',
    password: 'comments_password',
    roles: ['readWrite']
  },
  {
    name: 'auth_db',
    username: 'auth_user',
    password: 'auth_password',
    roles: ['readWrite']
  }
];

print('Starting database initialization...');

// Function to create database and user
function createDatabaseAndUser(dbConfig) {
  print(`Creating database: ${dbConfig.name}`);
  
  // Switch to the database
  db = db.getSiblingDB(dbConfig.name);
  
  // Create a dummy collection to ensure database is created
  db.init.insertOne({ created: new Date(), purpose: 'database_initialization' });
  
  // Create user for the database
  try {
    db.createUser({
      user: dbConfig.username,
      pwd: dbConfig.password,
      roles: dbConfig.roles.map(role => ({ role: role, db: dbConfig.name }))
    });
    print(`✓ Created user '${dbConfig.username}' for database '${dbConfig.name}'`);
  } catch (error) {
    if (error.code === 11000) {
      print(`⚠ User '${dbConfig.username}' already exists for database '${dbConfig.name}'`);
    } else {
      print(`✗ Error creating user '${dbConfig.username}': ${error.message}`);
    }
  }
  
  // Create indexes and collections
  createCollectionsAndIndexes(dbConfig.name);
}

// Function to create collections and indexes for each database
function createCollectionsAndIndexes(dbName) {
  db = db.getSiblingDB(dbName);
  
  switch (dbName) {
    case 'posts_db':
      createPostsCollections();
      break;
    case 'comments_db':
      createCommentsCollections();
      break;
    case 'auth_db':
      createAuthCollections();
      break;
  }
}

// Posts database collections and indexes
function createPostsCollections() {
  print('Creating posts collections and indexes...');
  
  // Posts collection
  db.createCollection('posts');
  db.posts.createIndex({ "title": "text", "content": "text" }, { name: "text_search_index" });
  db.posts.createIndex({ "authorId": 1 }, { name: "author_index" });
  db.posts.createIndex({ "createdAt": -1 }, { name: "created_date_index" });
  db.posts.createIndex({ "tags": 1 }, { name: "tags_index" });
  db.posts.createIndex({ "status": 1 }, { name: "status_index" });
  
  // Post categories collection
  db.createCollection('categories');
  db.categories.createIndex({ "name": 1 }, { unique: true, name: "category_name_unique" });
  
  // Post tags collection
  db.createCollection('tags');
  db.tags.createIndex({ "name": 1 }, { unique: true, name: "tag_name_unique" });
  
  print('✓ Posts collections and indexes created');
}

// Comments database collections and indexes
function createCommentsCollections() {
  print('Creating comments collections and indexes...');
  
  // Comments collection
  db.createCollection('comments');
  db.comments.createIndex({ "postId": 1 }, { name: "post_id_index" });
  db.comments.createIndex({ "authorId": 1 }, { name: "author_index" });
  db.comments.createIndex({ "createdAt": -1 }, { name: "created_date_index" });
  db.comments.createIndex({ "parentId": 1 }, { name: "parent_comment_index" });
  db.comments.createIndex({ "status": 1 }, { name: "status_index" });
  
  // Comment moderation collection
  db.createCollection('moderation_logs');
  db.moderation_logs.createIndex({ "commentId": 1 }, { name: "comment_id_index" });
  db.moderation_logs.createIndex({ "moderatorId": 1 }, { name: "moderator_index" });
  db.moderation_logs.createIndex({ "createdAt": -1 }, { name: "moderation_date_index" });
  
  print('✓ Comments collections and indexes created');
}

// Auth database collections and indexes
function createAuthCollections() {
  print('Creating auth collections and indexes...');
  
  // Users collection
  db.createCollection('users');
  db.users.createIndex({ "email": 1 }, { unique: true, name: "email_unique" });
  db.users.createIndex({ "username": 1 }, { unique: true, name: "username_unique" });
  db.users.createIndex({ "createdAt": -1 }, { name: "created_date_index" });
  db.users.createIndex({ "lastLoginAt": -1 }, { name: "last_login_index" });
  db.users.createIndex({ "role": 1 }, { name: "role_index" });
  db.users.createIndex({ "status": 1 }, { name: "status_index" });
  
  // Refresh tokens collection
  db.createCollection('refresh_tokens');
  db.refresh_tokens.createIndex({ "token": 1 }, { unique: true, name: "token_unique" });
  db.refresh_tokens.createIndex({ "userId": 1 }, { name: "user_id_index" });
  db.refresh_tokens.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0, name: "token_expiry_ttl" });
  
  // Password reset tokens collection
  db.createCollection('password_reset_tokens');
  db.password_reset_tokens.createIndex({ "token": 1 }, { unique: true, name: "reset_token_unique" });
  db.password_reset_tokens.createIndex({ "email": 1 }, { name: "email_index" });
  db.password_reset_tokens.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0, name: "reset_token_expiry_ttl" });
  
  // Email verification tokens collection
  db.createCollection('email_verification_tokens');
  db.email_verification_tokens.createIndex({ "token": 1 }, { unique: true, name: "verification_token_unique" });
  db.email_verification_tokens.createIndex({ "email": 1 }, { name: "email_index" });
  db.email_verification_tokens.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0, name: "verification_token_expiry_ttl" });
  
  // Login attempts collection (for rate limiting)
  db.createCollection('login_attempts');
  db.login_attempts.createIndex({ "email": 1 }, { name: "email_index" });
  db.login_attempts.createIndex({ "ip": 1 }, { name: "ip_index" });
  db.login_attempts.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 3600, name: "attempts_expiry_ttl" });
  
  // OAuth accounts collection
  db.createCollection('oauth_accounts');
  db.oauth_accounts.createIndex({ "provider": 1, "providerId": 1 }, { unique: true, name: "oauth_provider_unique" });
  db.oauth_accounts.createIndex({ "userId": 1 }, { name: "user_id_index" });
  
  print('✓ Auth collections and indexes created');
}

// Create all databases and users
try {
  databases.forEach(createDatabaseAndUser);
  print('\n✅ Database initialization completed successfully!');
  
  // Insert seed data if in development environment
  if (process.env.NODE_ENV === 'development') {
    print('🌱 Inserting seed data for development...');
    insertSeedData();
  }
  
} catch (error) {
  print(`\n❌ Database initialization failed: ${error.message}`);
  quit(1);
}

// Function to insert seed data for development
function insertSeedData() {
  try {
    // Seed auth database
    db = db.getSiblingDB('auth_db');
    
    // Create admin user
    const adminUser = {
      username: 'admin',
      email: 'admin@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // password: admin123
      role: 'admin',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    db.users.insertOne(adminUser);
    
    // Create test user
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // password: test123
      role: 'user',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    db.users.insertOne(testUser);
    
    print('✓ Seed data inserted successfully');
    
  } catch (error) {
    print(`⚠ Warning: Failed to insert seed data: ${error.message}`);
  }
}