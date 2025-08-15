// MongoDB Seed Data Script
// This script inserts sample data for development and testing

print('🌱 Starting seed data insertion...');

// Helper function to create ObjectId
function createObjectId() {
  return new ObjectId();
}

// Helper function to create date
function createDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

// Insert seed data for Auth database
function seedAuthDatabase() {
  print('Seeding auth database...');
  db = db.getSiblingDB('auth_db');
  
  // Clear existing data
  db.users.deleteMany({});
  db.oauth_accounts.deleteMany({});
  
  // Create users
  const users = [
    {
      _id: createObjectId(),
      username: 'admin',
      email: 'admin@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // admin123
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      avatar: null,
      bio: 'System administrator',
      createdAt: createDate(30),
      updatedAt: createDate(1),
      lastLoginAt: createDate(0)
    },
    {
      _id: createObjectId(),
      username: 'moderator',
      email: 'moderator@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // moderator123
      firstName: 'Moderator',
      lastName: 'User',
      role: 'moderator',
      status: 'active',
      emailVerified: true,
      avatar: null,
      bio: 'Community moderator',
      createdAt: createDate(25),
      updatedAt: createDate(2),
      lastLoginAt: createDate(0)
    },
    {
      _id: createObjectId(),
      username: 'john_doe',
      email: 'john@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // password123
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      status: 'active',
      emailVerified: true,
      avatar: null,
      bio: 'Software developer passionate about microservices and cloud architecture.',
      createdAt: createDate(20),
      updatedAt: createDate(1),
      lastLoginAt: createDate(0)
    },
    {
      _id: createObjectId(),
      username: 'jane_smith',
      email: 'jane@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // password123
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      status: 'active',
      emailVerified: true,
      avatar: null,
      bio: 'Frontend developer with expertise in React and TypeScript.',
      createdAt: createDate(15),
      updatedAt: createDate(3),
      lastLoginAt: createDate(1)
    },
    {
      _id: createObjectId(),
      username: 'test_user',
      email: 'test@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/YGiglas77bNp.M1TK', // test123
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active',
      emailVerified: false,
      avatar: null,
      bio: 'Test user account for development purposes.',
      createdAt: createDate(5),
      updatedAt: createDate(5),
      lastLoginAt: null
    }
  ];
  
  db.users.insertMany(users);
  print(`✓ Inserted ${users.length} users`);
  
  // Store user IDs for later use
  const userIds = users.map(user => user._id);
  return { userIds, users };
}

