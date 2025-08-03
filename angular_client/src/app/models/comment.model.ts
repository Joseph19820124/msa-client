export interface Comment {
  id: string;
  content: string;
}

export interface CreateCommentRequest {
  content: string;
}