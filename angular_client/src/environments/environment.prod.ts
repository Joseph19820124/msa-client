export const environment = {
  production: true,
  postsServiceUrl: process.env['ANGULAR_APP_POSTS_SERVICE_URL'] || 'http://localhost:4000',
  commentsServiceUrl: process.env['ANGULAR_APP_COMMENTS_SERVICE_URL'] || 'http://localhost:4001'
};