// Insert seed data for Posts database
function seedPostsDatabase(authData) {
  print('Seeding posts database...');
  db = db.getSiblingDB('posts_db');
  
  // Clear existing data
  db.posts.deleteMany({});
  db.categories.deleteMany({});
  db.tags.deleteMany({});
  
  // Create categories
  const categories = [
    { _id: createObjectId(), name: 'Technology', description: 'Tech-related posts', slug: 'technology', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'Programming', description: 'Programming tutorials and tips', slug: 'programming', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'DevOps', description: 'DevOps and infrastructure', slug: 'devops', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'Frontend', description: 'Frontend development', slug: 'frontend', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'Backend', description: 'Backend development', slug: 'backend', createdAt: createDate(30) }
  ];
  
  db.categories.insertMany(categories);
  print(`✓ Inserted ${categories.length} categories`);
  
  // Create tags
  const tags = [
    { _id: createObjectId(), name: 'react', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'nodejs', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'javascript', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'typescript', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'mongodb', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'docker', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'microservices', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'api', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'security', createdAt: createDate(30) },
    { _id: createObjectId(), name: 'performance', createdAt: createDate(30) }
  ];
  
  db.tags.insertMany(tags);
  print(`✓ Inserted ${tags.length} tags`);
  
  // Create posts
  const posts = [
    {
      _id: createObjectId(),
      title: 'Getting Started with Microservices Architecture',
      content: 'Microservices architecture has become increasingly popular for building scalable applications. In this post, we\'ll explore the fundamental concepts of microservices, their benefits, and challenges. We\'ll also discuss when to use microservices and when a monolithic approach might be better suited for your project.',
      excerpt: 'Learn the fundamentals of microservices architecture and when to use it.',
      authorId: authData.userIds[2], // john_doe
      categoryId: categories[0]._id, // Technology
      tags: ['microservices', 'api', 'nodejs'],
      status: 'published',
      featured: true,
      viewCount: 245,
      likeCount: 18,
      createdAt: createDate(10),
      updatedAt: createDate(10),
      publishedAt: createDate(10)
    },
    {
      _id: createObjectId(),
      title: 'Building RESTful APIs with Node.js and Express',
      content: 'REST APIs are the backbone of modern web applications. This comprehensive guide covers everything you need to know about building robust RESTful APIs using Node.js and Express. We\'ll cover routing, middleware, error handling, authentication, validation, and best practices for API design.',
      excerpt: 'Complete guide to building RESTful APIs with Node.js and Express.',
      authorId: authData.userIds[2], // john_doe
      categoryId: categories[4]._id, // Backend
      tags: ['nodejs', 'api', 'javascript'],
      status: 'published',
      featured: true,
      viewCount: 189,
      likeCount: 23,
      createdAt: createDate(8),
      updatedAt: createDate(8),
      publishedAt: createDate(8)
    },
    {
      _id: createObjectId(),
      title: 'React Hooks: A Complete Guide',
      content: 'React Hooks have revolutionized the way we write React components. This in-depth guide covers all the built-in hooks including useState, useEffect, useContext, useReducer, and more. We\'ll also explore custom hooks and best practices for using hooks in your React applications.',
      excerpt: 'Master React Hooks with this comprehensive guide.',
      authorId: authData.userIds[3], // jane_smith
      categoryId: categories[3]._id, // Frontend
      tags: ['react', 'javascript', 'typescript'],
      status: 'published',
      featured: false,
      viewCount: 156,
      likeCount: 31,
      createdAt: createDate(6),
      updatedAt: createDate(6),
      publishedAt: createDate(6)
    },
    {
      _id: createObjectId(),
      title: 'Docker and Containerization Best Practices',
      content: 'Containerization with Docker has transformed how we deploy and manage applications. This post covers Docker fundamentals, best practices for writing Dockerfiles, multi-stage builds, container orchestration, and security considerations for production deployments.',
      excerpt: 'Learn Docker best practices for production deployments.',
      authorId: authData.userIds[2], // john_doe
      categoryId: categories[2]._id, // DevOps
      tags: ['docker', 'microservices', 'devops'],
      status: 'published',
      featured: true,
      viewCount: 198,
      likeCount: 27,
      createdAt: createDate(4),
      updatedAt: createDate(4),
      publishedAt: createDate(4)
    },
    {
      _id: createObjectId(),
      title: 'MongoDB Indexing Strategies for Performance',
      content: 'Database performance is crucial for application scalability. This post dives deep into MongoDB indexing strategies, covering compound indexes, text indexes, geospatial indexes, and performance optimization techniques. Learn how to analyze query performance and optimize your database operations.',
      excerpt: 'Optimize MongoDB performance with effective indexing strategies.',
      authorId: authData.userIds[3], // jane_smith
      categoryId: categories[1]._id, // Programming
      tags: ['mongodb', 'performance', 'nodejs'],
      status: 'published',
      featured: false,
      viewCount: 134,
      likeCount: 19,
      createdAt: createDate(2),
      updatedAt: createDate(2),
      publishedAt: createDate(2)
    },
    {
      _id: createObjectId(),
      title: 'API Security Best Practices',
      content: 'Security is paramount when building APIs. This comprehensive guide covers authentication, authorization, input validation, rate limiting, HTTPS, CORS, and other security measures. Learn how to protect your APIs from common vulnerabilities and attacks.',
      excerpt: 'Essential security practices for protecting your APIs.',
      authorId: authData.userIds[2], // john_doe
      categoryId: categories[4]._id, // Backend
      tags: ['security', 'api', 'nodejs'],
      status: 'draft',
      featured: false,
      viewCount: 0,
      likeCount: 0,
      createdAt: createDate(1),
      updatedAt: createDate(1),
      publishedAt: null
    }
  ];
  
  db.posts.insertMany(posts);
  print(`✓ Inserted ${posts.length} posts`);
  
  return { posts, categories, tags };
}

