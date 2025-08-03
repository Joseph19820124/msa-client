import axios from 'axios';

export const createApiService = (baseUrl) => {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
  });

  return {
    get: (url) => instance.get(url),
    post: (url, data) => instance.post(url, data),
    put: (url, data) => instance.put(url, data),
    delete: (url) => instance.delete(url),
  };
};

export const postsApi = {
  getPosts: (postsUrl) => 
    axios.get(`${postsUrl}/posts`),
  
  createPost: (postsUrl, postData) => 
    axios.post(`${postsUrl}/posts`, postData),
};

export const commentsApi = {
  getComments: (commentsUrl, postId) => 
    axios.get(`${commentsUrl}/posts/${postId}/comments`),
  
  createComment: (commentsUrl, postId, commentData) => 
    axios.post(`${commentsUrl}/posts/${postId}/comments`, commentData),
};