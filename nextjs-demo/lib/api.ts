import axios from 'axios';

const postsUrl = process.env.POSTS_SERVICE_URL || 'http://localhost:4000';
const commentsUrl = process.env.COMMENTS_SERVICE_URL || 'http://localhost:4001';

export interface Post {
  id: string;
  title: string;
}

export interface Comment {
  id: string;
  content: string;
}

export const postsApi = {
  getPosts: async (): Promise<{ [key: string]: Post }> => {
    const response = await axios.get(`${postsUrl}/posts`);
    return response.data;
  },
  
  createPost: async (postData: { title: string }): Promise<Post> => {
    const response = await axios.post(`${postsUrl}/posts`, postData);
    return response.data;
  },
};

export const commentsApi = {
  getComments: async (postId: string): Promise<Comment[]> => {
    const response = await axios.get(`${commentsUrl}/posts/${postId}/comments`);
    return response.data;
  },
  
  createComment: async (postId: string, commentData: { content: string }): Promise<Comment> => {
    const response = await axios.post(`${commentsUrl}/posts/${postId}/comments`, commentData);
    return response.data;
  },
};