// Insert seed data for Comments database
function seedCommentsDatabase(authData, postsData) {
  print('Seeding comments database...');
  db = db.getSiblingDB('comments_db');
  
  // Clear existing data
  db.comments.deleteMany({});
  db.moderation_logs.deleteMany({});
  
  // Create comments
  const comments = [
    {
      _id: createObjectId(),
      postId: postsData.posts[0]._id.toString(), // Microservices post
      authorId: authData.userIds[3], // jane_smith
      content: 'Great introduction to microservices! I\'ve been thinking about migrating our monolith and this gives me a good starting point.',
      status: 'approved',
      parentId: null,
      likeCount: 5,
      createdAt: createDate(9),
      updatedAt: createDate(9)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[0]._id.toString(), // Microservices post
      authorId: authData.userIds[2], // john_doe
      content: 'Thanks! Feel free to ask if you have any specific questions about the migration process.',
      status: 'approved',
      parentId: null, // Reply to jane_smith's comment would need the comment ID
      likeCount: 2,
      createdAt: createDate(9),
      updatedAt: createDate(9)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[1]._id.toString(), // REST API post
      authorId: authData.userIds[4], // test_user
      content: 'This is exactly what I needed! The middleware section was particularly helpful.',
      status: 'approved',
      parentId: null,
      likeCount: 3,
      createdAt: createDate(7),
      updatedAt: createDate(7)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[2]._id.toString(), // React Hooks post
      authorId: authData.userIds[2], // john_doe
      content: 'Excellent explanation of useEffect! The cleanup function part cleared up some confusion I had.',
      status: 'approved',
      parentId: null,
      likeCount: 8,
      createdAt: createDate(5),
      updatedAt: createDate(5)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[2]._id.toString(), // React Hooks post
      authorId: authData.userIds[3], // jane_smith
      content: 'Glad it helped! useEffect can be tricky at first but once you understand the dependency array it becomes much clearer.',
      status: 'approved',
      parentId: null,
      likeCount: 4,
      createdAt: createDate(5),
      updatedAt: createDate(5)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[3]._id.toString(), // Docker post
      authorId: authData.userIds[3], // jane_smith
      content: 'The multi-stage build example saved me so much space in my images! Thanks for sharing.',
      status: 'approved',
      parentId: null,
      likeCount: 6,
      createdAt: createDate(3),
      updatedAt: createDate(3)
    },
    {
      _id: createObjectId(),
      postId: postsData.posts[4]._id.toString(), // MongoDB post
      authorId: authData.userIds[2], // john_doe
      content: 'Great deep dive into indexing! Do you have any recommendations for monitoring index performance in production?',
      status: 'approved',
      parentId: null,
      likeCount: 7,
      createdAt: createDate(1),
      updatedAt: createDate(1)
    }
  ];
  
  db.comments.insertMany(comments);
  print(`✓ Inserted ${comments.length} comments`);
  
  return { comments };
}

// Execute seed data insertion
try {
  const authData = seedAuthDatabase();
  const postsData = seedPostsDatabase(authData);
  const commentsData = seedCommentsDatabase(authData, postsData);
  
  print('\n✅ Seed data insertion completed successfully!');
  print('📊 Summary:');
  print(`   Users: ${authData.users.length}`);
  print(`   Categories: ${postsData.categories.length}`);
  print(`   Tags: ${postsData.tags.length}`);
  print(`   Posts: ${postsData.posts.length}`);
  print(`   Comments: ${commentsData.comments.length}`);
  
} catch (error) {
  print(`\n❌ Seed data insertion failed: ${error.message}`);
  quit(1);
}